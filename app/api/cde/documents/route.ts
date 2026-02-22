// GET /api/cde/documents — List documents with filter params

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_SORT_COLUMNS = ["doc_number", "title", "doc_type", "status", "uploaded_at", "revision", "building", "discipline"];

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const projectId = url.searchParams.get("projectId");
  const docType = url.searchParams.get("docType");
  const status = url.searchParams.get("status");
  const discipline = url.searchParams.get("discipline");
  const building = url.searchParams.get("building");
  const search = url.searchParams.get("search");
  const rawPage = parseInt(url.searchParams.get("page") || "1");
  const rawLimit = parseInt(url.searchParams.get("limit") || "50");
  const sortByParam = url.searchParams.get("sortBy") || "uploaded_at";
  const sortDir = url.searchParams.get("sortDir") || "desc";

  // Validate pagination bounds
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);

  // Whitelist sortBy to prevent injection
  const sortBy = ALLOWED_SORT_COLUMNS.includes(sortByParam) ? sortByParam : "uploaded_at";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("cde_documents")
    .select("*", { count: "exact" })
    .eq("project_id", projectId);

  if (docType) query = query.eq("doc_type", docType);
  if (status) query = query.eq("status", status);
  if (discipline) query = query.eq("discipline", discipline);
  if (building) query = query.eq("building", building);
  if (search) {
    // Sanitize search input — escape PostgREST special chars
    const sanitized = search.replace(/[%_\\]/g, "\\$&");
    query = query.or(`doc_number.ilike.%${sanitized}%,title.ilike.%${sanitized}%`);
  }

  // Sort
  const ascending = sortDir === "asc";
  query = query.order(sortBy, { ascending });

  // Pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    documents: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
