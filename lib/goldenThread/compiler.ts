/**
 * Golden Thread Compiler — aggregates project data into a structured BSA-compliant package.
 * Collects quotes, products, regulations, certificates, and audit trail for a project.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface CompiledProduct {
  product_id: string;
  product_name: string;
  product_code: string;
  pillar: string;
  manufacturer_name: string;
  specifications: Record<string, any>;
  certifications: string[];
  regulations: {
    regulation_id: string;
    name: string;
    reference: string;
    category: string;
    compliance_notes: string | null;
    test_evidence_ref: string | null;
  }[];
  files: {
    file_id: string;
    file_name: string;
    file_type: string;
    file_url: string | null;
  }[];
}

export interface CompiledQuote {
  quote_id: string;
  quote_number: string;
  client_name: string;
  project_name: string | null;
  status: string;
  total: number;
  created_at: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product_id: string | null;
    product_code: string | null;
  }[];
}

export interface GoldenThreadData {
  package_reference: string;
  project: {
    id: string;
    name: string;
    organization_id: string;
    building_reference: string | null;
  };
  quotes: CompiledQuote[];
  products: CompiledProduct[];
  regulations_summary: {
    regulation_id: string;
    name: string;
    reference: string;
    category: string;
    products_count: number;
  }[];
  audit_trail: {
    action: string;
    performed_by: string;
    performed_at: string;
    details: Record<string, any>;
  }[];
  compiled_at: string;
  metadata: {
    total_products: number;
    total_quotes: number;
    total_regulations: number;
    total_files: number;
  };
}

/**
 * Compile all project data into a Golden Thread package.
 */
export async function compileGoldenThreadData(
  projectId: string,
  organizationId: string,
  packageReference: string,
  buildingReference?: string
): Promise<GoldenThreadData> {
  // 1. Get project info
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found");

  // 2. Get all quotes for this project
  const { data: quotes } = await supabaseAdmin
    .from("quotes")
    .select("*, quote_line_items(*)")
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const compiledQuotes: CompiledQuote[] = (quotes || []).map((q) => ({
    quote_id: q.id,
    quote_number: q.quote_number,
    client_name: q.client_name,
    project_name: q.project_name,
    status: q.status,
    total: q.total || 0,
    created_at: q.created_at,
    line_items: (q.quote_line_items || []).map((li: any) => ({
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      line_total: li.line_total,
      product_id: li.product_id,
      product_code: li.product_code,
    })),
  }));

  // 3. Collect unique product IDs from all quotes
  const productIds = Array.from(
    new Set(
      compiledQuotes
        .flatMap((q) => q.line_items)
        .map((li) => li.product_id)
        .filter(Boolean) as string[]
    )
  );

  // 4. Get full product details with regulations and files
  const compiledProducts: CompiledProduct[] = [];

  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("*, manufacturers(name), product_regulations(*, regulations(id, name, reference, category)), product_files(*)")
      .in("id", productIds);

    for (const p of products || []) {
      compiledProducts.push({
        product_id: p.id,
        product_name: p.product_name,
        product_code: p.product_code || "",
        pillar: p.pillar,
        manufacturer_name: (p as any).manufacturers?.name || "",
        specifications: p.specifications || {},
        certifications: p.certifications || [],
        regulations: ((p as any).product_regulations || []).map((pr: any) => ({
          regulation_id: pr.regulation_id,
          name: pr.regulations?.name || "",
          reference: pr.regulations?.reference || "",
          category: pr.regulations?.category || "",
          compliance_notes: pr.compliance_notes,
          test_evidence_ref: pr.test_evidence_ref,
        })),
        files: ((p as any).product_files || []).map((f: any) => ({
          file_id: f.id,
          file_name: f.file_name,
          file_type: f.file_type,
          file_url: f.file_url,
        })),
      });
    }
  }

  // 5. Build regulations summary (deduplicated across all products)
  const regulationMap = new Map<string, { name: string; reference: string; category: string; products_count: number }>();
  for (const product of compiledProducts) {
    for (const reg of product.regulations) {
      const existing = regulationMap.get(reg.regulation_id);
      if (existing) {
        existing.products_count++;
      } else {
        regulationMap.set(reg.regulation_id, {
          name: reg.name,
          reference: reg.reference,
          category: reg.category,
          products_count: 1,
        });
      }
    }
  }

  const regulationsSummary = Array.from(regulationMap.entries()).map(([id, r]) => ({
    regulation_id: id,
    ...r,
  }));

  // 6. Get existing audit trail for any GT packages on this project
  const { data: existingPackages } = await supabaseAdmin
    .from("golden_thread_packages")
    .select("id")
    .eq("project_id", projectId);

  let auditTrail: GoldenThreadData["audit_trail"] = [];
  if (existingPackages && existingPackages.length > 0) {
    const packageIds = existingPackages.map((p) => p.id);
    const { data: audits } = await supabaseAdmin
      .from("golden_thread_audit")
      .select("action, performed_by, performed_at, details")
      .in("package_id", packageIds)
      .order("performed_at", { ascending: true });

    auditTrail = (audits || []).map((a) => ({
      action: a.action,
      performed_by: a.performed_by,
      performed_at: a.performed_at,
      details: a.details || {},
    }));
  }

  const totalFiles = compiledProducts.reduce((sum, p) => sum + p.files.length, 0);

  return {
    package_reference: packageReference,
    project: {
      id: project.id,
      name: project.name,
      organization_id: project.organization_id,
      building_reference: buildingReference || null,
    },
    quotes: compiledQuotes,
    products: compiledProducts,
    regulations_summary: regulationsSummary,
    audit_trail: auditTrail,
    compiled_at: new Date().toISOString(),
    metadata: {
      total_products: compiledProducts.length,
      total_quotes: compiledQuotes.length,
      total_regulations: regulationsSummary.length,
      total_files: totalFiles,
    },
  };
}
