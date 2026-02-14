import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { generateQuoteExcel } from "@/lib/quoteGenerator";
import { uploadQuoteWithFallback } from "@/lib/sharepoint/uploadWithFallback";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("*, quote_line_items(*)")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const buffer = await generateQuoteExcel(quote, quote.quote_line_items || []);

  // Upload to SharePoint (or Supabase fallback)
  try {
    await uploadQuoteWithFallback(
      auth.user.id,
      auth.organizationId,
      quote.quote_number,
      `${quote.quote_number}.xlsx`,
      Buffer.from(buffer),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  } catch {
    // Upload failure is non-critical — user still gets the download
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${quote.quote_number}.xlsx"`,
    },
  });
}
