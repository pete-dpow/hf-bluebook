// /app/api/freemium-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type Msg = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = (body.question || "").trim();
    const history: Msg[] = Array.isArray(body.history) ? body.history : [];
    const dataset = body.dataset || null;

    if (!question) {
      return NextResponse.json({ error: "No question provided." }, { status: 400 });
    }

    if (!dataset || !Array.isArray(dataset.rows) || dataset.rows.length === 0) {
      return NextResponse.json({ error: "No dataset supplied." }, { status: 400 });
    }

    const rows: any[][] = dataset.rows;

    // Skip project info rows - start looking from row 10 onwards
    let headerRowIndex = rows.findIndex((r, idx) =>
      idx >= 10 &&
      Array.isArray(r) &&
      r.some((c) =>
        typeof c === "string" &&
        /^(status|revision|rev|type|document|doc|drawing|title|category|comments?|discipline|package)$/i.test(c.trim())
      )
    );

    if (headerRowIndex < 0) headerRowIndex = 14;

    console.log(`📍 Header row detected at index: ${headerRowIndex}`);

    const headers = (rows[headerRowIndex] || []).map((h) =>
      typeof h === "string" ? h : String(h ?? "")
    );

    const dataRows = rows.slice(headerRowIndex + 1);

    console.log(`📊 Data rows available: ${dataRows.length}`);

    // Send ALL data rows (no filtering)
    const allDataRows = dataRows;

    const systemPrompt = `
You are Melvin, the HF.bluebook AI assistant — a project data assistant for construction and fire protection professionals.
You analyze spreadsheets with 700+ rows of project deliverables (drawings, documents, statuses).

Your role: Answer questions FAST, like you're texting a colleague who's walking into a meeting.

Rules (Orwell-inspired clarity):
1. Answer in 2-3 sentences MAX (unless they ask for an overview/summary)
2. Start with the NUMBER or FACT immediately — no preamble
3. Use short words: "use" not "utilize", "help" not "facilitate"
4. Cut every unnecessary word — no "basically", "essentially", "in order to"
5. Active voice always: "Architect completed the drawings" not "Drawings were completed"
6. Keep construction terms (MEP, RFI, Status C, etc.) — those are normal for this audience
7. If data is missing or unclear, say so plainly: "Can't see that column"
8. For "why" questions, check Comments column for context
9. You have the COMPLETE dataset - give exact counts, not estimates

Response length guide:
- Fact questions: 1-2 sentences
- "Why" questions: 2-3 sentences
- "Overview/summary": 4-5 sentences max

Examples of good responses:
❌ "Based on the analysis of the dataset, there are 23 items with Status C..."
✅ "23 Status C items. 12 are MEP drawings, rest structural."

❌ "The MEP package has not yet been signed off due to the fact that..."
✅ "MEP not signed off — Comments say coordination drawings still pending from contractor."

❌ "It would appear that the architect has essentially completed the majority of..."
✅ "Architect finished 47 of 52 drawings. 5 still in progress."

Answer like a human who respects the reader's time.
    `.trim();

    const messages: Msg[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      {
        role: "user",
        content: `Dataset:\nHeaders: ${headers.join(", ")}\nTotal rows: ${dataRows.length}\nComplete data: ${JSON.stringify(allDataRows)}\n\nQuestion: ${question}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 250,
      messages,
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No response from model.";

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("❌ freemium-chat error:", err);
    return NextResponse.json({ error: "Chat failed." }, { status: 500 });
  }
}