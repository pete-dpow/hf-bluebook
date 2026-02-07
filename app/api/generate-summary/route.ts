import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cleanDatasetRow, expandAbbreviations, LEXICON_SYSTEM_CONTEXT } from '@/lib/lexicon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let rowsData: string;
    let slicersSummary: string;
    let commentsText: string;

    if (body.rowsData && body.slicersSummary !== undefined) {
      rowsData = expandAbbreviations(body.rowsData);
      slicersSummary = expandAbbreviations(body.slicersSummary);
      commentsText = expandAbbreviations(body.commentsText || '');
    } else if (body.rows && body.slicers) {
      const { rows, slicers } = body;

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { error: "No data provided" },
          { status: 400 }
        );
      }

      const cleanedRows = rows.map((r: any) => cleanDatasetRow(r));

      slicersSummary = slicers.map((s: any) => `${s.col}="${expandAbbreviations(s.val)}"`).join(', ');

      const commentsSlicer = slicers.find((s: any) => s.col.toLowerCase().includes('comment'));

      commentsText = commentsSlicer
        ? cleanedRows.map((r: any) => r[commentsSlicer.col]).filter(Boolean).join(' | ').slice(0, 4000)
        : '';

      rowsData = cleanedRows.slice(0, 30).map((r: any) => {
        return Object.keys(r).map(key => `${key}: ${r[key]}`).join(', ');
      }).join('\n');
    } else {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const systemPrompt = `${LEXICON_SYSTEM_CONTEXT}

You are a seasoned Programme Director reporting to board-level stakeholders overseeing multi-billion-pound developments.
Your role is to convert raw project data into a decisive, high-level weekly executive summary.
You have zero tolerance for vagueness, excuses, or filler language.
Speak as if presenting to clients who manage risk, cash flow, and schedule performance at scale.

Your summary must:
1. Identify where the project stands this week relative to planned deliverables, using the data provided.
2. Quantify progress, risk, and variance — reference numbers of items or percentages if identifiable.
3. Highlight blockers and issues only if they materially impact cost, schedule, or quality.
4. Interpret 'Status', 'Revision', and 'Comments' fields to extract insight (not just data).
5. Prioritise urgency and next actions in board-ready language.
6. Conclude with a short directive that sets immediate focus for the following week.

CRITICAL: All abbreviations have been pre-expanded in the data. Use full professional terms only. Never revert to abbreviations.

Tone: authoritative, analytical, concise (150–200 words).
No marketing adjectives, no waffle.
Assume the reader is financially and technically literate.`;

    const userPrompt = `Analyse the following dataset extracted from a live project information table.
Each row represents a deliverable or document tracked under specific categories and statuses.
Data fields may include Category, Discipline, Revision, Status, and Comments.

Slicer selections active:
${slicersSummary || "No slicers selected"}

Dataset sample (first 30 rows):
${rowsData || "No data provided"}

If comments are available, extract insight directly:
${commentsText || "No comments provided."}

Use this reasoning framework:
- Determine which categories are advancing and which are stalled.
- Detect patterns in Status and Revision fields that indicate progress or slippage.
- From Comments, extract WHO is responsible, WHAT is blocked, WHEN resolution is due, and HOW it impacts programme or cost.
- Quantify as possible (e.g., '12 of 18 packages approved', 'MEP remains 3 weeks behind baseline').
- Write a single executive paragraph (150–200 words) explaining the situation as of this week.
- End with one imperative next action (e.g., 'Focus immediate resource on closing structural design coordination by Thursday.').`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
    }, {
      timeout: 45000,
    });

    const result =
      completion.choices?.[0]?.message?.content ||
      "No summary generated. Check your input data.";

    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayName = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long' });

    const phrases = [
      `As of this week ending ${formatDate(today)},`,
      `At the end of last week (${formatDate(lastWeek)}),`,
      `As of last ${dayName(lastWeek)}, ${formatDate(lastWeek)},`,
      `At the close of this reporting period, ${formatDate(today)},`,
      `At the end of ${dayName(today)}, ${formatDate(today)},`,
      `As of week ending ${formatDate(today)},`
    ];

    const timePhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const finalSummary = `${timePhrase} ${result.trim()}`;

    return NextResponse.json({ summary: finalSummary });
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate summary. Check OpenAI API key and data formatting.",
        details: error?.message || error,
      },
      { status: 500 }
    );
  }
}
