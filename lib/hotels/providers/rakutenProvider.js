import { addDays, getNightsInRange } from "../dateUtils";
import { getRegionName } from "../regions";
import { getCityName, getDetailAreaName } from "../cities";
import { getRegionCoordinates } from "../regionCoordinates";
import { getCachedNight, saveCachedNight } from "../cache";

// 2026年5月の楽天ウェブサービス刷新により、ドメインが app.rakuten.co.jp から openapi.rakuten.co.jp に変更された。
const ENDPOINT = "https://openapi.rakuten.co.jp/engine/api/Travel/VacantHotelSearch/20170426";

// 刷新後はアプリのアプリURL/許可されたWebサイトに登録したドメインとReferer/Originが一致している必要がある。
// VERCEL_URLはデプロイごとに変わるハッシュ付きURLなので使わず、プロジェクトの安定した本番ドメインである
// VERCEL_PROJECT_PRODUCTION_URL を優先する(プレビューデプロイからでもこの値は変わらない)。
function getRefererOrigin() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "localhost:3000";
  return `https://${host}`;
}

// 楽天のTravel系APIはレスポンスが「[{ key: {...} }, { key2: {...} }]」という
// 単一キーオブジェクトの配列でラップされている場合があるため、平坦なオブジェクトに正規化する。
function unwrap(node) {
  if (Array.isArray(node)) {
    return node.reduce((acc, item) => ({ ...acc, ...item }), {});
  }
  return node ?? {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// searchPattern=1(プランごと)では、hotels[i]は「1ホテル+1プラン」を表す1件のエントリになる
// (同じホテルがプラン数だけ繰り返し出現する)。roomInfoは複数プランの配列ではなく、
// そのプラン1件分のroomBasicInfo/dailyChargeが単一キー配列でラップされたもの。
// { hotelNo, hotelName, ..., rooms: [{..., price}] } の配列(1要素=1プラン)に正規化する。
function parseNightlyHotels(data) {
  const rawHotels = data.hotels ?? [];
  const hotels = [];

  for (const rawEntry of rawHotels) {
    const hotelObj = unwrap(rawEntry.hotel ?? rawEntry);
    const basicInfo = unwrap(hotelObj.hotelBasicInfo);
    const hotelNo = String(basicInfo.hotelNo);

    const roomObj = unwrap(hotelObj.roomInfo);
    const roomBasicInfo = unwrap(roomObj.roomBasicInfo);
    const dailyCharge = unwrap(roomObj.dailyCharge);
    // planNameはnullのプランもあるため必須にしない(roomNameと料金があれば表示できる)。
    if (!roomBasicInfo.roomName || dailyCharge.total == null) continue;

    hotels.push({
      hotelNo,
      hotelName: basicInfo.hotelName,
      address: `${basicInfo.address1 ?? ""}${basicInfo.address2 ?? ""}`,
      hotelInformationUrl: basicInfo.hotelInformationUrl ?? null,
      thumbnailUrl: basicInfo.hotelThumbnailUrl ?? null,
      reviewAverage: basicInfo.reviewAverage ?? null,
      rooms: [
        {
          planId: roomBasicInfo.planId ?? null,
          roomClass: roomBasicInfo.roomClass ?? null,
          roomName: roomBasicInfo.roomName,
          planName: roomBasicInfo.planName,
          reserveUrl: roomBasicInfo.reserveUrl ?? null,
          price: dailyCharge.total,
        },
      ],
    });
  }
  return hotels;
}

async function fetchNightFromApi({ regionCode, cityCode, detailCode, night, adultNum, roomNum, applicationId, affiliateId, accessKey }) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("applicationId", applicationId);
  if (accessKey) url.searchParams.set("accessKey", accessKey);
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);
  url.searchParams.set("format", "json");
  url.searchParams.set("checkinDate", night);
  url.searchParams.set("checkoutDate", addDays(night, 1));

  if (cityCode) {
    // 市区町村(smallClassCode)が指定されている場合は、都道府県+市区町村のクラスコードで検索する。
    // detailCode(detailClassCode)が指定されていれば、さらに詳細エリアまで絞り込む。
    url.searchParams.set("largeClassCode", "japan");
    url.searchParams.set("middleClassCode", regionCode);
    url.searchParams.set("smallClassCode", cityCode);
    if (detailCode) url.searchParams.set("detailClassCode", detailCode);
  } else {
    // 市区町村未指定の場合は、都道府県の代表都市の緯度経度+検索半径(API上限の3.0km)にフォールバックする。
    const coordinates = getRegionCoordinates(regionCode);
    if (!coordinates) {
      throw new Error(`地域コード "${regionCode}" の緯度経度が未登録です。`);
    }
    url.searchParams.set("latitude", String(coordinates.latitude));
    url.searchParams.set("longitude", String(coordinates.longitude));
    url.searchParams.set("searchRadius", "3.0");
    url.searchParams.set("datumType", "1");
  }

  url.searchParams.set("adultNum", String(adultNum));
  url.searchParams.set("roomNum", String(roomNum));
  // searchPattern=1(プランごと)は件数上限(30)まで安い順に近い結果が並ぶため、
  // 多様なホテル/プランを拾えるよう上限いっぱいにしておく。
  url.searchParams.set("hits", "30");
  url.searchParams.set("responseType", "large");
  // searchPattern=1: 施設ごとに1部屋だけでなく、プラン(部屋タイプ)ごとに結果を返す。
  url.searchParams.set("searchPattern", "1");

  const origin = getRefererOrigin();
  const res = await fetch(url.toString(), {
    headers: {
      Referer: `${origin}/`,
      Origin: origin,
    },
  });
  const bodyText = await res.text();
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`楽天トラベルAPI呼び出しに失敗しました (status=${res.status}): ${bodyText.slice(0, 300)}`);
  }
  if (data.error) {
    throw new Error(`楽天トラベルAPIエラー (status=${res.status}): ${data.error_description || data.error}`);
  }
  if (!res.ok) {
    throw new Error(`楽天トラベルAPI呼び出しに失敗しました (status=${res.status}): ${bodyText.slice(0, 300)}`);
  }
  return parseNightlyHotels(data);
}

// VacantHotelSearchは「1回の呼び出し=1泊分の空室検索」のため、
// 期間中の料金を日毎に取得するには宿泊日ごとに呼び出して結果をマージする。
// Supabaseにキャッシュがあればそちらを優先し、実APIの呼び出し回数(レート制限対策)を減らす。
export async function searchHotels({ regionCode, cityCode, detailCode, checkinDate, checkoutDate, adultNum = 1, roomNum = 1 }) {
  const applicationId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!applicationId || !accessKey) {
    throw new Error(
      "RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY の両方が必要です(2026年5月の楽天API仕様変更でaccessKeyが必須になりました)。.env.local を確認してください。"
    );
  }

  // regionCode/cityCode/detailCodeをまとめてキャッシュキーにする(絞り込み単位ごとに結果が変わるため)。
  const areaKey = [regionCode, cityCode, detailCode].filter(Boolean).join(":");
  const nights = getNightsInRange(checkinDate, checkoutDate);
  const hotelMap = new Map(); // hotelNo -> { ...basicInfo, rooms: Map(roomKey -> {..., dailyRates: []}) }
  let calledApi = false;

  for (const night of nights) {
    let nightlyHotels = await getCachedNight(areaKey, night);
    if (!nightlyHotels) {
      // 呼び出し間隔を空けるのは、実際にAPIを叩いた直後のみでよい(キャッシュヒット時は不要)。
      // 2026年5月の刷新でレート制限が厳格化されたため、1.5秒以上空ける。
      if (calledApi) await sleep(1500);
      nightlyHotels = await fetchNightFromApi({ regionCode, cityCode, detailCode, night, adultNum, roomNum, applicationId, affiliateId, accessKey });
      calledApi = true;
      await saveCachedNight(areaKey, night, nightlyHotels);
    }

    for (const nightlyHotel of nightlyHotels) {
      if (!hotelMap.has(nightlyHotel.hotelNo)) {
        hotelMap.set(nightlyHotel.hotelNo, { ...nightlyHotel, rooms: new Map() });
      }
      const hotelEntry = hotelMap.get(nightlyHotel.hotelNo);

      for (const room of nightlyHotel.rooms) {
        // planIdはプランを一意に識別できるため優先して使う。無い場合のみroomClass+planNameで代用する
        // (同名の別プランが同じキーに衝突し、料金が二重集計されるのを防ぐ)。
        const roomKey = room.planId ?? `${room.roomClass ?? room.roomName}__${room.planName}`;
        if (!hotelEntry.rooms.has(roomKey)) {
          hotelEntry.rooms.set(roomKey, {
            roomClass: room.roomClass,
            roomName: room.roomName,
            planName: room.planName,
            reserveUrl: room.reserveUrl,
            adultNum,
            roomNum,
            dailyRates: [],
          });
        }
        const roomEntry = hotelEntry.rooms.get(roomKey);
        // 同じ日付が既にあれば追加しない(同一プランが1回の検索で重複して返るケースへの防御)。
        if (!roomEntry.dailyRates.some((r) => r.date === night)) {
          roomEntry.dailyRates.push({ date: night, price: room.price });
        }
      }
    }
  }

  const hotels = Array.from(hotelMap.values()).map((h) => ({
    ...h,
    rooms: Array.from(h.rooms.values())
      .filter((room) => room.dailyRates.length > 0)
      .map((room) => {
        const prices = room.dailyRates.map((d) => d.price);
        return {
          ...room,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          totalForPeriod: prices.reduce((a, b) => a + b, 0),
        };
      }),
  }));

  return {
    provider: "rakuten",
    regionCode,
    regionName: getRegionName(regionCode),
    cityCode: cityCode ?? null,
    cityName: cityCode ? getCityName(regionCode, cityCode) : null,
    detailCode: detailCode ?? null,
    detailAreaName: cityCode && detailCode ? getDetailAreaName(regionCode, cityCode, detailCode) : null,
    checkinDate,
    checkoutDate,
    nights,
    hotels,
  };
}
