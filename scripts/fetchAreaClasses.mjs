// 楽天トラベル地区コードAPI(GetAreaClass)から全国の都道府県×市区町村コードを取得し、
// lib/hotels/areaClasses.generated.json に保存するワンショットスクリプト。
// 実行方法: .env.local に RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY を設定した上で
//   node scripts/fetchAreaClasses.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const applicationId = process.env.RAKUTEN_APP_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
if (!applicationId || !accessKey) {
  console.error("RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が .env.local に見つかりません。");
  process.exit(1);
}

const url = new URL("https://openapi.rakuten.co.jp/engine/api/Travel/GetAreaClass/20140210");
url.searchParams.set("applicationId", applicationId);
url.searchParams.set("accessKey", accessKey);
url.searchParams.set("format", "json");

const refererOrigin = process.env.RAKUTEN_REFERER_ORIGIN || "https://hotel-ashen-seven.vercel.app";
const res = await fetch(url.toString(), {
  headers: {
    Referer: `${refererOrigin}/`,
    Origin: refererOrigin,
  },
});
const bodyText = await res.text();

if (!res.ok) {
  console.error(`GetAreaClass呼び出し失敗 (status=${res.status}):`, bodyText.slice(0, 500));
  process.exit(1);
}

const outPath = path.join(projectRoot, "lib/hotels/areaClasses.raw.json");
writeFileSync(outPath, bodyText);
console.log(`生レスポンスを保存しました: ${outPath}`);
console.log(bodyText.slice(0, 2000));
