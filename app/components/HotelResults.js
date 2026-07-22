"use client";

import { useMemo } from "react";
import HotelCard from "./HotelCard";
import { matchesPriceBrackets } from "@/lib/hotels/priceBrackets";

export default function HotelResults({ result, priceBrackets }) {
  const filteredHotels = useMemo(() => {
    if (!result) return [];
    return result.hotels
      .map((hotel) => ({
        ...hotel,
        rooms: hotel.rooms.filter((room) => matchesPriceBrackets(room.minPrice, priceBrackets)),
      }))
      .filter((hotel) => hotel.rooms.length > 0);
  }, [result, priceBrackets]);

  if (!result) return null;
  const { nights, regionName, cityName, detailAreaName, provider, checkinDate, checkoutDate, adultNum, roomNum } = result;
  const areaLabel = [regionName, cityName, detailAreaName].filter(Boolean).join(" ");

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-black/60 dark:text-white/60">
          {areaLabel} / {nights[0]} 〜 {nights[nights.length - 1]}（{nights.length}泊） の検索結果 {filteredHotels.length}件
          {priceBrackets.size > 0 && `（全${result.hotels.length}件中）`}
        </p>
        {provider === "mock" && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
            モックデータ表示中
          </span>
        )}
      </div>

      {filteredHotels.length === 0 && (
        <p className="text-black/60 dark:text-white/60">この価格帯に一致する部屋がありませんでした。</p>
      )}

      {filteredHotels.map((hotel) => (
        <HotelCard
          key={hotel.hotelNo}
          hotel={hotel}
          nights={nights}
          checkinDate={checkinDate}
          checkoutDate={checkoutDate}
          adultNum={adultNum}
          roomNum={roomNum}
        />
      ))}
    </div>
  );
}
