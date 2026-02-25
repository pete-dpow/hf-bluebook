import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface DiagnosticResult {
  url: string;
  status: number;
  statusText?: string;
  contentType?: string;
  responseTimeMs: number;
  accessible: boolean;
  isCloudflare?: boolean;
  productUrlCount?: number;
  error?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { data: manufacturer } = await supabaseAdmin
    .from("manufacturers")
    .select("id, name, website_url, scraper_config")
    .eq("id", params.id)
    .single();

  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  const config = manufacturer.scraper_config;
  if (!config?.type) {
    return NextResponse.json({
      manufacturer: manufacturer.name,
      error: "No scraper configured. Run 'Seed Suppliers' first.",
    }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ...(config.request?.headers || {}),
  };

  const diagnostics: DiagnosticResult[] = [];
  const listingUrls: string[] = config.listing?.urls || [];

  // Test each listing URL
  for (const url of listingUrls) {
    const start = Date.now();
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10_000),
        redirect: "follow",
      });
      const body = res.ok ? await res.text() : "";
      const serverHeader = res.headers.get("server") || "";

      // Count product URLs found in the response
      let productUrlCount = 0;
      if (res.ok && config.listing?.product_link_pattern) {
        try {
          const regex = new RegExp(config.listing.product_link_pattern, "gi");
          const matches = body.match(regex);
          productUrlCount = matches?.length || 0;
        } catch { /* bad regex */ }
      }

      diagnostics.push({
        url,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get("content-type") || undefined,
        responseTimeMs: Date.now() - start,
        accessible: res.ok,
        isCloudflare: serverHeader.toLowerCase().includes("cloudflare"),
        productUrlCount,
      });
    } catch (err: any) {
      diagnostics.push({
        url,
        status: 0,
        responseTimeMs: Date.now() - start,
        accessible: false,
        error: err.message,
      });
    }
  }

  // Test one sample detail page if we found product URLs
  let detailPageAccessible: boolean | null = null;
  const totalProductUrls = diagnostics.reduce((sum, d) => sum + (d.productUrlCount || 0), 0);

  if (totalProductUrls > 0 && config.detail?.method !== "listing-only" && config.detail?.method !== "sitemap") {
    // Extract one URL from the first accessible listing
    for (const d of diagnostics) {
      if (!d.accessible || !d.productUrlCount) continue;
      try {
        const listingRes = await fetch(d.url, {
          headers,
          signal: AbortSignal.timeout(10_000),
          redirect: "follow",
        });
        if (!listingRes.ok) break;
        const body = await listingRes.text();
        const regex = new RegExp(config.listing.product_link_pattern, "i");
        const match = regex.exec(body);
        if (match?.[1]) {
          const testUrl = match[1].startsWith("http")
            ? match[1]
            : new URL(match[1], config.base_url || manufacturer.website_url).toString();
          const detailRes = await fetch(testUrl, {
            headers,
            signal: AbortSignal.timeout(10_000),
            redirect: "follow",
          });
          detailPageAccessible = detailRes.ok;
        }
      } catch {
        detailPageAccessible = false;
      }
      break;
    }
  }

  // Generate recommendation
  const accessibleListings = diagnostics.filter((d) => d.accessible).length;
  let recommendation: string;

  if (accessibleListings === 0) {
    recommendation = "No listing pages accessible. Check manufacturer URL and scraper config.";
  } else if (detailPageAccessible === false) {
    recommendation = `${accessibleListings}/${diagnostics.length} listing pages accessible. Detail pages blocked (likely Cloudflare). URL-based extraction with knowledge base enrichment will be used.`;
  } else if (detailPageAccessible === true) {
    recommendation = `${accessibleListings}/${diagnostics.length} listing pages accessible. Detail pages accessible. Full HTML scraping will extract product data.`;
  } else {
    recommendation = `${accessibleListings}/${diagnostics.length} listing pages accessible. ${totalProductUrls} product URLs found. Ready to scrape.`;
  }

  return NextResponse.json({
    manufacturer: manufacturer.name,
    scraperType: config.type,
    detailMethod: config.detail?.method || "unknown",
    listingUrlCount: listingUrls.length,
    diagnostics,
    summary: {
      accessibleListings,
      totalListings: diagnostics.length,
      totalProductUrlsFound: totalProductUrls,
      detailPagesAccessible: detailPageAccessible,
      recommendation,
    },
  });
}
