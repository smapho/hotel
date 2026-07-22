import { NextResponse } from "next/server";
import { getHotelRooms } from "@/lib/hotels";
import { validateDatesAndGuests } from "@/lib/hotels/searchValidation";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hotelNo = searchParams.get("hotelNo");
  const checkinDate = searchParams.get("checkinDate");
  const checkoutDate = searchParams.get("checkoutDate");
  const adultNum = Number(searchParams.get("adultNum") ?? "1");
  const roomNum = Number(searchParams.get("roomNum") ?? "1");

  if (!hotelNo) {
    return NextResponse.json({ error: "hotelNo は必須です" }, { status: 400 });
  }

  const validationError = validateDatesAndGuests({ checkinDate, checkoutDate, adultNum, roomNum });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await getHotelRooms({ hotelNo, checkinDate, checkoutDate, adultNum, roomNum });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "部屋タイプの取得中にエラーが発生しました" }, { status: 502 });
  }
}
