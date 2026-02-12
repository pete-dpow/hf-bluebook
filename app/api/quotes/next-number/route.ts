import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc("nextval_quote_number");

  if (error) {
    // Fallback: raw SQL via supabase
    const { data: rawData, error: rawError } = await supabaseAdmin
      .from("quotes")
      .select("quote_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (rawError) return NextResponse.json({ error: rawError.message }, { status: 500 });

    // Parse last number or start at 1
    let nextNum = 1;
    if (rawData && rawData.length > 0) {
      const match = rawData[0].quote_number?.match(/HF-Q-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const quoteNumber = `HF-Q-${String(nextNum).padStart(4, "0")}`;
    return NextResponse.json({ quote_number: quoteNumber });
  }

  const num = typeof data === "number" ? data : parseInt(String(data));
  const quoteNumber = `HF-Q-${String(num).padStart(4, "0")}`;
  return NextResponse.json({ quote_number: quoteNumber });
}
