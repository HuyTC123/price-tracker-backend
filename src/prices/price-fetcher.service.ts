import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import https from "https";
import { fetchProductInfoByPlaywright, ProductInfo } from "./playwright-fetcher";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isLazadaUrl(url: string) {
  return (
    url.includes("lazada.vn") ||
    url.includes("lazada.sg") ||
    url.includes("lazada.co.th") ||
    url.includes("lazada.com.my") ||
    url.includes("lazada.ph") ||
    url.includes("lazada.co.id")
  );
}
function isShopeeUrl(url: string) {
  return url.includes("shopee.");
}
function isTikiUrl(url: string) {
  return url.includes("tiki.vn");
}
function isTGDDUrl(url: string) {
  return url.includes("thegioididong.com") || url.includes("tgdd.vn");
}

@Injectable()
export class PriceFetcherService {
  private readonly logger = new Logger(PriceFetcherService.name);
  private readonly http: AxiosInstance;

  constructor() {
    const allowInsecure = String(process.env.ALLOW_INSECURE_TLS).toLowerCase() === "true";

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !allowInsecure,
    });

    this.http = axios.create({
      timeout: 25000,
      maxRedirects: 5,
      httpsAgent,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      validateStatus: () => true,
    });

    if (allowInsecure) {
      this.logger.warn("ALLOW_INSECURE_TLS=true => HTTPS cert verification is disabled (DEV ONLY).");
    }
  }

  async fetchInfo(url: string): Promise<ProductInfo> {
    if (!url) throw new Error("Missing product url");

    const isShopee = isShopeeUrl(url);
    const isTiki = isTikiUrl(url);
    const isLazada = isLazadaUrl(url);

    // Lazada thường JS + anti-bot => đi Playwright luôn
    if (isLazada) {
      this.logger.warn(`Lazada detected => use Playwright directly url=${url}`);
      return fetchProductInfoByPlaywright(url);
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.http.get(url);

        if (res.status >= 400) throw new Error(`HTTP ${res.status}`);

        const html = String(res.data ?? "");
        if (!html) throw new Error("Empty HTML");

        // parse price + rating
        const info = this.extractInfoFromHtml(html, url);
        if (!info.price || Number.isNaN(info.price)) throw new Error("Cannot parse price from HTML");

        return info;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        this.logger.error(
          `fetchInfo failed (attempt ${attempt}/${maxAttempts}) url=${url} err=${msg}`,
        );

        const shouldFallback =
          msg.toLowerCase().includes("timeout") ||
          msg.toLowerCase().includes("parse") ||
          msg.toLowerCase().includes("cannot parse") ||
          msg.toLowerCase().includes("empty html");

        // Shopee/Tiki hay bị HTML thiếu data => fallback Playwright
        if ((isShopee || isTiki) && shouldFallback && attempt >= 2) {
          try {
            this.logger.warn(`Fallback Playwright for ${isShopee ? "Shopee" : "Tiki"} url=${url}`);
            return await fetchProductInfoByPlaywright(url);
          } catch (e: any) {
            this.logger.error(`Playwright fallback failed url=${url} err=${e?.message ?? e}`);
          }
        }

        if (attempt === maxAttempts) break;
        await sleep(attempt === 1 ? 300 : 700);
      }
    }

    // last resort playwright cho Shopee/Tiki/TGDD
    if (isShopee || isTiki || isTGDDUrl(url)) {
      this.logger.warn(`Last attempt Playwright url=${url}`);
      return fetchProductInfoByPlaywright(url);
    }

    throw new Error(`fetchInfo failed after ${maxAttempts} attempts`);
  }

  private extractInfoFromHtml(html: string, url: string): ProductInfo {
    // ✅ Tiki: ưu tiên JSON-LD
    if (isTikiUrl(url)) {
      const tiki = this.extractTikiInfo(html);
      if (Number.isFinite(tiki.price) && tiki.price > 0) return tiki;
    }

    // ✅ TGDD: hay có nhiều số gây nhiễu => dùng extractor riêng
    if (isTGDDUrl(url)) {
      const tgdd = this.extractTGDDInfo(html);
      if (Number.isFinite(tgdd.price) && tgdd.price > 0) return tgdd;
    }

    const $ = cheerio.load(html);

    // PRICE meta
    const metaPrice =
      $('meta[property="product:price:amount"]').attr("content") ||
      $('meta[property="og:price:amount"]').attr("content") ||
      $('meta[name="price"]').attr("content");

    const raw =
      metaPrice ||
      $('[data-test="price"]').first().text() ||
      $(".price").first().text() ||
      $("body").text();

    // ✅ rating fallback generic (nhiều site không có JSON-LD)
    const { rating, ratingCount } = this.extractRatingGeneric(html);

    return {
      price: this.parsePrice(raw ?? ""),
      rating,
      ratingCount,
    };
  }

  // ===== TIKI =====
  private extractTikiInfo(html: string): ProductInfo {
    const ldBlocks = [
      ...html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
      ),
    ];

    for (const m of ldBlocks) {
      const raw = (m[1] ?? "").trim();
      if (!raw) continue;

      try {
        const data = JSON.parse(raw);
        const arr = Array.isArray(data) ? data : [data];

        for (const item of arr) {
          const offers = item?.offers;
          const ag = item?.aggregateRating || offers?.aggregateRating;

          const priceRaw = offers?.price ?? offers?.lowPrice ?? null;
          const price = priceRaw != null ? Number(String(priceRaw).replace(/[^\d]/g, "")) : NaN;

          const rvRaw = ag?.ratingValue ?? ag?.rating ?? null;
          const rcRaw = ag?.ratingCount ?? ag?.reviewCount ?? null;

          const rv = rvRaw != null ? Number(rvRaw) : null;
          const rc = rcRaw != null ? Number(rcRaw) : null;

          if (Number.isFinite(price) && price > 0) {
            return {
              price,
              rating: clampRating(rv),
              ratingCount: Number.isFinite(rc as number) ? Math.max(0, rc as number) : null,
            };
          }
        }
      } catch {
        // ignore
      }
    }

    // fallback: tìm rating/price trong HTML JSON text
    const price = this.parsePriceFromJsonText(html);
    const { rating, ratingCount } = this.extractRatingGeneric(html);

    if (Number.isFinite(price) && price > 0) return { price, rating, ratingCount };

    // fallback regex price
    const m1 = html.match(/"special_price"\s*:\s*([0-9]{4,})/);
    const m2 = html.match(/"price"\s*:\s*([0-9]{4,})/);
    const m3 = html.match(/"final_price"\s*:\s*([0-9]{4,})/);
    const p = Number(m1?.[1] ?? m2?.[1] ?? m3?.[1] ?? NaN);

    return { price: p, rating, ratingCount };
  }

  // ===== TGDD =====
  private extractTGDDInfo(html: string): ProductInfo {
    const $ = cheerio.load(html);

    // TGDD thường có block giá hiển thị
    const candidates: string[] = [];

    // vài selector hay gặp (không chắc 100% nhưng an toàn)
    candidates.push(
      $(".price-show").first().text(),
      $(".box-price-present").first().text(),
      $(".price").first().text(),
      $('[class*="price"]').first().text(),
    );

    // meta
    candidates.push(
      $('meta[property="product:price:amount"]').attr("content") || "",
      $('meta[property="og:price:amount"]').attr("content") || "",
      $('meta[name="price"]').attr("content") || "",
    );

    // JSON text trong script (nếu có)
    const jsonPrice = this.parsePriceFromJsonText(html);
    if (Number.isFinite(jsonPrice) && jsonPrice > 0) {
      const { rating, ratingCount } = this.extractRatingGeneric(html);
      return { price: jsonPrice, rating, ratingCount };
    }

    // fallback: quét body nhưng dùng thuật toán chọn “giá hợp lý”
    candidates.push($("body").text());

    const price = pickBestPriceSmart(candidates.join("\n"));
    const { rating, ratingCount } = this.extractRatingGeneric(html);

    return { price: price ?? NaN, rating, ratingCount };
  }

  // ===== rating generic =====
  private extractRatingGeneric(html: string): { rating: number | null; ratingCount: number | null } {
    // 1) ưu tiên key kiểu JSON
    // ratingValue / ratingCount / reviewCount
    const rv1 = html.match(/"ratingValue"\s*:\s*"?(?<v>\d+(?:\.\d+)?)"?/i)?.groups?.v;
    const rc1 = html.match(/"ratingCount"\s*:\s*"?(?<c>\d{1,8})"?/i)?.groups?.c;
    const rvc = html.match(/"reviewCount"\s*:\s*"?(?<c>\d{1,8})"?/i)?.groups?.c;

    let rating: number | null = rv1 != null ? Number(rv1) : null;
    let ratingCount: number | null = null;

    const cnt = rc1 ?? rvc ?? null;
    ratingCount = cnt != null ? Number(cnt) : null;

    rating = clampRating(rating);
    if (ratingCount != null && !Number.isFinite(ratingCount)) ratingCount = null;
    if (ratingCount != null) ratingCount = Math.max(0, Math.trunc(ratingCount));

    return { rating, ratingCount };
  }

  private parsePriceFromJsonText(html: string): number {
    // bắt nhiều key phổ biến
    const keys = [
      /"salePrice"\s*:\s*"?(?<p>\d{4,})"?/i,
      /"specialPrice"\s*:\s*"?(?<p>\d{4,})"?/i,
      /"final_price"\s*:\s*"?(?<p>\d{4,})"?/i,
      /"special_price"\s*:\s*"?(?<p>\d{4,})"?/i,
      /"price"\s*:\s*"?(?<p>\d{4,})"?/i,
    ];

    for (const re of keys) {
      const m = html.match(re) as any;
      const p = m?.groups?.p ? Number(String(m.groups.p).replace(/[^\d]/g, "")) : NaN;
      if (Number.isFinite(p) && p > 0) return p;
    }
    return NaN;
  }

  // ===== price parser (giữ như bạn nhưng dùng thêm smart picker ở TGDD) =====
  private parsePrice(input: string): number {
    if (!input) return NaN;

    const s = input.toLowerCase().replace(/\s/g, "");

    const k = s.match(/(\d+(?:[.,]\d+)?)k/);
    if (k) {
      const n = Number(k[1].replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 1000) : NaN;
    }

    const m = s.match(/(\d{1,3}([.,]\d{3})+)/);
    if (m) {
      const digits = m[1].replace(/[.,]/g, "");
      const n = Number(digits);
      return Number.isFinite(n) ? n : NaN;
    }

    const digits = s.replace(/[^\d]/g, "");
    if (digits.length < 4) return NaN;

    const n = Number(digits);
    return Number.isFinite(n) ? n : NaN;
  }
}

function clampRating(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(5, n));
}

/**
 * ✅ Smart picker:
 * - lấy tất cả giá VND trong text
 * - chọn giá “phổ biến nhất” (mode) theo bucket 1.000đ
 * - nếu tie: chọn giá nhỏ hơn (sale price thường nhỏ hơn)
 */
function pickBestPriceSmart(text: string): number | null {
  if (!text) return null;
  const s = text.toLowerCase();

  const prices: number[] = [];

  // dạng 1.234.567 hoặc 1,234,567
  const mMatches = s.matchAll(/(\d{1,3}(?:[.,]\d{3})+)/g);
  for (const m of mMatches) {
    const digits = String(m[1]).replace(/[.,]/g, "");
    const n = Number(digits);
    if (Number.isFinite(n)) prices.push(n);
  }

  // dạng 1234567
  const dMatches = s.matchAll(/\b(\d{6,})\b/g);
  for (const m of dMatches) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) prices.push(n);
  }

  // lọc range hợp lý
  const cleaned = prices.filter((p) => p >= 10_000 && p <= 500_000_000);
  if (cleaned.length === 0) return null;

  // bucket theo 1000
  const freq = new Map<number, number>();
  for (const p of cleaned) {
    const b = Math.round(p / 1000) * 1000;
    freq.set(b, (freq.get(b) ?? 0) + 1);
  }

  let bestBucket: number | null = null;
  let bestCount = -1;

  for (const [b, c] of freq.entries()) {
    if (c > bestCount) {
      bestCount = c;
      bestBucket = b;
    } else if (c === bestCount && bestBucket != null && b < bestBucket) {
      // tie => lấy nhỏ hơn
      bestBucket = b;
    }
  }

  return bestBucket;
}