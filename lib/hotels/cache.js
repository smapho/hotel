import { getSupabaseClient } from "../supabase/client";

const TABLE = "hotel_rate_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6時間。楽天API呼び出し回数を減らすためのキャッシュ有効期限。

// キャッシュに「地域×宿泊日」の行が十分新しく揃っていれば、その日のホテル一覧を返す。
// 揃っていない/未設定/期限切れの場合はnullを返し、呼び出し側は実APIにフォールバックする。
export async function getCachedNight(regionCode, stayDate) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("region_code", regionCode)
    .eq("stay_date", stayDate);

  if (error) {
    console.error("Supabaseキャッシュ読み取りエラー:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;

  const isFresh = data.every((row) => Date.now() - new Date(row.fetched_at).getTime() < CACHE_TTL_MS);
  if (!isFresh) return null;

  const hotelMap = new Map();
  for (const row of data) {
    if (!hotelMap.has(row.hotel_no)) {
      hotelMap.set(row.hotel_no, {
        hotelNo: row.hotel_no,
        hotelName: row.hotel_name,
        address: row.address,
        hotelInformationUrl: row.hotel_information_url,
        thumbnailUrl: null,
        reviewAverage: row.review_average,
        rooms: [],
      });
    }
    hotelMap.get(row.hotel_no).rooms.push({
      planId: row.plan_id,
      roomClass: row.room_class,
      roomName: row.room_name,
      planName: row.plan_name,
      reserveUrl: row.reserve_url,
      withBreakfast: row.with_breakfast,
      withDinner: row.with_dinner,
      payment: row.payment,
      pointRate: row.point_rate,
      planContents: row.plan_contents,
      price: row.price,
    });
  }
  return Array.from(hotelMap.values());
}

// 1泊分のホテル一覧結果をキャッシュに保存(upsert)する。Supabase未設定なら何もしない。
export async function saveCachedNight(regionCode, stayDate, hotels) {
  const supabase = getSupabaseClient();
  if (!supabase || hotels.length === 0) return;

  const rows = hotels.flatMap((hotel) =>
    hotel.rooms.map((room) => ({
      region_code: regionCode,
      stay_date: stayDate,
      hotel_no: hotel.hotelNo,
      hotel_name: hotel.hotelName,
      address: hotel.address,
      hotel_information_url: hotel.hotelInformationUrl,
      review_average: hotel.reviewAverage,
      plan_id: room.planId ?? null,
      room_class: room.roomClass,
      room_name: room.roomName,
      plan_name: room.planName,
      reserve_url: room.reserveUrl ?? null,
      with_breakfast: room.withBreakfast ?? null,
      with_dinner: room.withDinner ?? null,
      payment: room.payment ?? null,
      point_rate: room.pointRate ?? null,
      plan_contents: room.planContents ?? null,
      // PostgRESTのupsert(on_conflict)は実カラムしか指定できないため、識別キーを列として持たせる。
      room_key: room.planId ?? `${room.roomClass ?? room.roomName}__${room.planName}`,
      price: room.price,
      fetched_at: new Date().toISOString(),
    }))
  );

  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "region_code,stay_date,hotel_no,room_key" });

  if (error) {
    console.error("Supabaseキャッシュ書き込みエラー:", error.message);
  }
}
