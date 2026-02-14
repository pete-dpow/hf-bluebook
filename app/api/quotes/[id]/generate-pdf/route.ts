import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { generateQuotePdf } from "@/lib/quoteGenerator";
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

  const pdfBytes = await generateQuotePdf(quote, quote.quote_line_items || []);

  // Upload to SharePoint (or Supabase fallback)
  try {
    const result = await uploadQuoteWithFallback(
      auth.user.id,
      auth.organizationId,
      quote.quote_number,
      `${quote.quote_number}.pdf`,
      Buffer.from(pdfBytes),
      "application/pdf"
    );

    // Store SharePoint reference on quote if applicable
    if (result.storage === "sharepoint" && result.itemId) {
      await supabaseAdmin
        .from("quotes")
        .update({ sharepoint_item_id: result.itemId, sharepoint_web_url: result.url })
        .eq("id", params.id);
    }
  } catch {
    // Upload failure is non-critical — user still gets the download
  }

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quote_number}.pdf"`,
    },
  });
}
