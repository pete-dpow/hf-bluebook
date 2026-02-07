import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    console.log("🧪 Testing Supabase read connection...");

    const { data, error } = await supabase
      .from("excel_datasets")
      .select("id, file_name, total_rows, created_at, data")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Latest dataset row:", data?.[0]);

    return NextResponse.json({
      ok: true,
      rowsFound: data?.length || 0,
      latestFile: data?.[0]?.file_name || null,
      totalRows: data?.[0]?.total_rows || 0,
      dataType: typeof data?.[0]?.data,
      dataPreview: String(data?.[0]?.data).slice(0, 200)
    });
  } catch (err: any) {
    console.error("❌ Test route failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
