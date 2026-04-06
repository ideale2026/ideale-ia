import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

const BASE_URL = "https://ideale.lovable.app";

// ── helpers ─────────────────────────────────────────────────────────────────

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string): string {
  if (href.startsWith("http")) return href;
  return BASE_URL + (href.startsWith("/") ? href : "/" + href);
}

// ── list products from a category page (all pages) ──────────────────────────

async function listProducts(
  categoryUrl: string
): Promise<{ name: string; url: string; slug: string }[]> {
  const allProducts: { name: string; url: string; slug: string }[] = [];
  const seenSlugs = new Set<string>();
  let page = 1;

  while (page <= 20) {
    const pageUrl =
      page === 1
        ? categoryUrl
        : `${categoryUrl.replace(/\/$/, "")}?page=${page}`;

    console.log(`[list] Fetching page ${page}: ${pageUrl}`);

    let html: string;
    try {
      const res = await fetch(pageUrl, { headers: FETCH_HEADERS });
      if (!res.ok) {
        console.log(`[list] Page ${page} returned ${res.status}, stopping`);
        break;
      }
      html = await res.text();
    } catch (e) {
      console.error(`[list] Fetch error on page ${page}:`, e);
      break;
    }

    // Extract product links: /produtos/<slug>/ with title attribute
    // Pattern 1: href with title on same element (e.g. item-link anchors)
    const productPattern =
      /href="((?:https?:\/\/[^"]*)?\/produtos\/([^"\/]+)\/?)"[^>]*title="([^"]+)"/g;
    // Pattern 2: title before href (alternate attribute order)
    const productPattern2 =
      /title="([^"]+)"[^>]*href="((?:https?:\/\/[^"]*)?\/produtos\/([^"\/]+)\/?)"[^>]*/g;

    let match: RegExpExecArray | null;
    const pageProducts: { name: string; url: string; slug: string }[] = [];

    while ((match = productPattern.exec(html)) !== null) {
      const rawHref = match[1];
      const slug = match[2];
      const title = match[3]?.trim() || "";

      if (!slug || seenSlugs.has(slug) || !title) continue;

      seenSlugs.add(slug);
      const url = absoluteUrl(rawHref).replace(/\/$/, "") + "/";
      pageProducts.push({ name: title, url, slug });
    }

    while ((match = productPattern2.exec(html)) !== null) {
      const title = match[1]?.trim() || "";
      const rawHref = match[2];
      const slug = match[3];

      if (!slug || seenSlugs.has(slug) || !title) continue;

      seenSlugs.add(slug);
      const url = absoluteUrl(rawHref).replace(/\/$/, "") + "/";
      pageProducts.push({ name: title, url, slug });
    }

    if (pageProducts.length === 0) {
      console.log(`[list] No products on page ${page}, stopping`);
      break;
    }

    allProducts.push(...pageProducts);
    console.log(
      `[list] Page ${page}: found ${pageProducts.length} products (total: ${allProducts.length})`
    );

    // Check if there's a next page
    const hasNextPage =
      html.includes(`page=${page + 1}`) ||
      html.includes(`?page=${page + 1}`) ||
      pageProducts.length >= 18;

    if (!hasNextPage) break;
    page++;

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 300));
  }

  return allProducts;
}

// ── scrape a single product page ────────────────────────────────────────────

interface ScrapedProduct {
  name: string;
  price: number;
  description: string;
  images: string[];
  sourceUrl: string;
}

async function scrapeProduct(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[scrape] Fetching: ${productUrl}`);

  const res = await fetch(productUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${productUrl}`);
  const html = await res.text();

  let name = "";
  let price = 0;
  let description = "";
  let images: string[] = [];

  // ── 1. Try JSON-LD (schema.org Product) ───────────────────────────────────
  const jsonLdPattern =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let jMatch: RegExpExecArray | null;

  while ((jMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const raw = jMatch[1].trim();
      const data = JSON.parse(raw);
      const products = Array.isArray(data)
        ? data.filter((d) => d["@type"] === "Product")
        : data["@type"] === "Product"
        ? [data]
        : [];

      if (products.length > 0) {
        const p = products[0];
        name = p.name || "";
        description = stripHtml(p.description || "");
        const offerPrice =
          p.offers?.price ?? p.offers?.[0]?.price ?? p.offers?.lowPrice;
        price = offerPrice ? parseFloat(String(offerPrice)) : 0;

        const imgField = p.image;
        if (Array.isArray(imgField)) {
          images = imgField.filter(Boolean) as string[];
        } else if (typeof imgField === "string" && imgField) {
          images = [imgField];
        }
        console.log(
          `[scrape] JSON-LD: name="${name}", price=${price}, images=${images.length}`
        );
        break;
      }
    } catch {
      // continue to next script block
    }
  }

  // ── 2. Fallback: extract name from <h1> ───────────────────────────────────
  if (!name) {
    const h1Match = html.match(
      /<h1[^>]*(?:itemprop="name"|class="[^"]*product[^"]*")[^>]*>([^<]+)<\/h1>/i
    );
    name = h1Match?.[1]?.trim() || "";
  }

  // ── 3. Fallback: extract price from itemprop ──────────────────────────────
  if (!price) {
    const priceMatch = html.match(/itemprop="price"[^>]*content="([\d.,]+)"/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(",", "."));
    }
  }

  // ── 4. Fallback: extract images from CDN data-src / src ──────────────────
  if (images.length === 0) {
    const cdnPattern =
      /(?:data-src|src)="(https:\/\/dcdn-us\.mitiendanube\.com\/stores\/[^"]+\.(?:webp|jpg|jpeg|png))"/g;
    const imgMatches = [...html.matchAll(cdnPattern)].map((m) => m[1]);
    // Prefer larger images (480px), filter out tiny thumbnails (240px)
    images = [...new Set(imgMatches)].filter(
      (u) => !u.includes("-240-") && !u.includes("-80-")
    );
    console.log(`[scrape] Fallback CDN images: ${images.length}`);
  }

  // Deduplicate + prefer 1200px variants if available, else 480px
  const dedup = [...new Set(images)];
  const best = dedup.filter((u) => u.includes("-1200-") || u.includes("-480-"));
  images = best.length > 0 ? best : dedup;

  return {
    name: name || "Produto sem nome",
    price: isNaN(price) ? 0 : price,
    description,
    images: images.slice(0, 5),
    sourceUrl: productUrl,
  };
}

// ── upload images to Supabase Storage ────────────────────────────────────────

async function uploadImages(
  productId: string,
  imageUrls: string[]
): Promise<string[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const uploadedUrls: string[] = [];

  for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
    try {
      const imgUrl = imageUrls[i];
      console.log(`[upload] Downloading image ${i + 1}: ${imgUrl}`);

      const imgRes = await fetch(imgUrl, { headers: FETCH_HEADERS });
      if (!imgRes.ok) {
        console.error(`[upload] Failed to download image: ${imgRes.status}`);
        continue;
      }

      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") || "image/webp";
      const ext = imgUrl.split(".").pop()?.split("?")[0] || "webp";
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("products")
        .upload(path, buffer, { contentType, upsert: true });

      if (error) {
        console.error(`[upload] Storage error:`, error.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("products")
        .getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
      console.log(`[upload] Uploaded image ${i + 1} → ${urlData.publicUrl}`);
    } catch (e) {
      console.error(`[upload] Error on image ${i + 1}:`, e);
    }
  }

  return uploadedUrls;
}

// ── main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { url } = body as { url: string };
      if (!url) {
        return Response.json(
          { error: "url is required" },
          { status: 400, headers: corsHeaders }
        );
      }
      const products = await listProducts(url);
      return Response.json({ products }, { headers: corsHeaders });
    }

    if (action === "scrape") {
      const { url } = body as { url: string };
      if (!url) {
        return Response.json(
          { error: "url is required" },
          { status: 400, headers: corsHeaders }
        );
      }
      const product = await scrapeProduct(url);
      return Response.json({ product }, { headers: corsHeaders });
    }

    if (action === "upload-images") {
      const { productId, imageUrls } = body as {
        productId: string;
        imageUrls: string[];
      };
      if (!productId || !imageUrls?.length) {
        return Response.json(
          { error: "productId and imageUrls are required" },
          { status: 400, headers: corsHeaders }
        );
      }
      const uploadedUrls = await uploadImages(productId, imageUrls);
      return Response.json({ uploadedUrls }, { headers: corsHeaders });
    }

    return Response.json(
      { error: "Unknown action" },
      { status: 400, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[handler] Error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return Response.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
});
