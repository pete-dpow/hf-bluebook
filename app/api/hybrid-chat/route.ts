import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/embeddingService";
import { recalculateQuoteTotals } from "@/lib/quoteCalculations";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "sk-ant-placeholder" });

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");
    _supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return _supabaseAdmin;
}

type MelvinMode = "GENERAL" | "PROJECT" | "PRODUCT" | "KNOWLEDGE" | "FULL" | "QUOTE";

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

    const supabaseAdmin = getSupabaseAdmin();

    // Validate token if provided
    if (token) {
      const { data: { user: tokenUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !tokenUser) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
      // Ensure userId matches the token
      if (userId && tokenUser.id !== userId) {
        return NextResponse.json({ error: "Token/user mismatch" }, { status: 403 });
      }
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
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("active_organization_id")
        .eq("id", userId)
        .single();

      organizationId = userData?.active_organization_id || null;

      if (organizationId) {
        const { data: projectData } = await supabaseAdmin
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
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("active_organization_id")
        .eq("id", userId)
        .single();
      organizationId = userData?.active_organization_id || null;
    }

    // === 8.2: 6-MODE CLASSIFIER ===
    let mode: MelvinMode;

    const validModes: MelvinMode[] = ["GENERAL", "PROJECT", "PRODUCT", "KNOWLEDGE", "FULL", "QUOTE"];
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

      case "QUOTE":
        return handleQuote(question, history, memoryContext, organizationId, token);

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
- QUOTE: Adding products to quotes, creating quotes, modifying quote items, listing quote contents. Examples: "add 24 Quelfire to the Byker Wall quote", "create a new quote for Smith Ltd", "what's on the current quote", "add fire doors to quote HF-Q-0012".

Question: "${question}"

Respond with ONLY the mode name (GENERAL, PROJECT, PRODUCT, KNOWLEDGE, FULL, or QUOTE):`;

  const classification = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: classificationPrompt }],
    temperature: 0,
    max_tokens: 10,
  });

  const result = (classification.choices[0].message.content?.trim().toUpperCase() || "GENERAL") as MelvinMode;
  const validModes: MelvinMode[] = ["GENERAL", "PROJECT", "PRODUCT", "KNOWLEDGE", "FULL", "QUOTE"];
  return validModes.includes(result) ? result : "GENERAL";
}

// === GENERAL MODE — GPT-4o-mini, model knowledge only ===
async function handleGeneral(question: string, history: any[], memoryContext: string) {
  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — a sharp, friendly expert for fire protection and construction professionals. You know your stuff and talk like a trusted colleague, not a textbook.

${memoryContext}

Rules:
1. Lead with the answer — no preamble, no "Great question!"
2. Keep it concise (2-4 sentences) but genuinely helpful
3. Use plain English: "use" not "utilize", "about" not "approximately"
4. Active voice, direct address — talk TO them, not AT them
5. Keep industry terms natural (FD30, RRO, BSA, AP-B, etc.)
6. If something is commonly misunderstood, flag it
7. Be warm but professional — you're their go-to expert, not a search engine`;

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

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — analyzing the user's project data. You're precise with numbers and help them spot what matters.

Dataset: ${dataset.rows.length} rows. Sample: ${JSON.stringify(dataset.rows.slice(0, 10), null, 2)}

${memoryContext}

Rules:
1. Lead with the number or key finding immediately
2. Keep it tight — 2-3 sentences MAX
3. If something in the data looks unusual or concerning, mention it
4. Reference specific rows/values when relevant
5. Active voice, no filler`;

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
  let structuredProducts: any[] = [];

  if (organizationId) {
    try {
      const embedding = await generateEmbedding(question);

      const { data: products } = await getSupabaseAdmin().rpc("match_products", {
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

        structuredProducts = products.map((p: any) => ({
          id: p.id,
          product_name: p.product_name,
          product_code: p.product_code,
          pillar: p.pillar,
          description: p.description,
          sell_price: p.sell_price,
          list_price: p.list_price,
          manufacturer_id: p.manufacturer_id,
          similarity: p.similarity,
        }));
      }
    } catch {
      // Non-critical — fall back to general knowledge
    }
  }

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — a sharp, friendly expert who helps fire protection professionals find the right products fast.

${productContext}
${memoryContext}

Rules:
1. Reference specific products from the catalog results when available
2. Include product codes and prices when showing results
3. If no catalog results, use your general fire protection product knowledge
4. Keep answers concise but helpful (3-5 sentences)
5. Use direct, active language — talk like a knowledgeable colleague, not a chatbot
6. If you recommend a product, briefly explain WHY it fits their needs`;

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
    products: structuredProducts.length > 0 ? structuredProducts : undefined,
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
      const { data: chunks } = await getSupabaseAdmin().rpc("match_bluebook_chunks", {
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
      const { data: sections } = await getSupabaseAdmin().rpc("match_regulation_sections", {
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

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — a deep expert in fire protection regulations, British Standards, and building safety compliance. You reason carefully through technical details and explain them clearly.

${knowledgeContext}
${memoryContext}
${citationInstruction}

Rules:
1. Reason through fire test configurations, regulation clauses, and conditional requirements step by step
2. Always cite specific sections, clause numbers, and page numbers when available
3. Clearly distinguish between mandatory requirements ("must") and guidance ("should")
4. If the sources don't fully cover the question, be upfront about it
5. Be thorough but focused (4-8 sentences) — these are professionals who need precise answers
6. Flag common pitfalls or misinterpretations where relevant`;

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
  let structuredProducts: any[] = [];

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
      const { data: products } = await getSupabaseAdmin().rpc("match_products", {
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

        structuredProducts = products.map((p: any) => ({
          id: p.id,
          product_name: p.product_name,
          product_code: p.product_code,
          pillar: p.pillar,
          description: p.description,
          sell_price: p.sell_price,
          list_price: p.list_price,
          manufacturer_id: p.manufacturer_id,
          similarity: p.similarity,
        }));
      }

      // Bluebook chunks
      const { data: chunks } = await getSupabaseAdmin().rpc("match_bluebook_chunks", {
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
      const { data: sections } = await getSupabaseAdmin().rpc("match_regulation_sections", {
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

  const systemPrompt = `You are Melvin, the hf.bluebook AI assistant — your strongest mode. You cross-reference project data, product catalogs, technical documents, and fire safety regulations to give comprehensive answers.

${fullContext}
${memoryContext}
${citationInstruction}

Rules:
1. Cross-reference data sources — connect the dots between products, regulations, and project requirements
2. If products AND regulations are relevant, show specifically which products meet which standards
3. Always cite sources when referencing documents or regulations
4. Structure complex answers with bullet points or numbered lists
5. Be thorough but not bloated (5-10 sentences or equivalent)
6. Give actionable recommendations, not just information`;

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
    products: structuredProducts.length > 0 ? structuredProducts : undefined,
  });
}

// === QUOTE MODE — Natural language quote management ===
async function handleQuote(
  question: string,
  history: any[],
  memoryContext: string,
  organizationId: string | null,
  token: string | null
) {
  if (!organizationId) {
    return NextResponse.json({
      answer: "You need to be logged in with an organization to manage quotes.",
      mode: "QUOTE",
    });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Step 1: Extract structured intent from natural language
  const extractionPrompt = `Extract the user's quote management intent from their message. Return valid JSON only.

Actions:
- "add_item": User wants to add a product to a quote. Extract product_query (product name/code), quantity (default 1), and quote_ref (quote number like HF-Q-0001, or project/client name).
- "create_quote": User wants to create a new quote. Extract client_name and/or project_name.
- "list_items": User wants to see what's on a quote. Extract quote_ref.

Respond with ONLY valid JSON:
{
  "action": "add_item" | "create_quote" | "list_items",
  "product_query": "string or null",
  "quantity": number,
  "quote_ref": "string or null",
  "client_name": "string or null",
  "project_name": "string or null"
}`;

  const extraction = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: extractionPrompt },
      { role: "user", content: question },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  let parsed: any;
  try {
    parsed = JSON.parse(extraction.choices[0].message.content || "{}");
  } catch {
    return NextResponse.json({
      answer: "I couldn't understand that quote request. Try something like: \"add 24x Quelfire QF60 to the Byker Wall quote\"",
      mode: "QUOTE",
    });
  }

  const { action, product_query, quantity = 1, quote_ref, client_name, project_name } = parsed;

  // Step 2: Handle each action
  if (action === "create_quote") {
    const { data: quote, error } = await supabaseAdmin
      .from("quotes")
      .insert({
        organization_id: organizationId,
        quote_number: `HF-Q-${String(Date.now()).slice(-4)}`,
        client_name: client_name || "Draft",
        project_name: project_name || null,
        status: "draft",
        subtotal: 0,
        vat_percent: 20,
        vat_amount: 0,
        total: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        answer: `Failed to create quote: ${error.message}`,
        mode: "QUOTE",
      });
    }

    return NextResponse.json({
      answer: `Created new quote **${quote.quote_number}** for ${client_name || "Draft"}${project_name ? ` (${project_name})` : ""}. You can now add products to it.`,
      mode: "QUOTE",
      quoteAction: { type: "create_quote", quoteId: quote.id, quoteNumber: quote.quote_number },
    });
  }

  if (action === "list_items") {
    // Find the quote
    let quoteQuery = supabaseAdmin
      .from("quotes")
      .select("id, quote_number, client_name, project_name, total, status")
      .eq("organization_id", organizationId);

    if (quote_ref) {
      if (quote_ref.match(/^HF-Q-/i)) {
        quoteQuery = quoteQuery.ilike("quote_number", `%${quote_ref}%`);
      } else {
        quoteQuery = quoteQuery.or(`project_name.ilike.%${quote_ref}%,client_name.ilike.%${quote_ref}%`);
      }
    }

    const { data: quotes } = await quoteQuery.order("updated_at", { ascending: false }).limit(1);
    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        answer: quote_ref ? `Couldn't find a quote matching "${quote_ref}".` : "No quotes found. Create one first.",
        mode: "QUOTE",
      });
    }

    const quote = quotes[0];
    const { data: items } = await supabaseAdmin
      .from("quote_line_items")
      .select("description, quantity, unit_price, line_total, product_code")
      .eq("quote_id", quote.id)
      .order("sort_order", { ascending: true });

    if (!items || items.length === 0) {
      return NextResponse.json({
        answer: `Quote **${quote.quote_number}** (${quote.client_name}) has no items yet.`,
        mode: "QUOTE",
        quoteAction: { type: "list_items", quoteId: quote.id, quoteNumber: quote.quote_number },
      });
    }

    const itemList = items.map((it: any, i: number) =>
      `${i + 1}. ${it.quantity}x ${it.description}${it.product_code ? ` (${it.product_code})` : ""} — £${(it.line_total || 0).toFixed(2)}`
    ).join("\n");

    return NextResponse.json({
      answer: `**${quote.quote_number}** — ${quote.client_name}${quote.project_name ? ` / ${quote.project_name}` : ""}\n\n${itemList}\n\n**Total: £${(quote.total || 0).toFixed(2)}**`,
      mode: "QUOTE",
      quoteAction: { type: "list_items", quoteId: quote.id, quoteNumber: quote.quote_number },
    });
  }

  if (action === "add_item") {
    if (!product_query) {
      return NextResponse.json({
        answer: "I need a product name to add. Try: \"add 24x Quelfire QF60 to the Byker Wall quote\"",
        mode: "QUOTE",
      });
    }

    // Find the product via vector search
    let matchedProduct: any = null;
    try {
      const embedding = await generateEmbedding(product_query);
      const { data: products } = await supabaseAdmin.rpc("match_products", {
        query_embedding: embedding,
        match_org_id: organizationId,
        match_count: 1,
        match_threshold: 0.5,
      });
      if (products && products.length > 0) {
        matchedProduct = products[0];
      }
    } catch { /* fall through */ }

    // Keyword fallback
    if (!matchedProduct) {
      const { data: kwResults } = await supabaseAdmin
        .from("products")
        .select("id, product_name, product_code, sell_price, list_price, manufacturer_id")
        .eq("organization_id", organizationId)
        .or(`product_name.ilike.%${product_query}%,product_code.ilike.%${product_query}%`)
        .limit(1);
      if (kwResults && kwResults.length > 0) {
        matchedProduct = kwResults[0];
      }
    }

    if (!matchedProduct) {
      return NextResponse.json({
        answer: `Couldn't find a product matching "${product_query}" in your catalog. Check the product name or code and try again.`,
        mode: "QUOTE",
      });
    }

    // Find or create the target quote
    let targetQuote: any = null;

    if (quote_ref) {
      let quoteQuery = supabaseAdmin
        .from("quotes")
        .select("id, quote_number, client_name, project_name")
        .eq("organization_id", organizationId);

      if (quote_ref.match(/^HF-Q-/i)) {
        quoteQuery = quoteQuery.ilike("quote_number", `%${quote_ref}%`);
      } else {
        quoteQuery = quoteQuery.or(`project_name.ilike.%${quote_ref}%,client_name.ilike.%${quote_ref}%,quote_name.ilike.%${quote_ref}%`);
      }

      const { data: quotes } = await quoteQuery.order("updated_at", { ascending: false }).limit(1);
      if (quotes && quotes.length > 0) {
        targetQuote = quotes[0];
      }
    }

    // If no quote found, get the most recent draft
    if (!targetQuote) {
      const { data: recentQuotes } = await supabaseAdmin
        .from("quotes")
        .select("id, quote_number, client_name, project_name")
        .eq("organization_id", organizationId)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (recentQuotes && recentQuotes.length > 0) {
        targetQuote = recentQuotes[0];
      }
    }

    // Still no quote? Create one
    if (!targetQuote) {
      const { data: newQuote, error: qErr } = await supabaseAdmin
        .from("quotes")
        .insert({
          organization_id: organizationId,
          quote_number: `HF-Q-${String(Date.now()).slice(-4)}`,
          client_name: "Draft",
          project_name: quote_ref || null,
          status: "draft",
          subtotal: 0,
          vat_percent: 20,
          vat_amount: 0,
          total: 0,
        })
        .select()
        .single();

      if (qErr) {
        return NextResponse.json({
          answer: `Failed to create a new quote: ${qErr.message}`,
          mode: "QUOTE",
        });
      }
      targetQuote = newQuote;
    }

    // Add line item
    const unitPrice = matchedProduct.sell_price || matchedProduct.list_price || 0;
    const lineTotal = quantity * unitPrice;

    const { error: liErr } = await supabaseAdmin
      .from("quote_line_items")
      .insert({
        quote_id: targetQuote.id,
        product_id: matchedProduct.id,
        description: matchedProduct.product_name,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        unit: "each",
        product_code: matchedProduct.product_code || null,
      });

    if (liErr) {
      return NextResponse.json({
        answer: `Failed to add item: ${liErr.message}`,
        mode: "QUOTE",
      });
    }

    // Recalculate totals
    await recalculateQuoteTotals(targetQuote.id);

    const productName = matchedProduct.product_name;
    const priceStr = unitPrice > 0 ? ` at £${unitPrice.toFixed(2)} each` : "";

    return NextResponse.json({
      answer: `Added **${quantity}x ${productName}**${matchedProduct.product_code ? ` (${matchedProduct.product_code})` : ""}${priceStr} to quote **${targetQuote.quote_number}**${targetQuote.project_name ? ` (${targetQuote.project_name})` : ""}. Line total: £${lineTotal.toFixed(2)}`,
      mode: "QUOTE",
      quoteAction: {
        type: "add_item",
        quoteId: targetQuote.id,
        quoteNumber: targetQuote.quote_number,
        productName,
        quantity,
      },
    });
  }

  return NextResponse.json({
    answer: "Not sure what you need on the quote side — here's what I can do:\n\n- **Add items**: \"Add 24x Quelfire QF60 to the Byker Wall quote\"\n- **New quote**: \"Create a quote for Smith Ltd\"\n- **Check contents**: \"What's on the current quote?\"\n\nJust tell me what you need.",
    mode: "QUOTE",
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
