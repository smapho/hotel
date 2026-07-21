// lib/hotels/areaClasses.raw.json (GetAreaClassの生レスポンス)から
// regions.js と cities.generated.json を生成するワンショットスクリプト。
// 実行方法: node scripts/generateAreaData.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const raw = JSON.parse(readFileSync(path.join(projectRoot, "lib/hotels/areaClasses.raw.json"), "utf-8"));
const middleClasses = raw.areaClasses.largeClasses[0].largeClass.middleClasses;

const regions = [];
const cities = {};

for (const { middleClass } of middleClasses) {
  regions.push({ code: middleClass.middleClassCode, name: middleClass.middleClassName });
  cities[middleClass.middleClassCode] = (middleClass.smallClasses ?? []).map(({ smallClass }) => ({
    code: smallClass.smallClassCode,
    name: smallClass.smallClassName,
  }));
}

const regionsJs = `// 楽天トラベル地区コードAPI(GetAreaClass)から生成。scripts/generateAreaData.mjs で再生成できる。
export const REGIONS = ${JSON.stringify(regions, null, 2)};

export function getRegionName(code) {
  return REGIONS.find((r) => r.code === code)?.name ?? code;
}
`;

writeFileSync(path.join(projectRoot, "lib/hotels/regions.js"), regionsJs);
writeFileSync(path.join(projectRoot, "lib/hotels/cities.generated.json"), JSON.stringify(cities, null, 2));

console.log(`regions.js: ${regions.length}都道府県`);
console.log(`cities.generated.json: ${Object.values(cities).reduce((a, c) => a + c.length, 0)}市区町村`);
