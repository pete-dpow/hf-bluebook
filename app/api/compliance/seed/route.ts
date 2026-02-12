import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SEED_REGULATIONS = [
  // Legislation (3)
  {
    name: "Building Safety Act 2022",
    reference: "BSA 2022",
    category: "legislation",
    description: "Primary legislation establishing the Building Safety Regulator and higher-risk building regime. Sections 88/91 mandate Golden Thread digital record-keeping for all fire safety information.",
    source_url: "https://www.legislation.gov.uk/ukpga/2022/30/contents/enacted",
    pillar_tags: ["fire_doors", "dampers", "fire_stopping", "retro_fire_stopping", "auro_lume"],
    status: "in_force",
    effective_date: "2022-04-28",
  },
  {
    name: "Fire Safety (England) Regulations 2022",
    reference: "SI 2022/547",
    category: "legislation",
    description: "Implements Grenfell Phase 1 recommendations. Requires responsible persons to share fire safety information with residents, provide wayfinding signage, and check flat entrance doors in buildings 11m+.",
    source_url: "https://www.legislation.gov.uk/uksi/2022/547/contents/made",
    pillar_tags: ["fire_doors", "fire_stopping", "auro_lume"],
    status: "in_force",
    effective_date: "2023-01-23",
  },
  {
    name: "Regulatory Reform (Fire Safety) Order 2005",
    reference: "RRO 2005",
    category: "legislation",
    description: "The foundational fire safety law for non-domestic premises in England and Wales. Requires fire risk assessments by the responsible person and compliance with general fire precautions.",
    source_url: "https://www.legislation.gov.uk/uksi/2005/1541/contents/made",
    pillar_tags: ["fire_doors", "dampers", "fire_stopping", "auro_lume"],
    status: "in_force",
    effective_date: "2006-10-01",
  },

  // Approved Documents (2)
  {
    name: "Approved Document B: Fire Safety (Volumes 1 & 2)",
    reference: "AD B Vols 1&2",
    category: "approved_document",
    description: "Statutory guidance for fire safety in building design. Volume 1 covers dwellings, Volume 2 covers non-dwellings. Specifies fire resistance periods, compartmentation, means of escape, and access for fire services.",
    source_url: "https://www.gov.uk/government/publications/fire-safety-approved-document-b",
    pillar_tags: ["fire_doors", "dampers", "fire_stopping"],
    status: "in_force",
    effective_date: "2019-11-01",
  },
  {
    name: "Approved Document B: Regulation 7 — Materials and Workmanship",
    reference: "AD B Reg 7",
    category: "approved_document",
    description: "Ban on combustible materials in external walls of buildings 18m+ in height. Requires materials to achieve European Classification A2-s1,d0 or better.",
    source_url: "https://www.gov.uk/government/publications/fire-safety-approved-document-b",
    pillar_tags: ["fire_stopping"],
    status: "in_force",
    effective_date: "2018-12-21",
  },

  // British Standards (4)
  {
    name: "BS 9999: Fire Safety in the Design, Management and Use of Buildings",
    reference: "BS 9999:2017",
    category: "british_standard",
    description: "Code of practice for fire safety design covering risk assessment, means of escape, structural fire protection, fire detection systems, and management procedures.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-9999/",
    pillar_tags: ["fire_doors", "dampers", "fire_stopping", "auro_lume"],
    status: "in_force",
    effective_date: "2017-01-01",
  },
  {
    name: "BS 9991: Fire Safety in the Design, Management and Use of Residential Buildings",
    reference: "BS 9991:2015",
    category: "british_standard",
    description: "Code of practice specifically for residential buildings. Covers stay-put strategy, simultaneous evacuation, personal emergency evacuation plans, and flat entrance fire door requirements.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-9991/",
    pillar_tags: ["fire_doors", "fire_stopping", "auro_lume"],
    status: "in_force",
    effective_date: "2015-01-01",
  },
  {
    name: "BS 476: Fire Tests on Building Materials and Structures (Parts 20-24)",
    reference: "BS 476-20/24",
    category: "british_standard",
    description: "British standard fire test methods. Part 20: general principles, Part 22: non-loadbearing elements, Part 23: contribution of components to fire resistance, Part 24: ventilation ducts. The primary UK fire test regime for passive fire protection products.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-476/",
    pillar_tags: ["fire_doors", "dampers", "fire_stopping"],
    status: "in_force",
    effective_date: "1987-01-01",
  },
  {
    name: "BS 8214: Timber-based Fire Door Assemblies",
    reference: "BS 8214:2016",
    category: "british_standard",
    description: "Code of practice for the specification, design, manufacture, installation, maintenance and inspection of timber-based fire door assemblies. Covers FD30 and FD60 door sets.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-8214/",
    pillar_tags: ["fire_doors"],
    status: "in_force",
    effective_date: "2016-01-01",
  },

  // European Standards (3)
  {
    name: "BS EN 1366-3: Fire Resistance Tests for Service Installations — Penetration Seals",
    reference: "BS EN 1366-3:2009",
    category: "european_standard",
    description: "European test standard for fire resistance of penetration seals. Tests firestop products used around pipes, cables, and ducts passing through fire-rated walls and floors.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-en-1366-3/",
    pillar_tags: ["fire_stopping"],
    status: "in_force",
    effective_date: "2009-01-01",
  },
  {
    name: "BS EN 1366-2: Fire Resistance Tests for Service Installations — Fire Dampers",
    reference: "BS EN 1366-2:2015",
    category: "european_standard",
    description: "European test standard for fire resistance of fire dampers in ventilation systems. Tests damper performance under fire conditions including integrity and insulation criteria.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-en-1366-2/",
    pillar_tags: ["dampers"],
    status: "in_force",
    effective_date: "2015-01-01",
  },
  {
    name: "BS EN 15650: Ventilation for Buildings — Fire Dampers",
    reference: "BS EN 15650:2010",
    category: "european_standard",
    description: "Product standard for fire dampers used in ventilation systems. Specifies classification, performance requirements, marking and labelling for CE marking purposes.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-en-15650/",
    pillar_tags: ["dampers"],
    status: "in_force",
    effective_date: "2010-01-01",
  },

  // Industry Guidance (2)
  {
    name: "ASFP Technical Guidance Document 19: Fire Stopping",
    reference: "ASFP TGD 19",
    category: "industry_guidance",
    description: "Industry best practice guidance from the Association for Specialist Fire Protection. Covers selection, installation, and inspection of firestopping products including penetration seals, linear joint seals, and cavity barriers.",
    source_url: "https://asfp.org.uk/technical-guidance/",
    pillar_tags: ["fire_stopping", "retro_fire_stopping"],
    status: "in_force",
    effective_date: "2019-01-01",
  },
  {
    name: "BS 5499-4: Safety Signs — Code of Practice for Escape Route Signing",
    reference: "BS 5499-4:2013",
    category: "industry_guidance",
    description: "Code of practice for the design and use of photoluminescent escape route signs. Covers sign placement, luminance requirements, and maintenance for emergency wayfinding systems.",
    source_url: "https://www.bsigroup.com/en-GB/standards/bs-5499-4/",
    pillar_tags: ["auro_lume"],
    status: "in_force",
    effective_date: "2013-01-01",
  },
];

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Check if already seeded (avoid duplicates)
  const { count } = await supabaseAdmin
    .from("regulations")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organizationId);

  if (count && count >= 14) {
    return NextResponse.json({ message: "Already seeded", count }, { status: 200 });
  }

  let created = 0;
  const errors: string[] = [];

  for (const reg of SEED_REGULATIONS) {
    // Skip if this reference already exists for the org
    const { data: existing } = await supabaseAdmin
      .from("regulations")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .eq("reference", reg.reference)
      .single();

    if (existing) continue;

    const { error } = await supabaseAdmin
      .from("regulations")
      .insert({
        ...reg,
        organization_id: auth.organizationId,
      });

    if (error) {
      errors.push(`${reg.reference}: ${error.message}`);
    } else {
      created++;
    }
  }

  return NextResponse.json({ created, errors: errors.length > 0 ? errors : undefined }, { status: 201 });
}
