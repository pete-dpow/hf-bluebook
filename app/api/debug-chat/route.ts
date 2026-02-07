import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("excel_datasets")
      .select("data")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    let parsed;
    try {
      parsed = JSON.parse(data.data);
    } catch (err) {
      return NextResponse.json({ parseError: String(err), rawPreview: data.data.slice(0, 200) });
    }

    return NextResponse.json({
      totalRows: parsed.length,
      first15: parsed.slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ fail: err.message }, { status: 500 });
  }
}
