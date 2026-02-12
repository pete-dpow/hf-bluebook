import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/embeddingService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type MelvinMode = "GENERAL" | "PROJECT" | "PRODUCT" | "KNOWLEDGE" | "FULL";

export async function POST(req: Request) {
  try {
    const {
      question,
      history = [],
      dataset,
      userId,
      projectId,
      token,
      modeOverride,
    } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Fetch user memories if authenticated
    let userMemories = null;
    if (userId && token) {
      try {
        const memoryRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://hf-bluebook.vercel.app'}/api/memory`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (memoryRes.ok) {
          const memoryData = await memoryRes.json();
          userMemories = memoryData.memories;
        }
      } catch {
        // Non-critical — continue without memories
      }
    }

    const memoryContext = userMemories && userMemories.count > 0
      ? formatMemoriesForPrompt(userMemories)
      : "";

    // Get organization ID for data queries
    let organizationId: string | null = null;
    if (userId && projectId) {
      const { data: userData } = await supabase
        .from("users")
        .select("active_organization_id")
        .eq("id", userId)
        .single();

      organizationId = userData?.active_organization_id || null;

      if (organizationId) {
        const { data: projectData } = await supabase
          .from("projects")
          .select("organization_id, user_id")
          .eq("id", projectId)
          .single();

        if (projectData) {
          const hasAccess =
            (organizationId && projectData.organization_id === organizationId) ||
            (!organizationId && projectData.user_id === userId && !projectData.organization_id);

          if (!hasAccess) {
            return NextResponse.json({ error: "Project not accessible in current organization" }, { status: 403 });
          }
        }
      }
    } else if (userId) {
      const { data: userData } = await supabase
        .from("users")
        .select("active_organization_id")
        .eq("id", userId)
        .single();
      organizationId = userData?.active_organization_id || null;
    }

    // === 8.2: 5-MODE CLASSIFIER ===
    let mode: MelvinMode;

    const validModes: MelvinMode[] = ["GENERAL", "PROJECT", "PRODUCT", "KNOWLEDGE", "FULL"];
    if (modeOverride && validModes.includes(modeOverride)) {
      mode = modeOverride;
    } else {
      mode = await classifyQuery(question);
    }

    // === ROUTE BY MODE ===
    switch (mode) {
      case "GENERAL":
        return handleGeneral(question, history, memoryContext);

      case "PROJECT":
        return handleProject(question, history, dataset, memoryContext);

      case "PRODUCT":
        return handleProduct(question, history, memoryContext, organizationId);

      case "KNOWLEDGE":
        return handleKnowledge(question, history, memoryContext, organizationId);

      case "FULL":
        return handleFull(question, history, dataset, memoryContext, organizationId);

      default:
        return handleGeneral(question, history, memoryContext);
    }

  } catch (err: any) {
    console.error("Hybrid chat error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process question" },
      { status: 500 }
    );
  }
}

// === 8.2: CLASSIFIER — GPT-4o-mini, temp=0 ===
async function classifyQuery(question: string): Promise<MelvinMode> {
  const classificationPrompt = `Classify this question into exactly one mode for a fire protection product intelligence platform.

Modes:
- GENERAL: General knowledge, definitions, best practices, industry standards. No specific data lookup needed.
- PROJECT: Questions about the user's uploaded project data (Excel files, task statuses, dates, door schedules).
- PRODUCT: Questions about specific fire protection products, manufacturers, pricing, specifications, product comparisons.
- KNOWLEDGE: Questions requiring document reasoning — fire test certificates, regulation interpretation, BSA compliance, Approved Document B guidance, British Standards content.
- FULL: Complex questions needing multiple data sources — "which products in my project meet BS EN 1366-3" or "compare my quoted products against regulation requirements".

Question: "${question}"

Respond with ONLY the mode name (GENERAL, PROJECT, PRODUCT, KNOWLEDGE, or FULL):`;

  const classification = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: classificationPrompt }],
    temperature: 0,
    max_tokens: 10,
  });

  const result = (classification.choices[0].message.content?.trim().toUpperCase() || "GENERAL") as MelvinMode;
  const validModes: MelvinMode[] = ["GENERAL", "PROJECT", "PRODUCT", "KNOWLEDGE", "FULL"];
  return validModes.includes(result) ? result : "GENERAL";
}

// === GENERAL MODE — GPT-4o-mini, model knowledge only ===
async function handleGeneral(question: string, history: any[], memoryContext: string) {
  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — a knowledgeable assistant for fire protection and construction professionals.

${memoryContext}

Rules:
1. Answer in 2-4 sentences for most questions
2. Start with the key point immediately
3. Use short words: "use" not "utilize"
4. Active voice always
5. Keep industry terms (FD30, RRO, BSA, etc.)
6. Answer confidently based on fire protection industry standards`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
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
    mode: "GENERAL",
  });
}

// === PROJECT MODE — GPT-4o-mini, user's Excel data ===
async function handleProject(question: string, history: any[], dataset: any, memoryContext: string) {
  if (!dataset?.rows || dataset.rows.length === 0) {
    return NextResponse.json({
      answer: "No project data loaded. Upload an Excel file and I'll analyze it.",
      source: "no_data",
      mode: "PROJECT",
    });
  }

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — analyzing the user's project data.

Dataset: ${dataset.rows.length} rows. Sample: ${JSON.stringify(dataset.rows.slice(0, 10), null, 2)}

${memoryContext}

Rules:
1. Answer in 2-3 sentences MAX
2. Start with the NUMBER or FACT immediately
3. Be precise with data
4. Active voice, no fluff`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
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
    mode: "PROJECT",
  });
}

// === 8.3: PRODUCT MODE — GPT-4o-mini, product catalog via match_products RPC ===
async function handleProduct(question: string, history: any[], memoryContext: string, organizationId: string | null) {
  let productContext = "";

  if (organizationId) {
    try {
      const embedding = await generateEmbedding(question);

      const { data: products } = await supabaseAdmin.rpc("match_products", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 8,
        match_threshold: 0.6,
      });

      if (products && products.length > 0) {
        productContext = "\n--- Product Catalog Results ---\n" +
          products.map((p: any, i: number) =>
            `${i + 1}. ${p.product_name} (${p.product_code || "no code"}) — ${p.pillar}\n` +
            `   ${p.description || "No description"}\n` +
            (p.sell_price ? `   Price: £${p.sell_price}\n` : "") +
            (p.specifications ? `   Specs: ${JSON.stringify(p.specifications).slice(0, 200)}\n` : "")
          ).join("\n") +
          "\n--- End Results ---\n";
      }
    } catch {
      // Non-critical — fall back to general knowledge
    }
  }

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — helping find and compare fire protection products.

${productContext}
${memoryContext}

Rules:
1. Reference specific products from the catalog results when available
2. Include product codes and prices when showing results
3. If no catalog results, use general product knowledge
4. Keep answers concise (3-5 sentences)
5. Active voice, industry terminology`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.4,
    max_tokens: 500,
  });

  return NextResponse.json({
    answer: response.choices[0].message.content,
    source: productContext ? "product_catalog" : "general_knowledge",
    mode: "PRODUCT",
  });
}

// === 8.4: KNOWLEDGE MODE — Claude Sonnet, bluebook_chunks + regulation_sections ===
async function handleKnowledge(question: string, history: any[], memoryContext: string, organizationId: string | null) {
  let knowledgeContext = "";
  const citations: string[] = [];

  if (organizationId) {
    try {
      const embedding = await generateEmbedding(question);

      // Search bluebook chunks
      const { data: chunks } = await supabaseAdmin.rpc("match_bluebook_chunks", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 5,
        match_threshold: 0.65,
      });

      if (chunks && chunks.length > 0) {
        knowledgeContext += "\n--- Bluebook Knowledge Base ---\n";
        for (const chunk of chunks) {
          knowledgeContext += `[Source: ${chunk.source_file}, Page ${chunk.page_number}]\n${chunk.chunk_text}\n\n`;
          citations.push(`${chunk.source_file} (p.${chunk.page_number})`);
        }
        knowledgeContext += "--- End Bluebook ---\n";
      }

      // Search regulation sections
      const { data: sections } = await supabaseAdmin.rpc("match_regulation_sections", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 5,
        match_threshold: 0.65,
      });

      if (sections && sections.length > 0) {
        knowledgeContext += "\n--- Regulation Sections ---\n";
        for (const sec of sections) {
          const ref = sec.section_ref ? `${sec.regulation_ref} ${sec.section_ref}` : sec.regulation_ref;
          knowledgeContext += `[${ref} — ${sec.regulation_name}]\n${sec.section_text}\n\n`;
          citations.push(`${sec.regulation_ref}${sec.section_ref ? " " + sec.section_ref : ""}`);
        }
        knowledgeContext += "--- End Regulations ---\n";
      }
    } catch {
      // Non-critical
    }
  }

  // === 8.6: Citation formatting ===
  const citationInstruction = citations.length > 0
    ? `\nWhen referencing information from the sources, cite them inline like [Source: filename, p.X] or [Reg: BS EN 1366-3 §4.2]. Always cite your sources.`
    : "";

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — an expert in fire protection regulations, British Standards, and building safety compliance. You use Claude for deep document reasoning.

${knowledgeContext}
${memoryContext}
${citationInstruction}

Rules:
1. Reason carefully about fire test configurations, regulation clauses, and conditional requirements
2. Reference specific sections, clause numbers, and page numbers when available
3. Distinguish between mandatory requirements and guidance
4. If sources don't cover the question, say so clearly
5. Keep answers thorough but focused (4-8 sentences)`;

  // Use Claude for knowledge mode
  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.slice(-6).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 800,
    system: systemPrompt,
    messages: claudeMessages,
  });

  const answer = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({
    answer,
    source: knowledgeContext ? "knowledge_base" : "general_knowledge",
    mode: "KNOWLEDGE",
    citations: citations.length > 0 ? Array.from(new Set(citations)) : undefined,
  });
}

// === 8.5: FULL MODE — Claude Sonnet, all data sources combined ===
async function handleFull(
  question: string,
  history: any[],
  dataset: any,
  memoryContext: string,
  organizationId: string | null
) {
  let fullContext = "";
  const citations: string[] = [];

  // Project data
  if (dataset?.rows && dataset.rows.length > 0) {
    fullContext += `\n--- Project Data (${dataset.rows.length} rows) ---\n`;
    fullContext += JSON.stringify(dataset.rows.slice(0, 15), null, 2);
    fullContext += "\n--- End Project Data ---\n";
  }

  if (organizationId) {
    try {
      const embedding = await generateEmbedding(question);

      // Products
      const { data: products } = await supabaseAdmin.rpc("match_products", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 5,
        match_threshold: 0.6,
      });

      if (products && products.length > 0) {
        fullContext += "\n--- Product Catalog ---\n";
        for (const p of products) {
          fullContext += `${p.product_name} (${p.product_code || "—"}) — ${p.pillar}, £${p.sell_price || "N/A"}\n`;
          if (p.specifications) fullContext += `  Specs: ${JSON.stringify(p.specifications).slice(0, 150)}\n`;
        }
        fullContext += "--- End Products ---\n";
      }

      // Bluebook chunks
      const { data: chunks } = await supabaseAdmin.rpc("match_bluebook_chunks", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 3,
        match_threshold: 0.65,
      });

      if (chunks && chunks.length > 0) {
        fullContext += "\n--- Bluebook Knowledge ---\n";
        for (const chunk of chunks) {
          fullContext += `[${chunk.source_file}, p.${chunk.page_number}] ${chunk.chunk_text.slice(0, 300)}\n\n`;
          citations.push(`${chunk.source_file} (p.${chunk.page_number})`);
        }
        fullContext += "--- End Bluebook ---\n";
      }

      // Regulation sections
      const { data: sections } = await supabaseAdmin.rpc("match_regulation_sections", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 3,
        match_threshold: 0.65,
      });

      if (sections && sections.length > 0) {
        fullContext += "\n--- Regulations ---\n";
        for (const sec of sections) {
          fullContext += `[${sec.regulation_ref}${sec.section_ref ? " " + sec.section_ref : ""}] ${sec.section_text.slice(0, 300)}\n\n`;
          citations.push(`${sec.regulation_ref}${sec.section_ref ? " " + sec.section_ref : ""}`);
        }
        fullContext += "--- End Regulations ---\n";
      }
    } catch {
      // Non-critical
    }
  }

  const citationInstruction = citations.length > 0
    ? "\nCite sources inline: [Source: filename, p.X] or [Reg: reference §section]."
    : "";

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — combining all available data: project data, product catalog, technical documents, and fire safety regulations.

${fullContext}
${memoryContext}
${citationInstruction}

Rules:
1. Cross-reference data sources to give complete answers
2. If the question involves products AND regulations, show which products meet which standards
3. Cite sources when referencing specific documents or regulations
4. Be thorough but structured (use bullet points for complex answers)
5. Keep total length reasonable (5-10 sentences or equivalent)`;

  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.slice(-6).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1000,
    system: systemPrompt,
    messages: claudeMessages,
  });

  const answer = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({
    answer,
    source: fullContext ? "full_combined" : "general_knowledge",
    mode: "FULL",
    citations: citations.length > 0 ? Array.from(new Set(citations)) : undefined,
  });
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
