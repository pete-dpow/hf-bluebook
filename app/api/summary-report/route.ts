import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, projectName, orgName } = await req.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json(
        { error: "Need at least one conversation exchange to summarize" },
        { status: 400 }
      );
    }

    // Format conversation for summary
    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `You are dpow.chat — creating a professional summary report of a construction project conversation.

Project: ${projectName || "Untitled Project"}
${orgName ? `Organization: ${orgName}` : ""}

Create a concise executive summary with these sections:

**Key Topics Discussed**
- Bullet the main subjects covered (2-5 items)

**Findings & Insights**
- Key data points or facts discovered
- Any issues or concerns identified

**Action Items**
- Specific next steps or recommendations (if any emerged)

**Data Summary** (if project data was analyzed)
- Key metrics mentioned
- Status breakdowns if discussed

Rules:
- Be concise — each section 2-4 bullet points max
- Use construction industry terminology appropriately
- Skip sections that don't apply
- No fluff or filler text
- Format with markdown headers and bullets`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Summarize this conversation:\n\n${conversationText}` }
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const summary = response.choices[0].message.content;

    return NextResponse.json({
      summary,
      messageCount: messages.length,
      generatedAt: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("❌ Summary report error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}
