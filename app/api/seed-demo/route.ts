// POST /api/seed-demo — Seed comprehensive demo data for stakeholder presentation
// Creates: manufacturers, products (all 5 pillars), quotes with line items, regulations

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// ─── MANUFACTURERS ───────────────────────────────────────────
const MANUFACTURERS = [
  { name: "Quelfire", website_url: "https://quelfire.co.uk", contact_email: "info@quelfire.co.uk", trade_discount_percent: 35, pillar: "fire_stopping" },
  { name: "Lorient", website_url: "https://www.lorientuk.com", contact_email: "sales@lorientuk.com", trade_discount_percent: 30, pillar: "fire_doors" },
  { name: "Hilti", website_url: "https://www.hilti.co.uk", contact_email: "firestop@hilti.com", trade_discount_percent: 25, pillar: "fire_stopping" },
  { name: "Rockwool", website_url: "https://www.rockwool.com/uk", contact_email: "info@rockwool.co.uk", trade_discount_percent: 20, pillar: "fire_stopping" },
  { name: "Promat (Etex)", website_url: "https://www.promat.com/en-gb", contact_email: "info@promat.co.uk", trade_discount_percent: 28, pillar: "fire_stopping" },
  { name: "Ruskin Air Management", website_url: "https://www.ruskinuk.co.uk", contact_email: "sales@ruskinuk.co.uk", trade_discount_percent: 22, pillar: "dampers" },
  { name: "Swegon (Actionair)", website_url: "https://www.swegon.com/uk", contact_email: "uk@swegon.com", trade_discount_percent: 25, pillar: "dampers" },
  { name: "Norseal", website_url: "https://www.norseal.co.uk", contact_email: "sales@norseal.co.uk", trade_discount_percent: 30, pillar: "fire_doors" },
  { name: "Jalite", website_url: "https://www.jalite.com", contact_email: "sales@jalite.com", trade_discount_percent: 35, pillar: "auro_lume" },
  { name: "Siderise", website_url: "https://www.siderise.com", contact_email: "info@siderise.com", trade_discount_percent: 20, pillar: "retro_fire_stopping" },
];

// ─── PRODUCTS ────────────────────────────────────────────────
function products(mfrMap: Record<string, string>) {
  return [
    // ── Fire Doors (Lorient, Norseal) ──
    { manufacturer_id: mfrMap["Lorient"], pillar: "fire_doors", product_code: "LOR-IS8030", product_name: "IS8030si Intumescent Strip + Smoke Seal", description: "Combined intumescent and smoke seal for FD30 and FD60 fire doors. 15x4mm strip with fin-type smoke seal. Certified to BS 476-22 and BS EN 1634-1.", list_price: 8.50, trade_price: 5.95, sell_price: 12.75, unit: "metre", lead_time_days: 3, status: "active", specifications: { fire_rating: "FD60", leaf_material: "N/A – Seal accessory", leaf_thickness_mm: "4", certification_body: "Warringtonfire", test_standard: "BS EN 1634-1", smoke_seal_type: "Fin type", intumescent_strip_type: "Graphite based" } },
    { manufacturer_id: mfrMap["Lorient"], pillar: "fire_doors", product_code: "LOR-LAS5001", product_name: "LAS5001 Automatic Door Bottom Seal", description: "Surface-mounted automatic drop seal for the base of fire doors. Activates on door closing. BS EN 1634-1 tested for smoke and fire integrity.", list_price: 42.00, trade_price: 29.40, sell_price: 54.60, unit: "each", lead_time_days: 5, status: "active", specifications: { fire_rating: "FD60", leaf_material: "Aluminium housing", leaf_thickness_mm: "12.5", certification_body: "BM TRADA", test_standard: "BS EN 1634-1", smoke_seal_type: "Drop seal", intumescent_strip_type: "N/A" } },
    { manufacturer_id: mfrMap["Norseal"], pillar: "fire_doors", product_code: "NOR-FG100", product_name: "Fireglass 100 Fire Rated Glazing Kit", description: "Intumescent glazing system for fire door vision panels. 100x100mm through to 450x1200mm apertures. Clear appearance with 60-minute fire integrity.", list_price: 125.00, trade_price: 87.50, sell_price: 162.50, unit: "each", lead_time_days: 7, status: "active", specifications: { fire_rating: "FD60", leaf_material: "Intumescent glazing compound", leaf_thickness_mm: "22", glass_type: "Borosilicate", certification_body: "Warringtonfire", test_standard: "BS 476-22", max_leaf_size: "450 x 1200mm" } },
    { manufacturer_id: mfrMap["Norseal"], pillar: "fire_doors", product_code: "NOR-FDH-SS", product_name: "Fire Door Hardware Pack — Satin Stainless", description: "Complete fire door ironmongery set: 3x Grade 13 hinges, tubular latch, lever handles. CE marked. Meets BS EN 1935 and BS EN 1906.", list_price: 78.00, trade_price: 54.60, sell_price: 101.40, unit: "each", lead_time_days: 3, status: "active", specifications: { fire_rating: "FD60", leaf_material: "Stainless steel 304", certification_body: "BSI", test_standard: "BS EN 1935 / BS EN 1906", ironmongery_compatibility: "All standard FD30/FD60 doorsets" } },

    // ── Dampers (Ruskin, Swegon) ──
    { manufacturer_id: mfrMap["Ruskin Air Management"], pillar: "dampers", product_code: "RUS-FD60-R", product_name: "FD60 Rectangular Fire Damper", description: "Intumescent fire damper for rectangular ductwork. Curtain-type blade, 60-minute rating. Tested to BS EN 15650. 72°C thermal release.", list_price: 185.00, trade_price: 144.30, sell_price: 240.50, unit: "each", lead_time_days: 10, status: "active", specifications: { fire_rating: "EI 60", damper_type: "Intumescent curtain", blade_material: "Intumescent material", actuator_type: "Thermal release", duct_size_range: "100x100 to 1200x800mm", orientation: "Horizontal or vertical", test_standard: "BS EN 15650", reset_type: "Manual", fusible_link_temp_c: "72" } },
    { manufacturer_id: mfrMap["Ruskin Air Management"], pillar: "dampers", product_code: "RUS-FD60-C", product_name: "FD60 Circular Fire Damper", description: "Intumescent circular fire damper. 100-630mm duct diameter range. 60-minute fire rating. Spigot connections for spiral ductwork.", list_price: 145.00, trade_price: 113.10, sell_price: 188.50, unit: "each", lead_time_days: 10, status: "active", specifications: { fire_rating: "EI 60", damper_type: "Intumescent curtain", blade_material: "Intumescent material", actuator_type: "Thermal release", duct_size_range: "100-630mm diameter", orientation: "Horizontal or vertical", test_standard: "BS EN 15650", fusible_link_temp_c: "72" } },
    { manufacturer_id: mfrMap["Swegon (Actionair)"], pillar: "dampers", product_code: "SWE-FDMC-120", product_name: "FDMC Motorised Fire/Smoke Damper EI120", description: "Combined fire and smoke damper with spring-return actuator. 120-minute fire integrity. BMS integration via 0-10V or Modbus. Tested to BS EN 15650 + BS EN 13501-3.", list_price: 420.00, trade_price: 315.00, sell_price: 546.00, unit: "each", lead_time_days: 14, status: "active", specifications: { fire_rating: "EI 120 S", damper_type: "Multi-blade", blade_material: "Galvanised steel", actuator_type: "Spring-return 24V", duct_size_range: "200x200 to 1500x1000mm", orientation: "Horizontal or vertical", test_standard: "BS EN 15650 / BS EN 13501-3", reset_type: "Automatic (spring-return)" } },

    // ── Fire Stopping (Quelfire, Hilti, Rockwool, Promat) ──
    { manufacturer_id: mfrMap["Quelfire"], pillar: "fire_stopping", product_code: "QF-QCM-120", product_name: "QuelCoat Magma 120 Intumescent Coating", description: "High-performance intumescent coating for structural steel. Provides up to 120 minutes fire protection. Water-based, single component. Tested to BS 476-20/21.", list_price: 45.00, trade_price: 29.25, sell_price: 58.50, unit: "kg", lead_time_days: 5, status: "active", specifications: { fire_rating: "120 minutes", penetration_type: "Structural steel", service_type: "Steel beams / columns", pipe_material: "N/A", test_standard: "BS 476-20/21", seal_depth_mm: "Varies by section factor", installation_method: "Spray or brush" } },
    { manufacturer_id: mfrMap["Quelfire"], pillar: "fire_stopping", product_code: "QF-QS-COLLAR", product_name: "QuelStop Fire Collar", description: "Intumescent pipe collar for plastic pipes penetrating fire-rated walls/floors. 2 and 4 hour ratings. Stainless steel casing. 32-315mm pipe range.", list_price: 24.50, trade_price: 15.93, sell_price: 31.85, unit: "each", lead_time_days: 3, status: "active", specifications: { fire_rating: "240 minutes", penetration_type: "Service penetration", service_type: "Plastic pipework", pipe_material: "uPVC, PP, PE, ABS", pipe_diameter_range_mm: "32-315", wall_floor_type: "Masonry / concrete", test_standard: "BS EN 1366-3", annular_gap_mm: "0-50" } },
    { manufacturer_id: mfrMap["Hilti"], pillar: "fire_stopping", product_code: "HLT-CP672", product_name: "Hilti CP 672 Firestop Mortar", description: "Dry mix fire-resistant mortar for large openings and cable/pipe transits. 4-hour fire rating. Non-combustible to EN 13501-1 Class A1.", list_price: 32.00, trade_price: 24.00, sell_price: 41.60, unit: "bag (20kg)", lead_time_days: 5, status: "active", specifications: { fire_rating: "240 minutes", penetration_type: "Large openings / mixed services", service_type: "Cables, pipes, mixed", pipe_material: "All types", test_standard: "BS EN 1366-3 / EAD 350454-00-1104", seal_depth_mm: "100-300", movement_capability_mm: "0", installation_method: "Trowel applied" } },
    { manufacturer_id: mfrMap["Hilti"], pillar: "fire_stopping", product_code: "HLT-CFS-BL", product_name: "Hilti CFS-BL Firestop Block", description: "Intumescent firestop block for cable transits. Push-fit installation for fast sealing. Removable and re-enterable. Tested to 120 minutes.", list_price: 18.50, trade_price: 13.88, sell_price: 24.05, unit: "each", lead_time_days: 3, status: "active", specifications: { fire_rating: "120 minutes", penetration_type: "Cable transit", service_type: "Cables", test_standard: "BS EN 1366-3", seal_depth_mm: "200", movement_capability_mm: "0", installation_method: "Push-fit" } },
    { manufacturer_id: mfrMap["Rockwool"], pillar: "fire_stopping", product_code: "RW-SP60", product_name: "Rockwool SP60 Fire Barrier", description: "Stone wool fire barrier slab for curtain wall and compartment line sealing. Non-combustible. 60-minute fire integrity. Density 60kg/m³.", list_price: 28.00, trade_price: 22.40, sell_price: 36.40, unit: "m²", lead_time_days: 7, status: "active", specifications: { fire_rating: "60 minutes", penetration_type: "Linear gap / cavity barrier", service_type: "Curtain wall perimeter", test_standard: "BS EN 1366-4", seal_depth_mm: "100", movement_capability_mm: "25", installation_method: "Friction fit + retaining clips" } },
    { manufacturer_id: mfrMap["Promat (Etex)"], pillar: "fire_stopping", product_code: "PRO-BOARD-H", product_name: "PROMAT PROMASEAL Board H", description: "High-performance calcium silicate board for fire compartmentation and protection of structural steelwork. A1 non-combustible. 2/4 hour ratings.", list_price: 65.00, trade_price: 46.80, sell_price: 84.50, unit: "sheet (2400x1200)", lead_time_days: 10, status: "active", specifications: { fire_rating: "240 minutes", penetration_type: "Encasement / partition", service_type: "Structural steel / compartmentation", test_standard: "BS EN 13501-2", seal_depth_mm: "Various (25-60mm)", installation_method: "Screw fixed" } },

    // ── Retro Fire Stopping (Siderise, Quelfire) ──
    { manufacturer_id: mfrMap["Siderise"], pillar: "retro_fire_stopping", product_code: "SID-CW-RFS", product_name: "Siderise CW Retrofit Cavity Barrier", description: "Retrofit intumescent cavity barrier for curtain wall spandrel zones. Installs from inside without cladding removal. Tested to BS EN 1366-4.", list_price: 35.00, trade_price: 28.00, sell_price: 45.50, unit: "metre", lead_time_days: 14, status: "active", specifications: { fire_rating: "60 minutes", application_type: "Curtain wall perimeter", substrate_compatibility: "Aluminium, steel, concrete", cavity_width_range_mm: "25-200", test_standard: "BS EN 1366-4", installation_method: "Internal retrofit – no cladding removal", accessibility: "From internal side only" } },
    { manufacturer_id: mfrMap["Siderise"], pillar: "retro_fire_stopping", product_code: "SID-RS-120", product_name: "Siderise Riser Shaft Fire Barrier", description: "Intumescent riser shaft barrier for vertical service penetrations. Retrofit installation. 120-minute fire integrity. Tested for pipe and cable transits.", list_price: 52.00, trade_price: 41.60, sell_price: 67.60, unit: "m²", lead_time_days: 10, status: "active", specifications: { fire_rating: "120 minutes", application_type: "Riser shaft", substrate_compatibility: "Concrete, masonry, steel", cavity_width_range_mm: "50-600", linear_gap_seal_type: "Intumescent mat", test_standard: "BS EN 1366-3", installation_method: "Mechanical fix + intumescent seal" } },
    { manufacturer_id: mfrMap["Quelfire"], pillar: "retro_fire_stopping", product_code: "QF-QWR-WRAP", product_name: "QuelWrap Pipe Fire Wrap", description: "Intumescent pipe wrap for retrofit fire sealing of plastic pipes. Quick installation – no collar needed. Adhesive-backed. 30-120 min ratings.", list_price: 12.00, trade_price: 7.80, sell_price: 15.60, unit: "each", lead_time_days: 3, status: "active", specifications: { fire_rating: "120 minutes", application_type: "Pipe penetration retrofit", substrate_compatibility: "Masonry, concrete, plasterboard", cavity_width_range_mm: "N/A", test_standard: "BS EN 1366-3", installation_method: "Adhesive wrap", accessibility: "Any accessible face" } },

    // ── Auro Lume / Photoluminescent (Jalite) ──
    { manufacturer_id: mfrMap["Jalite"], pillar: "auro_lume", product_code: "JAL-430A", product_name: "Jalite 430A Fire Exit Sign — Arrow Left", description: "ISO 7010 photoluminescent fire exit sign with left directional arrow. Class C per ISO 17398. 1.7 mcd/m² after 10 min. Rigid PVC.", list_price: 14.50, trade_price: 9.43, sell_price: 18.85, unit: "each", lead_time_days: 3, status: "active", specifications: { luminance_mcd_m2: "1700", duration_minutes: "3000", material: "Rigid PVC", mounting_type: "Wall mount / suspended", sign_type: "Escape route directional", bs_standard: "BS 5499-4 / ISO 7010", photoluminescent_class: "C", excitation_time_minutes: "15" } },
    { manufacturer_id: mfrMap["Jalite"], pillar: "auro_lume", product_code: "JAL-440K", product_name: "Jalite 440K Fire Action Notice", description: "Photoluminescent fire action notice sign. BS 5499-1 compliant. Pre-printed with standard fire action instructions. 300x200mm.", list_price: 9.50, trade_price: 6.18, sell_price: 12.35, unit: "each", lead_time_days: 3, status: "active", specifications: { luminance_mcd_m2: "1700", duration_minutes: "3000", material: "Rigid PVC", mounting_type: "Wall mount", sign_type: "Fire action notice", bs_standard: "BS 5499-1", photoluminescent_class: "C", excitation_time_minutes: "15" } },
    { manufacturer_id: mfrMap["Jalite"], pillar: "auro_lume", product_code: "JAL-LLL-STRIP", product_name: "Jalite Low Level Guidance Strip", description: "Self-adhesive photoluminescent guidance strip for low-level escape route marking. 50mm wide. ISO 16069 compliant. Sold per metre.", list_price: 6.50, trade_price: 4.23, sell_price: 8.45, unit: "metre", lead_time_days: 3, status: "active", specifications: { luminance_mcd_m2: "2200", duration_minutes: "3000", material: "Self-adhesive PVC", mounting_type: "Floor / skirting", sign_type: "Low-level guidance", bs_standard: "ISO 16069 / BS 5266-1", photoluminescent_class: "C", excitation_time_minutes: "15" } },
  ];
}

// ─── REGULATIONS ─────────────────────────────────────────────
const REGULATIONS = [
  { name: "Building Safety Act 2022", reference: "BSA 2022", category: "legislation", description: "The Building Safety Act 2022 establishes a new regulatory framework for building safety in England, creating the Building Safety Regulator and introducing the golden thread of information.", source_url: "https://www.legislation.gov.uk/ukpga/2022/30/contents", pillar_tags: ["fire_doors","dampers","fire_stopping","retro_fire_stopping","auro_lume"], status: "in_force", effective_date: "2022-04-28" },
  { name: "Regulatory Reform (Fire Safety) Order 2005", reference: "FSO 2005", category: "legislation", description: "Primary fire safety legislation for non-domestic premises in England and Wales. Places duties on the responsible person to carry out fire risk assessments.", source_url: "https://www.legislation.gov.uk/uksi/2005/1541/contents", pillar_tags: ["fire_doors","dampers","fire_stopping","auro_lume"], status: "in_force", effective_date: "2005-10-01" },
  { name: "Approved Document B: Fire Safety — Volume 1 (Dwellings)", reference: "ADB Vol 1", category: "approved_document", description: "Statutory guidance for meeting Building Regulations fire safety requirements for dwelling houses, flats and maisonettes. Covers means of warning, escape, internal fire spread, external fire spread, and access for fire services.", source_url: "https://www.gov.uk/government/publications/fire-safety-approved-document-b", pillar_tags: ["fire_doors","dampers","fire_stopping","auro_lume"], status: "in_force", effective_date: "2019-11-01" },
  { name: "Approved Document B: Fire Safety — Volume 2 (Non-Dwellings)", reference: "ADB Vol 2", category: "approved_document", description: "Statutory guidance for fire safety in non-residential buildings. Covers offices, shops, assembly buildings, industrial, storage and other non-dwelling purposes.", source_url: "https://www.gov.uk/government/publications/fire-safety-approved-document-b", pillar_tags: ["fire_doors","dampers","fire_stopping","auro_lume"], status: "in_force", effective_date: "2019-11-01" },
  { name: "BS 8214:2016 — Fire Door Assemblies", reference: "BS 8214:2016", category: "british_standard", description: "Code of practice for the specification, installation, maintenance, and inspection of timber-based fire door assemblies. Key standard for fire door compliance.", source_url: "https://knowledge.bsigroup.com/products/timber-based-fire-door-assemblies", pillar_tags: ["fire_doors"], status: "in_force", effective_date: "2016-04-30" },
  { name: "BS 9999:2017 — Fire Safety in Design", reference: "BS 9999:2017", category: "british_standard", description: "Code of practice for fire safety in the design, management and use of buildings. Offers a more flexible framework than Approved Document B.", source_url: "https://knowledge.bsigroup.com/products/fire-safety-in-the-design-management-and-use-of-buildings", pillar_tags: ["fire_doors","dampers","fire_stopping","auro_lume"], status: "in_force", effective_date: "2017-02-28" },
  { name: "BS EN 1634-1 — Fire Resistance Tests for Doors", reference: "BS EN 1634-1:2014+A1:2018", category: "british_standard", description: "European standard for fire resistance and smoke control tests on door and shutter assemblies. Defines integrity (E) and insulation (I) criteria.", source_url: "https://knowledge.bsigroup.com/products/fire-resistance-and-smoke-control-tests-for-door-and-shutter-assemblies", pillar_tags: ["fire_doors"], status: "in_force", effective_date: "2018-10-31" },
  { name: "BS EN 15650 — Fire Dampers", reference: "BS EN 15650:2010", category: "european_standard", description: "Ventilation for buildings — fire dampers. Specifies classification, requirements and test methods for fire dampers used in HVAC ductwork.", pillar_tags: ["dampers"], status: "in_force", effective_date: "2010-08-31" },
  { name: "BS EN 1366-3 — Fire Resistance Tests for Service Installations", reference: "BS EN 1366-3:2009", category: "european_standard", description: "Fire resistance tests for service installations — Part 3: Penetration seals. Defines test methodology for firestopping products in service penetrations.", pillar_tags: ["fire_stopping","retro_fire_stopping"], status: "in_force", effective_date: "2009-05-31" },
  { name: "BS 5266-1 — Emergency Lighting", reference: "BS 5266-1:2016", category: "british_standard", description: "Code of practice for the emergency lighting of premises. Covers photoluminescent signage, self-contained luminaires and central battery systems.", source_url: "https://knowledge.bsigroup.com/products/emergency-lighting-code-of-practice-for-the-emergency-lighting-of-premises", pillar_tags: ["auro_lume"], status: "in_force", effective_date: "2016-06-30" },
  { name: "PAS 9980:2022 — Fire Risk Appraisal of External Wall Construction", reference: "PAS 9980:2022", category: "industry_guidance", description: "Publicly Available Specification providing a methodology for appraisal of fire risk in external wall construction. Essential post-Grenfell guidance.", source_url: "https://www.bsigroup.com/en-GB/standards/pas-9980/", pillar_tags: ["fire_stopping","retro_fire_stopping"], status: "in_force", effective_date: "2022-01-31" },
  { name: "Fire Safety (England) Regulations 2022", reference: "SI 2022/547", category: "legislation", description: "Regulations under the Fire Safety Act 2021 imposing duties on responsible persons for high-rise residential buildings. Includes fire door inspection requirements.", source_url: "https://www.legislation.gov.uk/uksi/2022/547/contents", pillar_tags: ["fire_doors"], status: "in_force", effective_date: "2023-01-23" },
];

// ─── QUOTES ──────────────────────────────────────────────────
function quoteData(productMap: Record<string, { id: string; sell_price: number }>) {
  return [
    {
      quote_name: "Camden Towers — Fire Door Remediation",
      client_name: "London Borough of Camden",
      client_email: "procurement@camden.gov.uk",
      project_name: "Camden Towers Fire Safety Upgrade",
      project_address: "Camden Towers, Bayham Street, London NW1 0AU",
      status: "approved",
      valid_until: "2026-04-30",
      notes: "Phase 1 of 3 — Covers floors 1-8. Fire door replacement programme following Q1 FRA.",
      terms: "Payment: 30 days from invoice. Delivery: 4-6 weeks from order. All products certified to BS EN 1634-1.",
      approved_at: "2026-02-10T14:30:00Z",
      items: [
        { code: "LOR-IS8030", qty: 240, desc: "Intumescent strip + smoke seal — all replacement doors" },
        { code: "LOR-LAS5001", qty: 48, desc: "Drop seal for corridor fire doors (floors 1-8)" },
        { code: "NOR-FG100", qty: 48, desc: "Glazing kits for corridor doors with vision panels" },
        { code: "NOR-FDH-SS", qty: 48, desc: "Hardware packs — satin stainless steel" },
      ],
    },
    {
      quote_name: "Peabody Thamesmead — Damper Inspection & Replacement",
      client_name: "Peabody Housing Association",
      client_email: "estates@peabody.org.uk",
      project_name: "Thamesmead Estate Fire Safety Programme",
      project_address: "Thamesmead Estate, Wolvercote Road, London SE2 9RT",
      status: "sent",
      valid_until: "2026-03-31",
      notes: "Annual damper inspection + replacement of failed units. Blocks A-C.",
      terms: "Payment: 30 days. Access to be arranged via estate management. Working hours 08:00-18:00.",
      sent_at: "2026-02-18T09:00:00Z",
      items: [
        { code: "RUS-FD60-R", qty: 36, desc: "Replacement rectangular fire dampers — riser shafts" },
        { code: "RUS-FD60-C", qty: 24, desc: "Replacement circular fire dampers — bathroom extracts" },
        { code: "SWE-FDMC-120", qty: 8, desc: "Motorised fire/smoke dampers — main risers (BMS integration)" },
      ],
    },
    {
      quote_name: "L&Q Barking — Fire Stopping Remediation",
      client_name: "L&Q Group",
      client_email: "firesafety@lqgroup.org.uk",
      project_name: "Barking Riverside Phase 2 — Remediation",
      project_address: "Barking Riverside, Handley Page Road, Barking IG11 0YE",
      status: "draft",
      valid_until: "2026-04-15",
      notes: "Compartmentation remediation following invasive survey. Priority: riser shafts + floor penetrations.",
      items: [
        { code: "QF-QS-COLLAR", qty: 180, desc: "Fire collars for plastic pipework — all risers" },
        { code: "HLT-CP672", qty: 45, desc: "Firestop mortar — large openings in riser walls" },
        { code: "HLT-CFS-BL", qty: 320, desc: "Firestop blocks — cable transits throughout" },
        { code: "RW-SP60", qty: 85, desc: "Stone wool barriers — curtain wall perimeters" },
        { code: "PRO-BOARD-H", qty: 40, desc: "Calcium silicate boards — riser encasements" },
        { code: "SID-CW-RFS", qty: 120, desc: "Retrofit cavity barriers — external wall zones" },
        { code: "SID-RS-120", qty: 35, desc: "Riser shaft barriers — service penetrations" },
        { code: "QF-QWR-WRAP", qty: 200, desc: "Pipe wraps — plastic waste pipes (retrofit)" },
      ],
    },
    {
      quote_name: "Gospel Oak — Emergency Signage Package",
      client_name: "London Borough of Camden",
      client_email: "procurement@camden.gov.uk",
      project_name: "Gospel Oak Estate Signage Upgrade",
      project_address: "Gospel Oak Estate, Lismore Circus, London NW5 4QE",
      status: "draft",
      valid_until: "2026-05-01",
      notes: "Full photoluminescent signage replacement per BS 5266-1 and ISO 7010.",
      items: [
        { code: "JAL-430A", qty: 95, desc: "Fire exit directional signs — all escape routes" },
        { code: "JAL-440K", qty: 42, desc: "Fire action notice signs — each flat entrance + corridors" },
        { code: "JAL-LLL-STRIP", qty: 350, desc: "Low-level guidance strips — stairwells + corridors (metres)" },
      ],
    },
  ];
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const orgId = auth.organizationId;
  const userId = auth.user.id;
  const stats = { manufacturers: 0, products: 0, quotes: 0, lineItems: 0, regulations: 0 };

  try {
    // ─── 1. MANUFACTURERS ──────────────────────────────
    const mfrMap: Record<string, string> = {};

    for (const mfr of MANUFACTURERS) {
      const { data: existing } = await sb.from("manufacturers").select("id").eq("organization_id", orgId).eq("name", mfr.name).maybeSingle();
      if (existing) {
        mfrMap[mfr.name] = existing.id;
        continue;
      }
      const { data, error } = await sb.from("manufacturers").insert({
        organization_id: orgId,
        created_by: userId,
        name: mfr.name,
        website_url: mfr.website_url,
        contact_email: mfr.contact_email,
        trade_discount_percent: mfr.trade_discount_percent,
        is_active: true,
      }).select("id").single();
      if (error) throw new Error(`Manufacturer ${mfr.name}: ${error.message}`);
      mfrMap[mfr.name] = data.id;
      stats.manufacturers++;
    }

    // ─── 2. PRODUCTS ───────────────────────────────────
    const productMap: Record<string, { id: string; sell_price: number }> = {};
    const allProducts = products(mfrMap);

    for (const p of allProducts) {
      const { data: existing } = await sb.from("products").select("id, sell_price").eq("organization_id", orgId).eq("manufacturer_id", p.manufacturer_id).eq("product_code", p.product_code).maybeSingle();
      if (existing) {
        productMap[p.product_code] = { id: existing.id, sell_price: existing.sell_price };
        continue;
      }
      const { data, error } = await sb.from("products").insert({
        organization_id: orgId,
        manufacturer_id: p.manufacturer_id,
        pillar: p.pillar,
        product_code: p.product_code,
        product_name: p.product_name,
        description: p.description,
        specifications: p.specifications,
        list_price: p.list_price,
        trade_price: p.trade_price,
        sell_price: p.sell_price,
        unit: p.unit,
        lead_time_days: p.lead_time_days,
        status: p.status,
        needs_review: false,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }).select("id, sell_price").single();
      if (error) throw new Error(`Product ${p.product_code}: ${error.message}`);
      productMap[p.product_code] = { id: data.id, sell_price: data.sell_price };
      stats.products++;
    }

    // ─── 3. QUOTES ─────────────────────────────────────
    const allQuotes = quoteData(productMap);

    for (const q of allQuotes) {
      // Check if quote already exists by name
      const { data: existing } = await sb.from("quotes").select("id").eq("organization_id", orgId).eq("quote_name", q.quote_name).maybeSingle();
      if (existing) continue;

      // Generate quote number
      let quoteNumber: string;
      const { data: seqData, error: seqError } = await sb.rpc("nextval_quote_number");
      if (seqError) {
        const { data: lastQuote } = await sb.from("quotes").select("quote_number").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1);
        let nextNum = 1;
        if (lastQuote && lastQuote.length > 0) {
          const match = lastQuote[0].quote_number?.match(/HF-Q-(\d+)/);
          if (match) nextNum = parseInt(match[1]) + 1;
        }
        quoteNumber = `HF-Q-${String(nextNum).padStart(4, "0")}`;
      } else {
        quoteNumber = `HF-Q-${String(typeof seqData === "number" ? seqData : parseInt(String(seqData))).padStart(4, "0")}`;
      }

      // Calculate totals
      let subtotal = 0;
      const lineItems = q.items.map((item, i) => {
        const product = productMap[item.code];
        const unitPrice = product?.sell_price || 0;
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;
        return {
          product_id: product?.id || null,
          manufacturer_name: MANUFACTURERS.find((m) => allProducts.find((p) => p.product_code === item.code)?.manufacturer_id === mfrMap[m.name])?.name || "",
          product_code: item.code,
          description: item.desc,
          quantity: item.qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          sort_order: i + 1,
        };
      });

      const vatAmount = Math.round(subtotal * 20) / 100;
      const total = subtotal + vatAmount;

      const { data: quote, error: quoteErr } = await sb.from("quotes").insert({
        organization_id: orgId,
        created_by: userId,
        quote_number: quoteNumber,
        quote_name: q.quote_name,
        client_name: q.client_name,
        client_email: q.client_email || null,
        project_name: q.project_name,
        project_address: q.project_address || null,
        status: q.status,
        quote_date: "2026-02-15",
        valid_until: q.valid_until || null,
        subtotal,
        vat_percent: 20,
        vat_amount: vatAmount,
        total,
        notes: q.notes || null,
        terms: q.terms || null,
        sent_at: q.sent_at || null,
        approved_at: q.approved_at || null,
      }).select("id").single();

      if (quoteErr) throw new Error(`Quote ${q.quote_name}: ${quoteErr.message}`);

      // Insert line items
      const { error: itemsErr } = await sb.from("quote_line_items").insert(
        lineItems.map((li) => ({ ...li, quote_id: quote.id }))
      );
      if (itemsErr) throw new Error(`Line items for ${q.quote_name}: ${itemsErr.message}`);

      stats.quotes++;
      stats.lineItems += lineItems.length;
    }

    // ─── 4. REGULATIONS ────────────────────────────────
    for (const reg of REGULATIONS) {
      const { data: existing } = await sb.from("regulations").select("id").eq("organization_id", orgId).eq("reference", reg.reference).maybeSingle();
      if (existing) continue;

      const { error } = await sb.from("regulations").insert({
        organization_id: orgId,
        ...reg,
      });
      if (error) throw new Error(`Regulation ${reg.reference}: ${error.message}`);
      stats.regulations++;
    }

    return NextResponse.json({
      success: true,
      seeded: stats,
      message: `Demo data created: ${stats.manufacturers} manufacturers, ${stats.products} products, ${stats.quotes} quotes (${stats.lineItems} line items), ${stats.regulations} regulations`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, partialStats: stats }, { status: 500 });
  }
}
