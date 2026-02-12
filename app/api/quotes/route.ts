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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("quotes")
    .select("*, quote_line_items(count)", { count: "exact" })
    .eq("organization_id", auth.organizationId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (search) query = query.or(`client_name.ilike.%${search}%,quote_number.ilike.%${search}%,project_name.ilike.%${search}%`);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  if (!body.client_name) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  // Generate quote number
  let quoteNumber: string;

  const { data: seqData, error: seqError } = await supabaseAdmin.rpc("nextval_quote_number");

  if (seqError) {
    // Fallback: derive from existing quotes
    const { data: lastQuote } = await supabaseAdmin
      .from("quotes")
      .select("quote_number")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (lastQuote && lastQuote.length > 0) {
      const match = lastQuote[0].quote_number?.match(/HF-Q-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    quoteNumber = `HF-Q-${String(nextNum).padStart(4, "0")}`;
  } else {
    const num = typeof seqData === "number" ? seqData : parseInt(String(seqData));
    quoteNumber = `HF-Q-${String(num).padStart(4, "0")}`;
  }

  const { data, error } = await supabaseAdmin
    .from("quotes")
    .insert({
      organization_id: auth.organizationId,
      created_by: auth.user.id,
      quote_number: quoteNumber,
      client_name: body.client_name,
      client_email: body.client_email || null,
      client_phone: body.client_phone || null,
      project_id: body.project_id || null,
      project_name: body.project_name || null,
      project_address: body.project_address || null,
      quote_name: body.quote_name || null,
      valid_until: body.valid_until || null,
      notes: body.notes || null,
      terms: body.terms || null,
      vat_percent: body.vat_percent ?? 20,
      status: "draft",
      subtotal: 0,
      vat_amount: 0,
      total: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data }, { status: 201 });
}
