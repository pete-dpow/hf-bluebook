import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Aliases map: canonical name → known duplicates (lowercase)
const ALIASES: Record<string, string[]> = {
  "Quelfire": ["quelfire"],
  "Hilti": ["hilti", "hilti library", "hilti technical"],
  "British Gypsum": ["bg", "british gypsum"],
  "Rockwool": ["rockwool"],
  "Siderise": ["siderise"],
  "Promat (Etex)": ["promat", "promat (etex)", "etex"],
  "Knauf": ["knauf"],
  "Siniat": ["siniat"],
  "Lorient": ["lorient"],
  "Kingspan": ["kingspan"],
};

const SEED_MANUFACTURERS = [
  // ── Shopify store (already working) ──
  {
    name: "Quelfire",
    website_url: "https://quelfire.co.uk",
    contact_email: "info@quelfire.co.uk",
    scraper_config: {
      type: "shopify",
      store_url: "https://quelfire.co.uk",
      default_pillar: "fire_stopping",
      installation_details_url: "https://quelfire.co.uk/pages/standard-installation-details",
    },
  },

  // ── HTML scraper configs (fetch-based, no Playwright) ──

  {
    name: "Hilti",
    website_url: "https://www.hilti.co.uk",
    scraper_config: {
      type: "html",
      base_url: "https://www.hilti.co.uk",
      default_pillar: "fire_stopping",
      listing: {
        urls: ["https://www.hilti.co.uk/technical-library?productGroups=Firestop+%26+fire+protection"],
        pagination: "https://www.hilti.co.uk/technical-library?productGroups=Firestop+%26+fire+protection&page={page}",
        max_pages: 20,
        product_link_pattern: "href=\"(/media-canonical/PUB_\\d+_\\d+_APC_RAW)\"",
      },
      detail: {
        method: "listing-only",
        name_pattern: "<h3[^>]*>([\\s\\S]*?)</h3>",
        pdf_pattern: "href=\"(/media-canonical/PUB_\\d+_\\d+_APC_RAW)\"",
      },
      request: { delay_ms: 300 },
    },
  },
  {
    name: "Rockwool",
    website_url: "https://www.rockwool.com/uk",
    scraper_config: {
      type: "html",
      base_url: "https://www.rockwool.com/uk",
      default_pillar: "fire_stopping",
      listing: {
        urls: ["https://www.rockwool.com/uk/products/"],
        pagination: "https://www.rockwool.com/uk/products/?page={page}",
        max_pages: 8,
        product_link_pattern: "href=\"(/uk/products/[a-z0-9][a-z0-9-]*/)\"",
      },
      detail: {
        method: "json-ld",
        json_ld_type: "Product",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
    },
  },
  {
    name: "Siderise",
    website_url: "https://www.siderise.com",
    scraper_config: {
      type: "html",
      base_url: "https://www.siderise.com",
      default_pillar: "fire_stopping",
      listing: {
        urls: [
          "https://www.siderise.com/fire-safety/curtain-walling",
          "https://www.siderise.com/fire-safety/rainscreen-cladding",
          "https://www.siderise.com/fire-safety/masonry",
          "https://www.siderise.com/fire-safety/building-interiors",
          "https://www.siderise.com/fire-safety/industrial-buildings",
        ],
        product_link_pattern: "href=\"(/fire-safety/[a-z-]+/[a-z0-9-]+)\"",
      },
      detail: {
        method: "html",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        description_pattern: "<div[^>]*class=\"[^\"]*field--name-body[^\"]*\"[^>]*>([\\s\\S]*?)</div>",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
    },
  },
  {
    name: "Promat (Etex)",
    website_url: "https://www.promat.com/en-gb",
    scraper_config: {
      type: "html",
      base_url: "https://www.promat.com",
      default_pillar: "fire_stopping",
      listing: {
        urls: ["https://www.promat.com/en-gb/construction/products-systems/"],
        product_link_pattern: "href=\"(/en-gb/construction/[a-z0-9/-]+)\"",
      },
      detail: {
        method: "html",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        description_pattern: "<div[^>]*class=\"[^\"]*product-intro[^\"]*\"[^>]*>([\\s\\S]*?)</div>",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
    },
  },
  {
    name: "British Gypsum",
    website_url: "https://www.british-gypsum.com",
    scraper_config: {
      type: "html",
      base_url: "https://www.british-gypsum.com",
      default_pillar: "fire_stopping",
      listing: {
        urls: [
          "https://www.british-gypsum.com/sitemap.xml?page=1",
          "https://www.british-gypsum.com/sitemap.xml?page=2",
          "https://www.british-gypsum.com/sitemap.xml?page=3",
        ],
        product_link_pattern: "<loc>(https://www\\.british-gypsum\\.com/(?:products/[^/]+/[^<]+|Specification/White-Book-Specification-Selector/[^/]+/[^/]+/[^<]+))</loc>",
      },
      detail: {
        method: "sitemap-fetch",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        description_pattern: "<meta[^>]*name=\"description\"[^>]*content=\"([^\"]+)\"",
        spec_table_pattern: "<tr[^>]*>\\s*<t[dh][^>]*>([\\s\\S]*?)</t[dh]>\\s*<t[dh][^>]*>([\\s\\S]*?)</t[dh]>\\s*</tr>",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
      request: {
        delay_ms: 200,
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      },
    },
  },
  {
    name: "Knauf",
    website_url: "https://www.knauf.com/en-GB/knauf-gypsum",
    scraper_config: {
      type: "html",
      base_url: "https://www.knauf.com/en-GB/knauf-gypsum",
      default_pillar: "fire_stopping",
      listing: {
        urls: ["https://www.knauf.com/en-GB/knauf-gypsum/products"],
        product_link_pattern: "href=\"(/en-GB/knauf-gypsum/products/[a-zA-Z0-9-]+)\"",
      },
      detail: {
        method: "html",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        description_pattern: "<meta[^>]*name=\"description\"[^>]*content=\"([^\"]+)\"",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
    },
  },
  {
    name: "Siniat",
    website_url: "https://www.siniat.co.uk",
    scraper_config: {
      type: "html",
      base_url: "https://www.siniat.co.uk",
      default_pillar: "fire_stopping",
      listing: {
        urls: ["https://www.siniat.co.uk/en-gb/products-and-systems/products/"],
        product_link_pattern: "href=\"(/en-gb/products-and-systems/products/[a-z0-9-]+/)\"",
      },
      detail: {
        method: "html",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
    },
  },
  {
    name: "Lorient",
    website_url: "https://www.lorientuk.com",
    scraper_config: {
      type: "html",
      base_url: "https://www.lorientuk.com",
      default_pillar: "fire_doors",
      listing: {
        urls: [
          "https://www.lorientuk.com/products/acoustic-smoke-and-fire-door-seals",
          "https://www.lorientuk.com/products/intumescent-technology",
          "https://www.lorientuk.com/products/glazing-systems",
          "https://www.lorientuk.com/products/air-transfer-grilles",
          "https://www.lorientuk.com/products/door-hardware-protection",
        ],
        product_link_pattern: "href=\"(/products/[a-z0-9-]+/[a-z0-9-]+)\"",
      },
      detail: {
        method: "html",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        spec_table_pattern: "<tr[^>]*>\\s*<td[^>]*>([\\s\\S]*?)</td>\\s*<td[^>]*>([\\s\\S]*?)</td>\\s*</tr>",
        pdf_pattern: "href=\"([^\"]*\\.pdf)\"",
        image_pattern: "src=\"([^\"]*productimages[^\"]+)\"",
      },
    },
  },
  {
    name: "Kingspan",
    website_url: "https://www.kingspan.com/gb/en-gb",
    scraper_config: {
      type: "html",
      base_url: "https://www.kingspan.com/gb/en-gb",
      default_pillar: "fire_stopping",
      listing: {
        urls: [
          "https://www.kingspan.com/gb/en-gb/products",
          "https://www.kingspan.com/gb/en-gb/products/insulation",
        ],
        product_link_pattern: "href=\"(/gb/en-gb/products/[a-z0-9-]+/[a-z0-9-]+)\"",
      },
      detail: {
        method: "html",
        name_pattern: "<h1[^>]*>([\\s\\S]*?)</h1>",
        pdf_pattern: "href=\"([^\"]+\\.pdf)\"",
      },
    },
  },
];

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  let created = 0;
  let updated = 0;
  let merged = 0;
  const errors: string[] = [];

  // Fetch ALL existing manufacturers once for alias matching
  const { data: allExisting } = await supabaseAdmin
    .from("manufacturers")
    .select("id, name")
    .eq("organization_id", auth.organizationId);

  const existingList = allExisting || [];

  for (const mfr of SEED_MANUFACTURERS) {
    const aliases = ALIASES[mfr.name] || [mfr.name.toLowerCase()];

    // Find existing manufacturer by canonical name or any alias (case-insensitive)
    const match = existingList.find(
      (e) => e.name === mfr.name || aliases.includes(e.name.toLowerCase())
    );

    if (match) {
      // Update existing: scraper config, website_url, and rename to canonical name
      const updates: Record<string, any> = {
        scraper_config: mfr.scraper_config,
        website_url: mfr.website_url,
      };

      // Rename to canonical name if it was a duplicate/alias
      if (match.name !== mfr.name) {
        updates.name = mfr.name;
        merged++;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("manufacturers")
        .update(updates)
        .eq("id", match.id);

      if (updateErr) {
        errors.push(`${mfr.name} (update): ${updateErr.message}`);
      } else {
        updated++;
      }
      continue;
    }

    const { error } = await supabaseAdmin
      .from("manufacturers")
      .insert({
        ...mfr,
        organization_id: auth.organizationId,
        created_by: auth.user.id,
      });

    if (error) {
      errors.push(`${mfr.name}: ${error.message}`);
    } else {
      created++;
    }
  }

  return NextResponse.json(
    { created, updated, merged, errors: errors.length > 0 ? errors : undefined },
    { status: 201 }
  );
}
