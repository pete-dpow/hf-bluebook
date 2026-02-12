import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function recalculateQuoteTotals(quoteId: string) {
  // Get all line items for this quote
  const { data: lineItems, error: liError } = await supabaseAdmin
    .from("quote_line_items")
    .select("quantity, unit_price, line_total")
    .eq("quote_id", quoteId);

  if (liError) throw new Error(liError.message);

  const subtotal = (lineItems || []).reduce(
    (sum, item) => sum + (item.line_total || item.quantity * item.unit_price || 0),
    0
  );

  // Get the quote's vat_percent
  const { data: quote, error: qError } = await supabaseAdmin
    .from("quotes")
    .select("vat_percent")
    .eq("id", quoteId)
    .single();

  if (qError) throw new Error(qError.message);

  const vatPercent = quote?.vat_percent ?? 20;
  const vatAmount = subtotal * (vatPercent / 100);
  const total = subtotal + vatAmount;

  const { error: updateError } = await supabaseAdmin
    .from("quotes")
    .update({
      subtotal,
      vat_amount: vatAmount,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (updateError) throw new Error(updateError.message);

  return { subtotal, vat_amount: vatAmount, total };
}
