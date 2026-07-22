import { NextResponse } from "next/server";
import { searchHotels } from "@/lib/hotels";
import { getCitiesForRegion, getDetailAreasForCity } from "@/lib/hotels/cities";
import { validateDatesAndGuests } from "@/lib/hotels/searchValidation";

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

  const validationError = validateDatesAndGuests({ checkinDate, checkoutDate, adultNum, roomNum });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await searchHotels({ regionCode, cityCode, detailCode, checkinDate, checkoutDate, adultNum, roomNum });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "検索中にエラーが発生しました" }, { status: 502 });
  }
}
