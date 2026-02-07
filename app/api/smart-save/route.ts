import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    console.log("📩 [SmartSave] API called");
    const body = await req.json();
    const { fileData, fileName, messages, userId } = body || {};
    console.log("📦 Received keys:", Object.keys(body || {}));

    if (!fileData) {
      console.error("🚫 No dataset found in request.");
      return NextResponse.json({ error: "No dataset received." }, { status: 400 });
    }

    console.log("👤 User ID:", userId || "freemium");

    // Get user's active organization if authenticated
    let organizationId: string | null = null;
    
    if (userId) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("active_organization_id")
        .eq("id", userId)
        .single();

      organizationId = userData?.active_organization_id || null;

      // 🆕 IF USER HAS NO ACTIVE ORG, CREATE ONE
      if (!organizationId) {
        console.log("🏗️ No active org found, creating Personal org for user...");
        
        // Check if user already has a Personal org
        const { data: existingOrg } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("owner_id", userId)
          .eq("name", "Personal")
          .single();

        if (existingOrg) {
          // Use existing Personal org
          organizationId = existingOrg.id;
          console.log("✅ Found existing Personal org:", organizationId);
        } else {
          // Create new Personal org
          const { data: newOrg, error: orgError } = await supabaseAdmin
            .from("organizations")
            .insert([{
              name: "Personal",
              owner_id: userId,
            }])
            .select("id")
            .single();

          if (orgError) {
            console.error("❌ Failed to create Personal org:", orgError);
            throw new Error("Failed to create organization");
          }

          organizationId = newOrg.id;
          console.log("✅ Created new Personal org:", organizationId);

          // Add user as admin member
          const { error: memberError } = await supabaseAdmin
            .from("organization_members")
            .insert([{
              organization_id: organizationId,
              user_id: userId,
              role: "admin",
            }]);

          if (memberError) {
            console.warn("⚠️ Failed to add user as org member:", memberError);
          }
        }

        // Set as active organization
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({ active_organization_id: organizationId })
          .eq("id", userId);

        if (updateError) {
          console.warn("⚠️ Failed to set active org:", updateError);
        } else {
          console.log("✅ Set active_organization_id to:", organizationId);
        }
      }

      console.log("🏢 Active organization:", organizationId || "Personal");
    }

    // 1️⃣ Prepare metadata
    const baseName =
      typeof fileName === "string" && fileName.trim()
        ? fileName.replace(/\.[^/.]+$/, "")
        : `Freemium_${new Date().toISOString().slice(0, 10)}`;

    const totalRows =
      typeof fileData.totalRows === "number"
        ? fileData.totalRows
        : Array.isArray(fileData.rows)
        ? fileData.rows.length
        : 0;

    console.log("📊 Dataset:", baseName, "Rows:", totalRows);

    // 2️⃣ Create project with organization_id and created_by (using supabaseAdmin to bypass RLS)
    const projectInsert = await supabaseAdmin
      .from("projects")
      .insert([
        {
          name: baseName,
          description: `Smart Save on ${new Date().toLocaleString()}`,
          user_id: userId || null,
          organization_id: organizationId,
          created_by: userId || null,
        },
      ])
      .select("id")
      .single();

    if (projectInsert.error) {
      console.error("❌ projects insert error:", projectInsert.error);
      throw new Error(projectInsert.error.message);
    }

    const projectId = projectInsert.data?.id;
    console.log("✅ Project created with ID:", projectId);

    // 3️⃣ Insert dataset with organization_id (using supabaseAdmin)
    const datasetInsert = await supabaseAdmin
      .from("excel_datasets")
      .insert([
        {
          project_id: projectId,
          file_name: fileName || `${baseName}.xlsx`,
          total_rows: totalRows,
          data: fileData,
          organization_id: organizationId,
        },
      ])
      .select("id")
      .single();

    if (datasetInsert.error) {
      console.error("❌ excel_datasets insert error:", datasetInsert.error);
      throw new Error(datasetInsert.error.message);
    }

    const datasetId = datasetInsert.data?.id;
    console.log("✅ Dataset inserted with ID:", datasetId);

    // 4️⃣ Insert chat messages with organization_id (using supabaseAdmin)
    if (Array.isArray(messages) && messages.length > 0) {
      const chatRows = messages.map((m) => ({
        project_id: projectId,
        dataset_id: datasetId,
        user_id: userId || null,
        role: m.role,
        text: m.content,
        timestamp: new Date().toISOString(),
        organization_id: organizationId,
      }));

      const chatInsert = await supabaseAdmin.from("chat_messages").insert(chatRows);
      if (chatInsert.error) {
        console.warn("⚠️ chat insert warning:", chatInsert.error);
      } else {
        console.log("✅ Chat messages inserted:", chatRows.length);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `✅ Project '${baseName}' saved successfully.`,
      projectId,
      datasetId,
      organizationId,
    });
  } catch (err: any) {
    console.error("❌ [SmartSave] Fatal error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save project." },
      { status: 500 }
    );
  }
}
