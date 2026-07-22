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

function getCredentials() {
  const applicationId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!applicationId || !accessKey) {
    throw new Error(
      "RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY の両方が必要です(2026年5月の楽天API仕様変更でaccessKeyが必須になりました)。.env.local を確認してください。"
    );
  }
  return { applicationId, affiliateId, accessKey };
}

// hotels[i]は「1ホテル+1プラン」を表す1件のエントリ(searchPattern=0/1どちらでも同じ形)。
// roomInfoは複数プランの配列ではなく、1プラン分のroomBasicInfo/dailyChargeが単一キー配列でラップされたもの。
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
          withBreakfast: roomBasicInfo.withBreakfastFlag === 1,
          withDinner: roomBasicInfo.withDinnerFlag === 1,
          payment: roomBasicInfo.payment ?? null,
          pointRate: roomBasicInfo.pointRate ?? null,
          planContents: roomBasicInfo.planContents ?? null,
        },
      ],
    });
  }
  return hotels;
}

// locationParamsは呼び出し元が largeClassCode/middleClassCode/smallClassCode(+detailClassCode)、
// latitude/longitude/searchRadius/datumType、または hotelNo のいずれかを詰めて渡す。
async function callVacantHotelSearch({ locationParams, searchPattern, night, adultNum, roomNum, applicationId, affiliateId, accessKey }) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("applicationId", applicationId);
  if (accessKey) url.searchParams.set("accessKey", accessKey);
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);
  url.searchParams.set("format", "json");
  url.searchParams.set("checkinDate", night);
  url.searchParams.set("checkoutDate", addDays(night, 1));

  for (const [key, val] of Object.entries(locationParams)) {
    url.searchParams.set(key, String(val));
  }

  url.searchParams.set("adultNum", String(adultNum));
  url.searchParams.set("roomNum", String(roomNum));
  url.searchParams.set("hits", "30");
  url.searchParams.set("responseType", "large");
  url.searchParams.set("searchPattern", String(searchPattern));

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
  // 404 Data Not Found は「その条件(日付・ホテル等)に一致する空室が無い」という正常な応答。
  // hotelNo指定の検索では特定の1泊だけ満室のケースがあり得るため、エラーではなく0件として扱う。
  if (res.status === 404) {
    return [];
  }
  if (data.error) {
    throw new Error(`楽天トラベルAPIエラー (status=${res.status}): ${data.error_description || data.error}`);
  }
  if (!res.ok) {
    throw new Error(`楽天トラベルAPI呼び出しに失敗しました (status=${res.status}): ${bodyText.slice(0, 300)}`);
  }
  return parseNightlyHotels(data);
}

function buildLocationParams({ regionCode, cityCode, detailCode }) {
  if (cityCode) {
    // 市区町村(smallClassCode)が指定されている場合は、都道府県+市区町村のクラスコードで検索する。
    // detailCode(detailClassCode)が指定されていれば、さらに詳細エリアまで絞り込む。
    const params = { largeClassCode: "japan", middleClassCode: regionCode, smallClassCode: cityCode };
    if (detailCode) params.detailClassCode = detailCode;
    return params;
  }
  // 市区町村未指定の場合は、都道府県の代表都市の緯度経度+検索半径(API上限の3.0km)にフォールバックする。
  const coordinates = getRegionCoordinates(regionCode);
  if (!coordinates) {
    throw new Error(`地域コード "${regionCode}" の緯度経度が未登録です。`);
  }
  return { latitude: coordinates.latitude, longitude: coordinates.longitude, searchRadius: "3.0", datumType: "1" };
}

// VacantHotelSearchは「1回の呼び出し=1泊分の空室検索」のため、期間中の料金を日毎に取得するには
// 宿泊日ごとに呼び出して結果をマージする。Supabaseにキャッシュがあればそちらを優先し、
// 実APIの呼び出し回数(レート制限対策)を減らす。cacheKeyPrefixが無い場合はキャッシュを使わない。
async function fetchAndMergeNights({ nights, cacheKeyPrefix, fetchNight, adultNum, roomNum }) {
  const hotelMap = new Map(); // hotelNo -> { ...basicInfo, rooms: Map(roomKey -> {..., dailyRates: []}) }
  let calledApi = false;

  for (const night of nights) {
    let nightlyHotels = cacheKeyPrefix ? await getCachedNight(cacheKeyPrefix, night) : null;
    if (!nightlyHotels) {
      // 呼び出し間隔を空けるのは、実際にAPIを叩いた直後のみでよい(キャッシュヒット時は不要)。
      // 2026年5月の刷新でレート制限が厳格化されたため、1.5秒以上空ける。
      if (calledApi) await sleep(1500);
      nightlyHotels = await fetchNight(night);
      calledApi = true;
      if (cacheKeyPrefix) await saveCachedNight(cacheKeyPrefix, night, nightlyHotels);
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
            withBreakfast: room.withBreakfast,
            withDinner: room.withDinner,
            payment: room.payment,
            pointRate: room.pointRate,
            planContents: room.planContents,
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

  return Array.from(hotelMap.values()).map((h) => ({
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
}

// 地域検索(都道府県/市区町村/詳細エリア、または代表都市の緯度経度)。
// searchPattern=0(施設ごと)で、ホテルの多様性(価格帯の広がり)を優先する。
// searchPattern=1(プランごと)にすると、プラン数の多いカプセルホテル等が上位30枠を
// 占有してしまい、価格帯が偏ることが実データで確認されたため使わない。
export async function searchHotels({ regionCode, cityCode, detailCode, checkinDate, checkoutDate, adultNum = 1, roomNum = 1 }) {
  const { applicationId, affiliateId, accessKey } = getCredentials();
  const locationParams = buildLocationParams({ regionCode, cityCode, detailCode });
  const nights = getNightsInRange(checkinDate, checkoutDate);
  const cacheKeyPrefix = [regionCode, cityCode, detailCode].filter(Boolean).join(":");

  const hotels = await fetchAndMergeNights({
    nights,
    cacheKeyPrefix,
    adultNum,
    roomNum,
    fetchNight: (night) =>
      callVacantHotelSearch({ locationParams, searchPattern: 0, night, adultNum, roomNum, applicationId, affiliateId, accessKey }),
  });

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
    adultNum,
    roomNum,
    nights,
    hotels,
  };
}

// 特定ホテル(hotelNo指定)の全プランを取得する。hotelNoでの検索は他ホテルと30件枠を
// 取り合わないため、searchPattern=1(プランごと)で呼んでもそのホテル自身の全プランが返る。
export async function getHotelRooms({ hotelNo, checkinDate, checkoutDate, adultNum = 1, roomNum = 1 }) {
  const { applicationId, affiliateId, accessKey } = getCredentials();
  const nights = getNightsInRange(checkinDate, checkoutDate);

  const hotels = await fetchAndMergeNights({
    nights,
    cacheKeyPrefix: `hotel:${hotelNo}`,
    adultNum,
    roomNum,
    fetchNight: (night) =>
      callVacantHotelSearch({
        locationParams: { hotelNo },
        searchPattern: 1,
        night,
        adultNum,
        roomNum,
        applicationId,
        affiliateId,
        accessKey,
      }),
  });

  return { provider: "rakuten", hotelNo, checkinDate, checkoutDate, nights, rooms: hotels[0]?.rooms ?? [] };
}
