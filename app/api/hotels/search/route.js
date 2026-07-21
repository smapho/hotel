import { NextResponse } from "next/server";
import { searchHotels } from "@/lib/hotels";
import { getCitiesForRegion, getDetailAreasForCity } from "@/lib/hotels/cities";

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(new Date(`${str}T00:00:00`).getTime());
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");
  const cityCode = searchParams.get("city") || null;
  const detailCode = searchParams.get("detail") || null;
  const checkinDate = searchParams.get("checkinDate");
  const checkoutDate = searchParams.get("checkoutDate");
  const adultNum = Number(searchParams.get("adultNum") ?? "1");
  const roomNum = Number(searchParams.get("roomNum") ?? "1");

  if (!regionCode) {
    return NextResponse.json({ error: "region は必須です" }, { status: 400 });
  }
  if (cityCode && !getCitiesForRegion(regionCode).some((c) => c.code === cityCode)) {
    return NextResponse.json({ error: "city の値が region と一致していません" }, { status: 400 });
  }
  if (detailCode && !getDetailAreasForCity(regionCode, cityCode).some((d) => d.code === detailCode)) {
    return NextResponse.json({ error: "detail の値が region/city と一致していません" }, { status: 400 });
  }
  if (!isValidDate(checkinDate) || !isValidDate(checkoutDate)) {
    return NextResponse.json({ error: "checkinDate / checkoutDate は YYYY-MM-DD 形式で指定してください" }, { status: 400 });
  }
  if (checkinDate >= checkoutDate) {
    return NextResponse.json({ error: "checkoutDate は checkinDate より後の日付にしてください" }, { status: 400 });
  }
  const maxNights = 14;
  const nightsCount = (new Date(checkoutDate) - new Date(checkinDate)) / 86400000;
  if (nightsCount > maxNights) {
    return NextResponse.json({ error: `一度に検索できるのは最大${maxNights}泊までです` }, { status: 400 });
  }
  if (!Number.isInteger(adultNum) || adultNum < 1 || adultNum > 10) {
    return NextResponse.json({ error: "adultNum は1〜10の整数で指定してください" }, { status: 400 });
  }
  if (!Number.isInteger(roomNum) || roomNum < 1 || roomNum > 9) {
    return NextResponse.json({ error: "roomNum は1〜9の整数で指定してください" }, { status: 400 });
  }

  try {
    const result = await searchHotels({ regionCode, cityCode, detailCode, checkinDate, checkoutDate, adultNum, roomNum });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "検索中にエラーが発生しました" }, { status: 502 });
  }
}
