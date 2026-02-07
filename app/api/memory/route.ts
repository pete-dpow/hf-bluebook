import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET - Recall memories
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const memoryType = searchParams.get("type");

    let query = supabaseAdmin
      .from("chat_memory")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (orgId) {
      query = query.or(`org_id.eq.${orgId},org_id.is.null`);
    }

    if (memoryType && ["preference", "context", "term"].includes(memoryType)) {
      query = query.eq("memory_type", memoryType);
    }

    const { data: memories, error: fetchError } = await query;

    if (fetchError) {
      console.error("Fetch memories error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
    }

    const formattedMemories = {
      preferences: memories?.filter(m => m.memory_type === "preference") || [],
      context: memories?.filter(m => m.memory_type === "context") || [],
      terms: memories?.filter(m => m.memory_type === "term") || [],
      all: memories || [],
      count: memories?.length || 0,
    };

    return NextResponse.json({
      success: true,
      memories: formattedMemories,
    });
  } catch (err: any) {
    console.error("Recall memory error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST - Store/Update memory
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memoryType, memoryKey, memoryValue, orgId } = body;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!memoryType || !memoryKey || !memoryValue) {
      return NextResponse.json(
        { error: "Memory type, key, and value are required" },
        { status: 400 }
      );
    }

    if (!["preference", "context", "term"].includes(memoryType)) {
      return NextResponse.json(
        { error: "Invalid memory type. Must be: preference, context, or term" },
        { status: 400 }
      );
    }

    // Check if memory already exists (upsert logic)
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("chat_memory")
      .select("id")
      .eq("user_id", user.id)
      .eq("memory_type", memoryType)
      .eq("memory_key", memoryKey)
      .eq("org_id", orgId || null)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Check memory error:", checkError);
      return NextResponse.json({ error: "Failed to check existing memory" }, { status: 500 });
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await supabaseAdmin
        .from("chat_memory")
        .update({ 
          memory_value: memoryValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update memory error:", updateError);
        return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Memory updated successfully",
        id: existing.id,
      });
    } else {
      // Insert new
      const { data: newMemory, error: insertError } = await supabaseAdmin
        .from("chat_memory")
        .insert({
          user_id: user.id,
          org_id: orgId || null,
          memory_type: memoryType,
          memory_key: memoryKey,
          memory_value: memoryValue,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert memory error:", insertError);
        return NextResponse.json({ error: "Failed to store memory" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Memory stored successfully",
        id: newMemory.id,
      });
    }
  } catch (err: any) {
    console.error("Store memory error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE - Clear specific memory or all memories
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get("clearAll") === "true";
    const orgId = searchParams.get("orgId");

    if (clearAll) {
      // Clear all memories
      let query = supabaseAdmin
        .from("chat_memory")
        .delete()
        .eq("user_id", user.id);

      if (orgId) {
        query = query.eq("org_id", orgId);
      }

      const { error: deleteError, count } = await query;

      if (deleteError) {
        console.error("Delete all memories error:", deleteError);
        return NextResponse.json({ error: "Failed to clear all memories" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: orgId 
          ? "All memories for organization cleared successfully"
          : "All memories cleared successfully",
        deletedCount: count || 0,
      });
    } else {
      // Clear specific memory
      const body = await req.json();
      const { memoryId, memoryKey } = body;

      if (!memoryId && !memoryKey) {
        return NextResponse.json(
          { error: "Either memoryId or memoryKey is required" },
          { status: 400 }
        );
      }

      let query = supabaseAdmin
        .from("chat_memory")
        .delete()
        .eq("user_id", user.id);

      if (memoryId) {
        query = query.eq("id", memoryId);
      } else if (memoryKey) {
        query = query.eq("memory_key", memoryKey);
      }

      const { error: deleteError } = await query;

      if (deleteError) {
        console.error("Delete memory error:", deleteError);
        return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Memory cleared successfully",
      });
    }
  } catch (err: any) {
    console.error("Clear memory error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
