import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { 
      question, 
      history = [], 
      dataset, 
      userId, 
      projectId, 
      token,
      modeOverride  // ⭐ Task 6: Accept mode override from frontend
    } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Fetch user memories if authenticated
    let userMemories = null;
    if (userId && token) {
      try {
        const memoryRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://dpow-chat.vercel.app'}/api/memory`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (memoryRes.ok) {
          const memoryData = await memoryRes.json();
          userMemories = memoryData.memories;
          console.log(`💾 Loaded ${userMemories.count} memories for context`);
        }
      } catch (memErr) {
        console.warn("⚠️ Failed to load memories:", memErr);
      }
    }

    const memoryContext = userMemories && userMemories.count > 0 
      ? formatMemoriesForPrompt(userMemories)
      : "";

    // Verify org access if authenticated
    if (userId && projectId) {
      const { data: userData } = await supabase
        .from("users")
        .select("active_organization_id")
        .eq("id", userId)
        .single();

      const activeOrgId = userData?.active_organization_id;

      const { data: projectData } = await supabase
        .from("projects")
        .select("organization_id, user_id")
        .eq("id", projectId)
        .single();

      if (projectData) {
        const hasAccess =
          (activeOrgId && projectData.organization_id === activeOrgId) ||
          (!activeOrgId && projectData.user_id === userId && !projectData.organization_id);

        if (!hasAccess) {
          return NextResponse.json(
            { error: "Project not accessible in current organization" },
            { status: 403 }
          );
        }
      }
    }

    // ⭐ Task 6: Use mode override if provided, otherwise auto-classify
    let queryType: string;
    
    if (modeOverride && ["GENERAL", "PROJECT", "BOTH"].includes(modeOverride)) {
      queryType = modeOverride;
      console.log(`🎯 Mode override: ${queryType}`);
    } else {
      // Auto-classify
      const classificationPrompt = `Analyze this question and determine if it requires PROJECT DATA or GENERAL KNOWLEDGE:

Question: "${question}"

Context: The user has uploaded an Excel file with project data (construction/delivery information like tasks, statuses, dates, etc.)

Respond with ONLY ONE WORD:
- "PROJECT" if the question asks about specific data in their uploaded file
- "GENERAL" if the question asks for general knowledge, definitions, best practices
- "BOTH" if it requires combining general knowledge with their specific project data

Classification:`;

      const classification = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: classificationPrompt }],
        temperature: 0,
        max_tokens: 10,
      });

      queryType = classification.choices[0].message.content?.trim().toUpperCase() || "GENERAL";
      console.log(`🔍 Auto-classified: ${queryType}`);
    }

    // Route based on classification
    if (queryType === "GENERAL") {
      const systemPrompt = `You are Melvin, the HF.bluebook AI assistant — a knowledgeable assistant for construction and project management professionals.

${memoryContext}

Rules (Orwell-inspired clarity):
1. Answer in 2-4 sentences for most questions
2. Start with the key point immediately — no preamble
3. Use short words: "use" not "utilize", "help" not "facilitate"
4. Cut every unnecessary word
5. Active voice always
6. Keep industry terms (MEP, RFI, etc.)
7. NEVER mention knowledge cutoffs or data limitations
8. Answer confidently based on construction industry standards

Answer like a knowledgeable colleague who respects the reader's time.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: question }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.5,
        max_tokens: 400,
      });

      return NextResponse.json({
        answer: response.choices[0].message.content,
        source: "general_knowledge",
        mode: "GENERAL"
      });
    }

    if (queryType === "PROJECT") {
      if (!dataset?.rows || dataset.rows.length === 0) {
        return NextResponse.json({
          answer: "No project data loaded. Upload an Excel file and I'll analyze it.",
          source: "no_data",
          mode: "PROJECT"
        });
      }

      const systemPrompt = `You are Melvin, the HF.bluebook AI assistant — analyzing the user's project data.

Dataset: ${dataset.rows.length} rows. Sample: ${JSON.stringify(dataset.rows.slice(0, 10), null, 2)}

${memoryContext}

Rules:
1. Answer in 2-3 sentences MAX
2. Start with the NUMBER or FACT immediately
3. Use short words and active voice
4. Be precise with data

Answer like you're texting a colleague who needs fast facts.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: question }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 300,
      });

      return NextResponse.json({
        answer: response.choices[0].message.content,
        source: "project_data",
        mode: "PROJECT"
      });
    }

    // BOTH - Hybrid mode
    if (!dataset?.rows || dataset.rows.length === 0) {
      const systemPrompt = `You are Melvin, the HF.bluebook AI assistant. The user asked a question needing their project data, but none is uploaded.

${memoryContext}

Give brief general guidance. Suggest they upload data for specific insights. Keep it short (2-3 sentences).`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.5,
        max_tokens: 300,
      });

      return NextResponse.json({
        answer: response.choices[0].message.content,
        source: "general_fallback",
        mode: "BOTH"
      });
    }

    // Hybrid with data
    const systemPrompt = `You are Melvin, the HF.bluebook AI assistant — combining construction knowledge with the user's project data.

Dataset: ${dataset.rows.length} rows. Sample: ${JSON.stringify(dataset.rows.slice(0, 10), null, 2)}

${memoryContext}

Rules:
1. Start with brief context (1 sentence)
2. State what you see in their data (1-2 sentences)
3. End with quick recommendation if relevant (1 sentence)
4. Total: 3-4 sentences max
5. Use short words, active voice, no fluff

Answer like a consultant reviewing their spreadsheet together.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: question }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      max_tokens: 450,
    });

    return NextResponse.json({
      answer: response.choices[0].message.content,
      source: "hybrid",
      mode: "BOTH"
    });

  } catch (err: any) {
    console.error("❌ Hybrid chat error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process question" },
      { status: 500 }
    );
  }
}

function formatMemoriesForPrompt(memories: any): string {
  if (!memories || memories.count === 0) return "";

  const parts: string[] = [];

  if (memories.preferences?.length > 0) {
    const prefs = memories.preferences
      .map((m: any) => `- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`)
      .join("\n");
    parts.push(`User Preferences:\n${prefs}`);
  }

  if (memories.context?.length > 0) {
    const ctx = memories.context
      .map((m: any) => `- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`)
      .join("\n");
    parts.push(`Context:\n${ctx}`);
  }

  if (memories.terms?.length > 0) {
    const terms = memories.terms
      .map((m: any) => `- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`)
      .join("\n");
    parts.push(`Common Terms:\n${terms}`);
  }

  return parts.length > 0 
    ? `\n--- User Memory Context ---\n${parts.join("\n\n")}\n--- End Memory ---\n`
    : "";
}
