import { NextResponse } from "next/server";

// ⭐ Task 24: Production Config Validation
const PRODUCTION_CONFIG = {
  maxMessageLength: 4096,  // WhatsApp limit
  maxQuickReplies: 3,      // WhatsApp limit for buttons
  maxListItems: 10,        // WhatsApp limit for list
  contextMessageCount: 5,  // How many past messages to include
  supportEmail: "crane@dpow.co.uk",
  supportPhone: "+447XXX",  // Update with real number
};

// ⭐ Task 16: Message Templates
const MESSAGE_TEMPLATES = {
  acknowledgment: "⏱️ On it...",
  notWhitelisted: (phone: string) => 
    `🔒 *Access Required*\n\nYour number isn't approved yet.\n\n_Ask your admin to add *${phone}*!_`,
  userSetupRequired: (orgName: string, adminEmail: string) =>
    `✅ You're approved for *${orgName}*\n\nQuick setup:\n• Sign in to hf.bluebook\n• Load a project\n• Try again\n\n_Need help? Contact ${adminEmail}!_`,
  orgError: () =>
    `⚠️ Organization error.\n\n_Contact ${PRODUCTION_CONFIG.supportEmail}!_`,
  notInOrgWhitelist: (orgName: string, phone: string, adminEmail: string) =>
    `🔒 *${orgName}* - Access Denied\n\nYour number *${phone}* isn't approved.\n\n_Contact ${adminEmail} to get added!_`,
  noActiveProject: () =>
    `📂 *No Active Project*\n\nQuick fix:\n• Open hf.bluebook\n• Click a project\n• Ask again`,
  projectNotFound: () =>
    `📂 *Project Not Found*\n\n_Your active project may have been archived or deleted._\n\nQuick fix:\n• Open hf.bluebook\n• Click a project\n• Try again`,
  noFiles: () =>
    `📂 *No Files Found*\n\n_The project has no files yet!_\n\n_Upload an Excel file to start!_`,
  noData: () =>
    `📂 *No Data Found*\n\n_The files are empty!_`,
  queryFailed: () =>
    `⚠️ *Query Failed*\n\n_Something went wrong!_\n\n_Try again or contact ${PRODUCTION_CONFIG.supportEmail}!_`,
  voiceReceived: () =>
    `🎤 *Voice Message Received*\n\n_Transcribing..._`,
  voiceNotSupported: () =>
    `🎤 *Voice Messages*\n\n_Voice transcription coming soon!_\n\n_Please type your question for now._`,
  // ⭐ Task 16: Common response templates
  helpMenu: (projectName: string) =>
    `📚 *${projectName} - Help Menu*\n\n` +
    `Try asking:\n` +
    `• "How many items are approved?"\n` +
    `• "Show me blockers"\n` +
    `• "What's the status breakdown?"\n` +
    `• "Any items pending review?"\n\n` +
    `_Type your question or tap a suggestion below!_`,
  statusSummary: (projectName: string, fileCount: number, totalRows: number) =>
    `📊 *${projectName}*\n` +
    `📁 ${fileCount} ${fileCount === 1 ? 'file' : 'files'} • ${totalRows} items\n\n` +
    `_What would you like to know?_`,
};

// ⭐ Task 15: Quick Reply Button Builder
function buildQuickReplyButtons(options: string[]): any {
  // WhatsApp allows max 3 buttons
  const buttons = options.slice(0, PRODUCTION_CONFIG.maxQuickReplies).map((text, index) => ({
    type: "reply",
    reply: {
      id: `btn_${index}_${Date.now()}`,
      title: text.substring(0, 20), // WhatsApp limit: 20 chars
    }
  }));
  
  return {
    type: "button",
    body: { text: "Quick actions:" },
    action: { buttons }
  };
}

// ⭐ Task 18: Interactive List Builder
function buildInteractiveList(title: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]): any {
  return {
    type: "list",
    header: { type: "text", text: title },
    body: { text: "Select an option:" },
    action: {
      button: "View Options",
      sections: sections.map(section => ({
        title: section.title,
        rows: section.rows.slice(0, PRODUCTION_CONFIG.maxListItems).map(row => ({
          id: row.id,
          title: row.title.substring(0, 24), // WhatsApp limit
          description: row.description?.substring(0, 72) || "" // WhatsApp limit
        }))
      }))
    }
  };
}

export async function POST(req: Request) {
  try {
    const twilio = (await import("twilio")).default;
    const { default: OpenAI } = await import("openai");
    const { supabaseAdmin } = await import("@/lib/supabase");

    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const formData = await req.formData();
    const body = Object.fromEntries(formData);

    const from = body.From as string;
    const twilioNumber = body.To as string;
    const cleanPhone = from.replace('whatsapp:', '');

    // ⭐ Task 17: Check for voice message
    const mediaContentType = body.MediaContentType0 as string | undefined;
    const mediaUrl = body.MediaUrl0 as string | undefined;
    const numMedia = parseInt(body.NumMedia as string || "0");
    
    let messageBody = body.Body as string || "";
    let isVoiceMessage = false;

    // ⭐ Task 17: Handle voice messages
    if (numMedia > 0 && mediaContentType?.includes("audio")) {
      isVoiceMessage = true;
      
      // Send acknowledgment for voice
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.voiceReceived(),
        from: twilioNumber,
        to: from,
      });

      try {
        // Download and transcribe voice message
        const audioResponse = await fetch(mediaUrl!, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64')
          }
        });

        if (audioResponse.ok) {
          const audioBuffer = await audioResponse.arrayBuffer();
          const audioFile = new File([audioBuffer], 'voice.ogg', { type: mediaContentType });

          // Transcribe with Whisper
          const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en",
          });

          messageBody = transcription.text;
          console.log(`🎤 Voice transcribed: "${messageBody}"`);
        } else {
          throw new Error("Failed to download audio");
        }
      } catch (voiceErr) {
        console.error("Voice transcription error:", voiceErr);
        await twilioClient.messages.create({
          body: MESSAGE_TEMPLATES.voiceNotSupported(),
          from: twilioNumber,
          to: from,
        });
        return NextResponse.json({ status: "voice_error" });
      }
    }

    // Handle empty message (might be image/document without text)
    if (!messageBody || messageBody.trim() === "") {
      await twilioClient.messages.create({
        body: `📝 *No text received*\n\n_Please type your question or send a voice message!_`,
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "no_message" });
    }

    // Send acknowledgment (if not voice - voice already acknowledged)
    if (!isVoiceMessage) {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.acknowledgment,
        from: twilioNumber,
        to: from,
      });
    }

    // ==========================================
    // PHASE 10A: WHITELIST SECURITY CHECK
    // ==========================================
    
    const { data: usersData } = await supabaseAdmin
      .from("users")
      .select("id, email, active_project_id, active_file_id, active_organization_id")
      .eq("phone_number", cleanPhone)
      .limit(1);

    if (!usersData || usersData.length === 0) {
      const { data: orgData } = await supabaseAdmin
        .from("organizations")
        .select("id, name, whatsapp_allowed_numbers")
        .contains("whatsapp_allowed_numbers", [cleanPhone])
        .limit(1);

      if (!orgData || orgData.length === 0) {
        await twilioClient.messages.create({
          body: MESSAGE_TEMPLATES.notWhitelisted(cleanPhone),
          from: twilioNumber,
          to: from,
        });
        return NextResponse.json({ status: "not_whitelisted" });
      }

      const { data: adminData } = await supabaseAdmin
        .from("organization_members")
        .select(`users:user_id (email)`)
        .eq("organization_id", orgData[0].id)
        .eq("role", "admin")
        .limit(1);

      const adminEmail = (adminData?.[0] as any)?.users?.email || "your admin";

      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.userSetupRequired(orgData[0].name, adminEmail),
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "user_setup_required" });
    }

    const userData = usersData[0];

    // Verify phone is in org's whitelist
    if (userData.active_organization_id) {
      const { data: orgData } = await supabaseAdmin
        .from("organizations")
        .select("whatsapp_allowed_numbers, name")
        .eq("id", userData.active_organization_id)
        .single();

      if (!orgData) {
        await twilioClient.messages.create({
          body: MESSAGE_TEMPLATES.orgError(),
          from: twilioNumber,
          to: from,
        });
        return NextResponse.json({ status: "org_error" });
      }

      const allowedNumbers = orgData.whatsapp_allowed_numbers || [];
      if (!allowedNumbers.includes(cleanPhone)) {
        const { data: adminData } = await supabaseAdmin
          .from("organization_members")
          .select(`users:user_id (email)`)
          .eq("organization_id", userData.active_organization_id)
          .eq("role", "admin")
          .limit(1);

        const adminEmail = (adminData?.[0] as any)?.users?.email || "your org admin";

        await twilioClient.messages.create({
          body: MESSAGE_TEMPLATES.notInOrgWhitelist(orgData.name, cleanPhone, adminEmail),
          from: twilioNumber,
          to: from,
        });
        return NextResponse.json({ status: "not_in_org_whitelist" });
      }
    }

    // ==========================================
    // CHECK ACTIVE PROJECT
    // ==========================================
    
    if (!userData.active_project_id) {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.noActiveProject(),
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "no_active_project" });
    }

    const { data: projectData, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, name, organization_id")
      .eq("id", userData.active_project_id)
      .single();

    if (projectError || !projectData) {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.projectNotFound(),
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "project_not_found" });
    }

    // Get ALL files for active project
    const { data: filesData, error: filesError } = await supabaseAdmin
      .from("files")
      .select("id, file_name, dataset, project_id")
      .eq("project_id", userData.active_project_id);

    if (filesError || !filesData || filesData.length === 0) {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.noFiles(),
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "no_files" });
    }

    // Combine all datasets
    const combinedRows = filesData.flatMap(file => file.dataset?.data || file.dataset?.rows || []);

    if (combinedRows.length === 0) {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.noData(),
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "no_data" });
    }

    const projectName = projectData.name;
    const fileCount = filesData.length;
    const fileNames = filesData.map(f => f.file_name).join(", ");

    console.log(`📊 WhatsApp query for project: ${projectName}`);
    console.log(`📁 Files: ${fileCount} (${fileNames})`);
    console.log(`📈 Combined rows: ${combinedRows.length}`);

    // ==========================================
    // ⭐ Task 14: LOAD CONVERSATION CONTEXT
    // ==========================================
    
    const { data: recentMessages } = await supabaseAdmin
      .from("chat_messages")
      .select("role, text, created_at")
      .eq("user_id", userData.id)
      .eq("project_id", userData.active_project_id)
      .order("created_at", { ascending: false })
      .limit(PRODUCTION_CONFIG.contextMessageCount * 2); // Get pairs

    // Format conversation history for context
    const conversationHistory = (recentMessages || [])
      .reverse()
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.text
      }));

    console.log(`💬 Loaded ${conversationHistory.length} messages for context`);

    // ==========================================
    // ⭐ Task 15/18: HANDLE SPECIAL COMMANDS
    // ==========================================
    
    const lowerMessage = messageBody.toLowerCase().trim();
    
    // Help command - show interactive menu
    if (lowerMessage === "help" || lowerMessage === "menu" || lowerMessage === "?") {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.helpMenu(projectName),
        from: twilioNumber,
        to: from,
      });
      
      // Note: Twilio WhatsApp doesn't support interactive messages via REST API
      // Would need WhatsApp Business API directly for buttons/lists
      // For now, we send helpful text suggestions
      
      return NextResponse.json({ status: "help_sent" });
    }

    // Status command - quick summary
    if (lowerMessage === "status" || lowerMessage === "summary") {
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.statusSummary(projectName, fileCount, combinedRows.length),
        from: twilioNumber,
        to: from,
      });
      return NextResponse.json({ status: "status_sent" });
    }

    // ==========================================
    // HYBRID INTELLIGENCE WITH CONTEXT
    // ==========================================

    // Build context string from history
    const contextString = conversationHistory.length > 0
      ? `\n\nRecent conversation:\n${conversationHistory.map(m => 
          `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
        ).join("\n")}\n\n`
      : "";

    // STEP 1: Classify the query
    const classificationPrompt = `Analyze this question about a construction project:

Question: "${messageBody}"
${contextString ? `Context: User has been asking about this project recently.` : ""}

Respond with ONE WORD ONLY:
- "PROJECT" = asks about specific data in the Excel file (counts, statuses, values)
- "GENERAL" = asks for industry knowledge, definitions, regulations, best practices
- "BOTH" = needs both knowledge AND their specific data

Classification:`;

    const classification = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: classificationPrompt }],
      temperature: 0,
      max_tokens: 10,
    });

    const queryType = classification.choices[0].message.content?.trim().toUpperCase() || "GENERAL";
    console.log(`🔍 WhatsApp query classified as: ${queryType}`);

    // STEP 2: Route and respond based on classification
    let answer = "";
    let systemPrompt = "";

    if (queryType === "GENERAL") {
      systemPrompt = `You're a trusted colleague at ${projectName} providing construction knowledge via WhatsApp.
${contextString}
TONE: Natural, conversational, like texting a knowledgeable mate
STYLE: Orwell clarity - short words, active voice, cut fluff
LENGTH: 2-4 sentences max

WHATSAPP FORMATTING:
- *bold* for regulations, key terms, document names
- _italic_ for warnings/tips and sentences with !
- • bullets if listing 2+ items
- Single line break between sentences
- Double line break before final tip

Answer naturally. No "I don't have real-time data" disclaimers.
If this is a follow-up question, reference the previous context naturally.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-4), // Include recent context
        { role: "user", content: messageBody }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.5,
        max_tokens: 350,
      });

      answer = response.choices[0].message.content || "Can't answer that right now.";
    }

    else if (queryType === "PROJECT") {
      systemPrompt = `You're analyzing data for ${projectName} via WhatsApp.
${contextString}
Dataset: ${combinedRows.length} rows across ${fileCount} files
Files: ${fileNames}
Columns: ${Object.keys(combinedRows[0] || {}).join(", ")}
Sample data: ${JSON.stringify(combinedRows.slice(0, 5), null, 2)}

⚠️ CRITICAL: NO HALLUCINATIONS - Only use data that EXISTS above.

TONE: Direct, like texting quick facts
STYLE: Lead with NUMBER/FACT, then brief context
LENGTH: 2-3 sentences MAX

WHATSAPP FORMATTING:
- *bold* for numbers, statuses, key values
- _italic_ for blockers, warnings
- • bullets for category breakdowns

If this is a follow-up, reference previous answers naturally.
Be precise. Only say what's in the data.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-4),
        { role: "user", content: messageBody }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 300,
      });

      answer = response.choices[0].message.content || "Can't find that in the data.";
    }

    else {
      // BOTH - Hybrid
      systemPrompt = `You're combining construction knowledge with ${projectName} data via WhatsApp.
${contextString}
Dataset: ${combinedRows.length} rows across ${fileCount} files
Files: ${fileNames}
Columns: ${Object.keys(combinedRows[0] || {}).join(", ")}
Sample data: ${JSON.stringify(combinedRows.slice(0, 5), null, 2)}

⚠️ CRITICAL: NO HALLUCINATIONS on their data. Be honest about gaps.

TONE: Trusted colleague reviewing spreadsheet together
STYLE: Brief context, then their data, then recommendation
LENGTH: 3-4 sentences max

WHATSAPP FORMATTING:
- *bold* for regulations, numbers, statuses
- _italic_ for issues, warnings
- • bullets for breakdowns

If follow-up, connect to previous discussion naturally.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-4),
        { role: "user", content: messageBody }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4,
        max_tokens: 400,
      });

      answer = response.choices[0].message.content || "Can't process that right now.";
    }

    // ⭐ Task 24: Ensure message doesn't exceed WhatsApp limit
    const header = `📊 *${projectName}*\n📁 _${fileCount} ${fileCount === 1 ? 'file' : 'files'}_${isVoiceMessage ? '\n🎤 _Voice transcribed_' : ''}\n\n`;
    let fullMessage = header + answer;
    
    if (fullMessage.length > PRODUCTION_CONFIG.maxMessageLength) {
      // Truncate answer to fit
      const maxAnswerLength = PRODUCTION_CONFIG.maxMessageLength - header.length - 50;
      answer = answer.substring(0, maxAnswerLength) + "...\n\n_Message truncated. Ask a more specific question!_";
      fullMessage = header + answer;
    }

    // Send response
    await twilioClient.messages.create({
      body: fullMessage,
      from: twilioNumber,
      to: from,
    });

    // Save to history
    await supabaseAdmin.from("chat_messages").insert([
      {
        user_id: userData.id,
        project_id: userData.active_project_id,
        role: "user",
        text: messageBody,
        metadata: isVoiceMessage ? { source: "voice" } : null,
      },
      {
        user_id: userData.id,
        project_id: userData.active_project_id,
        role: "assistant",
        text: answer,
        metadata: { classification: queryType },
      },
    ]);

    return NextResponse.json({ 
      status: "sent", 
      classification: queryType,
      isVoiceMessage,
      contextMessagesUsed: conversationHistory.length,
    });

  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    
    try {
      const twilio = (await import("twilio")).default;
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );
      const formData = await req.formData();
      const body = Object.fromEntries(formData);
      
      await twilioClient.messages.create({
        body: MESSAGE_TEMPLATES.queryFailed(),
        from: body.To as string,
        to: body.From as string,
      });
    } catch (fallbackErr) {
      console.error("Fallback failed:", fallbackErr);
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ⭐ Task 24: Webhook verification for WhatsApp Business API
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // WhatsApp webhook verification
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ WhatsApp webhook verified");
    return new Response(challenge, { status: 200 });
  }

  // Health check
  return NextResponse.json({ 
    status: "ok", 
    service: "hf.bluebook WhatsApp Webhook",
    version: "2.0.0",
    features: [
      "conversation_context",
      "voice_transcription", 
      "quick_commands",
      "message_templates",
    ]
  });
}
