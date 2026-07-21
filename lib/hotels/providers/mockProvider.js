import { getNightsInRange, isWeekendNight } from "../dateUtils";
import { getRegionName } from "../regions";
import { getCityName, getDetailAreaName } from "../cities";

const HIGH_DEMAND_REGIONS = new Set(["tokyo", "osaka", "kyoto", "kanagawa", "okinawa"]);
const MID_DEMAND_REGIONS = new Set([
  "hokkaido",
  "aichi",
  "hukuoka",
  "hyogo",
  "tiba",
  "ishikawa",
  "nagano",
]);

const ROOM_TYPES = [
  { roomClass: "single", roomName: "シングル", planName: "室料のみプラン", multiplier: 0.65 },
  { roomClass: "double", roomName: "ダブル", planName: "室料のみプラン", multiplier: 0.9 },
  { roomClass: "twin", roomName: "ツイン", planName: "朝食付きプラン", multiplier: 1.0 },
  { roomClass: "japanese", roomName: "和室", planName: "夕朝食付きプラン", multiplier: 1.2 },
  { roomClass: "deluxe-twin", roomName: "デラックスツイン", planName: "朝食付きプラン", multiplier: 1.5 },
  { roomClass: "suite", roomName: "スイート", planName: "室料のみプラン", multiplier: 2.3 },
];

const HOTEL_NAME_TEMPLATES = [
  (region) => `${region}グランドホテル`,
  (region) => `${region}シティホテル`,
  (region) => `ホテル${region}ベイサイド`,
  (region) => `${region}駅前ビジネスホテル`,
  (region) => `${region}温泉旅館 花の湯`,
];

// 文字列から決定的な疑似乱数(0〜1)を作る。同じ入力なら常に同じ結果になる。
function seededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function getRegionBasePrice(regionCode) {
  if (HIGH_DEMAND_REGIONS.has(regionCode)) return 14000;
  if (MID_DEMAND_REGIONS.has(regionCode)) return 10500;
  return 8000;
}

function getSeasonMultiplier(dateStr) {
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  const isGoldenWeek = month === 4 && day >= 27 ? true : month === 5 && day <= 6;
  const isObon = month === 8 && day >= 11 && day <= 16;
  const isYearEnd = (month === 12 && day >= 28) || (month === 1 && day <= 3);
  if (isGoldenWeek || isObon || isYearEnd) return 1.35;
  if (month === 8 || month === 3) return 1.1;
  return 1.0;
}

function buildDailyRates({ hotelIndex, roomType, regionCode, nights }) {
  const basePrice = getRegionBasePrice(regionCode);
  return nights.map((date) => {
    const seed = `${regionCode}-${hotelIndex}-${roomType.roomClass}-${date}`;
    const noise = 0.9 + seededRandom(seed) * 0.3; // 0.9〜1.2
    const weekendMultiplier = isWeekendNight(date) ? 1.25 : 1.0;
    const seasonMultiplier = getSeasonMultiplier(date);
    const price =
      basePrice * roomType.multiplier * weekendMultiplier * seasonMultiplier * noise;
    // 100円単位に丸める
    return { date, price: Math.round(price / 100) * 100 };
  });
}

export async function searchHotels({ regionCode, cityCode, detailCode, checkinDate, checkoutDate, adultNum = 1, roomNum = 1 }) {
  const nights = getNightsInRange(checkinDate, checkoutDate);
  const regionName = getRegionName(regionCode);
  const cityName = cityCode ? getCityName(regionCode, cityCode) : null;
  const detailAreaName = cityCode && detailCode ? getDetailAreaName(regionCode, cityCode, detailCode) : null;
  const areaLabel = [regionName, cityName, detailAreaName].filter(Boolean).join(" ");

  const hotels = HOTEL_NAME_TEMPLATES.map((nameFn, hotelIndex) => {
    const hotelSeed = `${regionCode}-${cityCode ?? ""}-${detailCode ?? ""}-${hotelIndex}`;
    // ホテルごとに提供する部屋タイプを3〜4種類に絞る
    const roomCount = 3 + Math.floor(seededRandom(hotelSeed) * 2);
    const rooms = ROOM_TYPES.slice(0, roomCount).map((roomType) => {
      const dailyRates = buildDailyRates({ hotelIndex, roomType, regionCode, nights });
      const prices = dailyRates.map((d) => d.price);
      return {
        roomClass: roomType.roomClass,
        roomName: roomType.roomName,
        planName: roomType.planName,
        adultNum,
        roomNum,
        dailyRates,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        totalForPeriod: prices.reduce((a, b) => a + b, 0),
      };
    });

    return {
      hotelNo: `mock-${regionCode}-${cityCode ?? ""}-${detailCode ?? ""}-${hotelIndex}`,
      hotelName: nameFn(areaLabel),
      address: `${areaLabel} ○○町${hotelIndex + 1}丁目`,
      hotelInformationUrl: null,
      thumbnailUrl: null,
      reviewAverage: Number((3.5 + seededRandom(hotelSeed + "-review") * 1.4).toFixed(1)),
      rooms,
    };
  });

  return {
    provider: "mock",
    regionCode,
    regionName,
    cityCode: cityCode ?? null,
    cityName,
    detailCode: detailCode ?? null,
    detailAreaName,
    checkinDate,
    checkoutDate,
    nights,
    hotels,
  };
}
