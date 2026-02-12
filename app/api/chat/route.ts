// /app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = (body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "No question provided." }, { status: 400 });
    }

    // 1️⃣ Load latest dataset
    const { data: dataset, error: datasetErr } = await supabase
      .from("excel_datasets")
      .select("id, data, file_name, total_rows, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (datasetErr || !dataset) {
      return NextResponse.json({ error: "No dataset available. Upload a file first." }, { status: 400 });
    }

    // 2️⃣ Parse dataset
    let rows: any[] = [];
    try {
      rows = typeof dataset.data === "string" ? JSON.parse(dataset.data) : dataset.data;
    } catch {
      return NextResponse.json({ error: "Invalid dataset format." }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length < 5) {
      return NextResponse.json({ error: "Dataset seems too small or empty." }, { status: 400 });
    }

    // 3️⃣ Get previous chat messages for this dataset (context memory)
    const { data: history, error: historyErr } = await supabase
      .from("chat_history")
      .select("role, content")
      .eq("dataset_id", dataset.id)
      .order("created_at", { ascending: true })
      .limit(10);

    if (historyErr) console.warn("⚠️ Could not load chat history:", historyErr);

    const contextMessages = history?.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })) ?? [];

    // 4️⃣ Store user question
    const { error: insertUserErr } = await supabase
      .from("chat_history")
      .insert([{ dataset_id: dataset.id, role: "user", content: question }]);
    if (insertUserErr) console.warn("⚠️ Failed to log user message:", insertUserErr);

    // 5️⃣ Prepare prompt
    const systemPrompt = `
You are Melvin, the hf.bluebook AI assistant — a design-data analyst for fire protection product intelligence.
You understand architectural deliverables, document control, and technical schedules.
The user will ask questions about a dataset containing drawing issue records or deliverables.
Always reason from the dataset. Never invent data.
Tone: factual, confident, analytical.
    `;

    const preview = JSON.stringify(rows.slice(0, 25));

    // 6️⃣ Send to GPT-4 with history context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        {
          role: "user",
          content: `Here is a sample of the dataset:\n${preview}\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No response from Melvin.";

    // 7️⃣ Store assistant reply
    const { error: insertAssistantErr } = await supabase
      .from("chat_history")
      .insert([{ dataset_id: dataset.id, role: "assistant", content: answer }]);
    if (insertAssistantErr) console.warn("⚠️ Failed to log assistant message:", insertAssistantErr);

    console.log("✅ Chat reply generated and stored.");
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("❌ Chat route error:", err);
    return NextResponse.json({ error: "Chat processing failed." }, { status: 500 });
  }
}
