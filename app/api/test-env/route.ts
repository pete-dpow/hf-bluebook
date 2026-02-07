import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  return NextResponse.json({
    ok: true,
    env: {
      supabaseUrl: !!supabaseUrl,
      anonKey: !!anonKey,
      serviceKey: !!serviceKey,
      openaiKey: !!openaiKey,
      serviceKeySnippet: serviceKey
        ? serviceKey.slice(0, 10) + "..." + serviceKey.slice(-5)
        : null,
    },
  });
}
