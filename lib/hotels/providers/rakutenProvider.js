import { addDays, getNightsInRange } from "../dateUtils";
import { getRegionName } from "../regions";

const ENDPOINT = "https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426";

// 楽天のTravel系APIはレスポンスが「[{ key: {...} }, { key2: {...} }]」という
// 単一キーオブジェクトの配列でラップされている場合があるため、平坦なオブジェクトに正規化する。
function unwrap(node) {
  if (Array.isArray(node)) {
    return node.reduce((acc, item) => ({ ...acc, ...item }), {});
  }
  return node ?? {};
}

async function fetchNight({ regionCode, night, adultNum, roomNum, applicationId, affiliateId }) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("applicationId", applicationId);
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);
  url.searchParams.set("format", "json");
  url.searchParams.set("checkinDate", night);
  url.searchParams.set("checkoutDate", addDays(night, 1));
  url.searchParams.set("largeClassCode", "japan");
  url.searchParams.set("middleClassCode", regionCode);
  url.searchParams.set("adultNum", String(adultNum));
  url.searchParams.set("roomNum", String(roomNum));
  url.searchParams.set("hits", "10");
  url.searchParams.set("responseType", "large");
  url.searchParams.set("datumType", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`楽天トラベルAPI呼び出しに失敗しました (status=${res.status})`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`楽天トラベルAPIエラー: ${data.error_description || data.error}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// VacantHotelSearchは「1回の呼び出し=1泊分の空室検索」のため、
// 期間中の料金を日毎に取得するには宿泊日ごとに呼び出して結果をマージする。
// 楽天APIのレート制限(目安: 1リクエスト/秒)に配慮し、逐次実行+ウェイトを挟む。
export async function searchHotels({ regionCode, checkinDate, checkoutDate, adultNum = 1, roomNum = 1 }) {
  const applicationId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  if (!applicationId) {
    throw new Error("RAKUTEN_APP_ID が設定されていません。.env.local を確認してください。");
  }

  const nights = getNightsInRange(checkinDate, checkoutDate);
  const hotelMap = new Map(); // hotelNo -> { hotelBasicInfo, rooms: Map(roomKey -> {..., dailyRates: []}) }

  for (let i = 0; i < nights.length; i++) {
    const night = nights[i];
    const data = await fetchNight({ regionCode, night, adultNum, roomNum, applicationId, affiliateId });
    const rawHotels = data.hotels ?? [];

    for (const rawEntry of rawHotels) {
      const hotelObj = unwrap(rawEntry.hotel ?? rawEntry);
      const basicInfo = unwrap(hotelObj.hotelBasicInfo);
      const hotelNo = String(basicInfo.hotelNo);

      if (!hotelMap.has(hotelNo)) {
        hotelMap.set(hotelNo, {
          hotelNo,
          hotelName: basicInfo.hotelName,
          address: `${basicInfo.address1 ?? ""}${basicInfo.address2 ?? ""}`,
          hotelInformationUrl: basicInfo.hotelInformationUrl ?? null,
          thumbnailUrl: basicInfo.hotelThumbnailUrl ?? null,
          reviewAverage: basicInfo.reviewAverage ?? null,
          rooms: new Map(),
        });
      }
      const hotelEntry = hotelMap.get(hotelNo);

      const rawRooms = hotelObj.roomInfo ?? hotelObj.rooms ?? [];
      for (const rawRoom of rawRooms) {
        const roomObj = unwrap(rawRoom.room ?? rawRoom);
        const roomBasicInfo = unwrap(roomObj.roomBasicInfo);
        const dailyCharge = unwrap(roomObj.dailyCharge);
        if (!roomBasicInfo || dailyCharge.total == null) continue;

        const roomKey = `${roomBasicInfo.roomClass ?? roomBasicInfo.roomName}__${roomBasicInfo.planName}`;
        if (!hotelEntry.rooms.has(roomKey)) {
          hotelEntry.rooms.set(roomKey, {
            roomClass: roomBasicInfo.roomClass ?? null,
            roomName: roomBasicInfo.roomName,
            planName: roomBasicInfo.planName,
            reserveUrl: roomBasicInfo.reserveUrl ?? null,
            adultNum,
            roomNum,
            dailyRates: [],
          });
        }
        hotelEntry.rooms.get(roomKey).dailyRates.push({
          date: dailyCharge.stayDate ?? night,
          price: dailyCharge.total,
        });
      }
    }

    if (i < nights.length - 1) {
      await sleep(1100);
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
    checkinDate,
    checkoutDate,
    nights,
    hotels,
  };
}
