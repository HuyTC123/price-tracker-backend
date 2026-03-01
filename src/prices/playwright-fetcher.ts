// price-tracker-backend/src/prices/playwright-fetcher.ts
import { chromium } from "playwright";

export type ProductInfo = {
  price: number;
  rating: number | null;
  ratingCount: number | null;
};

export async function fetchProductInfoByPlaywright(url: string): Promise<ProductInfo> {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    locale: "vi-VN",
    viewport: { width: 1280, height: 720 },
  });

  await context.route("**/*", async (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "font" || type === "media") return route.abort();
    return route.continue();
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(900);

    // ✅ 1) JSON-LD ưu tiên (giảm sai giá)
    const ld = await extractJsonLdPriceAndRating(page);
    if (ld?.price && ld.price > 0) {
      return {
        price: ld.price,
        rating: clampRating(ld.rating ?? null),
        ratingCount: ld.ratingCount ?? null,
      };
    }

    // ✅ 2) meta tags
    const metaPrice =
      (await getMetaContent(page, 'meta[property="product:price:amount"]')) ||
      (await getMetaContent(page, 'meta[property="og:price:amount"]')) ||
      (await getMetaContent(page, 'meta[name="price"]')) ||
      (await getMetaContent(page, 'meta[itemprop="price"]'));

    let price: number | null = null;
    if (metaPrice) {
      const p = parseVndPrice(metaPrice);
      if (p) price = p;
    }

    // ✅ 3) selectors theo domain (đúng nhất)
    if (price == null) {
      const bySelector = await tryDomainSelectors(page, url);
      if (bySelector) price = bySelector;
    }

    // ✅ 4) fallback quét text nhưng lọc /tháng trả góp
    if (price == null) {
      const candidates = await page.$$eval("*", (els) => {
        const out: string[] = [];
        for (const el of els as any[]) {
          const t = (el?.innerText ?? "").trim();
          if (!t) continue;
          if (t.length > 120) continue;
          out.push(t);
        }
        return out;
      });

      const picked = pickMostLikelyPriceFromTexts(candidates);
      if (picked) price = picked;
    }

    if (price == null) throw new Error("Playwright: cannot parse price");

    // rating fallback (nếu JSON-LD ko có)
    const rr = await extractRatingByPlaywright(page);

    return { price, rating: rr.rating, ratingCount: rr.ratingCount };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

// ===== helpers =====

async function tryDomainSelectors(page: any, url: string): Promise<number | null> {
  const u = url.toLowerCase();

  const selectorGroups: string[] = [];

  // Cellphones
  if (u.includes("cellphones.com.vn")) {
    selectorGroups.push(
      ".box-info__box-price .special-price",
      ".box-price-present",
      ".box-product__price--show"
    );
  }

  // FPTShop
  if (u.includes("fptshop.com.vn")) {
    selectorGroups.push(
      ".st-price-main",
      ".st-price",
      ".product-price",
      '[data-name="final_price"]'
    );
  }

  // Fahasa
  if (u.includes("fahasa.com")) {
    selectorGroups.push(
      ".price-box .special-price .price",
      ".product_view_price .price",
      ".product_price .price",
      ".product-price"
    );
  }

  // Thegioididong
  if (u.includes("thegioididong.com")) {
    selectorGroups.push(
      ".box-price-present",
      ".price-current",
      ".area_price strong",
      ".box-price .box-price-present"
    );
  }

  // generic fallback selectors
  selectorGroups.push('[itemprop="price"]', ".price", ".product-price");

  for (const sel of selectorGroups) {
    const txt = await safeInnerText(page, sel);
    const p = txt ? parseVndPrice(txt) : null;
    if (p && p >= 10_000) return p;
  }

  return null;
}

async function safeInnerText(page: any, selector: string): Promise<string | null> {
  try {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) return null;
    const t = await el.innerText();
    return (t ?? "").trim() || null;
  } catch {
    return null;
  }
}

async function getMetaContent(page: any, selector: string): Promise<string | null> {
  try {
    const v = await page.locator(selector).first().getAttribute("content");
    return v ?? null;
  } catch {
    return null;
  }
}

async function extractJsonLdPriceAndRating(page: any): Promise<{ price: number | null; rating?: number | null; ratingCount?: number | null } | null> {
  const scripts = await page.$$eval('script[type="application/ld+json"]', (els) =>
    (els as any[]).map((e) => (e?.textContent ?? "").trim()).filter(Boolean),
  );

  for (const text of scripts) {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : [data];

      for (const item of arr) {
        const offers = item?.offers;
        const offerObj = Array.isArray(offers) ? offers[0] : offers;

        const priceRaw = offerObj?.price ?? offerObj?.lowPrice ?? offerObj?.highPrice ?? null;
        const price = priceRaw != null ? Number(String(priceRaw).replace(/[^\d]/g, "")) : NaN;

        const ag = item?.aggregateRating || offerObj?.aggregateRating;
        const rvRaw = ag?.ratingValue ?? ag?.rating ?? null;
        const rcRaw = ag?.ratingCount ?? ag?.reviewCount ?? null;

        const rv = rvRaw != null ? Number(rvRaw) : null;
        const rc = rcRaw != null ? Number(rcRaw) : null;

        if (Number.isFinite(price) && price > 0) {
          return {
            price,
            rating: Number.isFinite(rv as number) ? rv : null,
            ratingCount: Number.isFinite(rc as number) ? Math.max(0, rc as number) : null,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function extractRatingByPlaywright(page: any): Promise<{ rating: number | null; ratingCount: number | null }> {
  const ld = await extractJsonLdPriceAndRating(page);
  if (ld) {
    return {
      rating: clampRating(ld.rating ?? null),
      ratingCount: typeof ld.ratingCount === "number" ? ld.ratingCount : null,
    };
  }
  return { rating: null, ratingCount: null };
}

function clampRating(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(5, n));
}

/**
 * Fallback heuristic: loại trả góp / tháng / voucher
 */
function pickMostLikelyPriceFromTexts(texts: string[]): number | null {
  const badHints = [
    "/tháng", "tháng", "tra góp", "trả góp", "installment", "voucher", "mã giảm", "giảm", "tiết kiệm",
  ];

  const prices: number[] = [];

  for (const t of texts) {
    const low = t.toLowerCase();
    if (badHints.some((h) => low.includes(h))) continue;

    const found = parseAllVndPrices(t);
    for (const p of found) {
      // bỏ mấy số nhỏ kiểu 300k (trả góp) hoặc ship/giảm 50k
      if (p >= 500_000 && p <= 500_000_000) prices.push(p);
    }
  }

  if (prices.length === 0) return null;

  // lấy median (ổn hơn lấy max/min)
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices[mid];
}

function parseAllVndPrices(input: string): number[] {
  if (!input) return [];
  const s = input.toLowerCase();

  const out: number[] = [];

  const kMatches = s.matchAll(/(\d+(?:[.,]\d+)?)\s*k/g);
  for (const m of kMatches) {
    const n = Number(String(m[1]).replace(",", "."));
    if (Number.isFinite(n)) out.push(Math.round(n * 1000));
  }

  const mMatches = s.matchAll(/(\d{1,3}(?:[.,]\d{3})+)/g);
  for (const m of mMatches) {
    const digits = String(m[1]).replace(/[.,]/g, "");
    const n = Number(digits);
    if (Number.isFinite(n)) out.push(n);
  }

  const dMatches = s.matchAll(/\b(\d{6,})\b/g);
  for (const m of dMatches) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) out.push(n);
  }

  return out;
}

function parseVndPrice(input: string): number | null {
  const arr = parseAllVndPrices(input);
  if (arr.length === 0) return null;
  arr.sort((a, b) => b - a);
  return arr[0];
}