import cityData from "./cities.generated.json";

// 都道府県コード(middleClassCode) -> 市区町村一覧([{code, name}, ...])
export function getCitiesForRegion(regionCode) {
  return cityData[regionCode] ?? [];
}

export function getCityName(regionCode, cityCode) {
  return getCitiesForRegion(regionCode).find((c) => c.code === cityCode)?.name ?? cityCode;
}
