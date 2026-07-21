import cityData from "./cities.generated.json";

// 都道府県コード(middleClassCode) -> 市区町村一覧([{code, name, details?}, ...])
export function getCitiesForRegion(regionCode) {
  return cityData[regionCode] ?? [];
}

export function getCityName(regionCode, cityCode) {
  return getCitiesForRegion(regionCode).find((c) => c.code === cityCode)?.name ?? cityCode;
}

// 一部の主要都市(東京23区・名古屋・京都・札幌など)だけ、さらに細かい詳細エリア区分を持つ。
// 行政区の境界とは異なる、楽天の観光エリア分類単位。
export function getDetailAreasForCity(regionCode, cityCode) {
  return getCitiesForRegion(regionCode).find((c) => c.code === cityCode)?.details ?? [];
}

export function getDetailAreaName(regionCode, cityCode, detailCode) {
  return getDetailAreasForCity(regionCode, cityCode).find((d) => d.code === detailCode)?.name ?? detailCode;
}
