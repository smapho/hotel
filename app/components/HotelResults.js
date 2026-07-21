"use client";

import { useMemo } from "react";
import DailyRateTable from "./DailyRateTable";
import PlanContents from "./PlanContents";
import { matchesPriceBrackets } from "@/lib/hotels/priceBrackets";

const formatter = new Intl.NumberFormat("ja-JP");

const PAYMENT_LABELS = { 0: "現金のみ", 1: "カード/現金", 2: "カードのみ" };

function getPaymentLabel(payment) {
  if (payment == null) return null;
  return PAYMENT_LABELS[Number(payment)] ?? null;
}

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
  const { nights, regionName, cityName, detailAreaName, provider } = result;
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
        <div
          key={hotel.hotelNo}
          className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black/20"
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">
              {hotel.hotelInformationUrl ? (
                <a href={hotel.hotelInformationUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {hotel.hotelName}
                </a>
              ) : (
                hotel.hotelName
              )}
            </h3>
            <div className="flex items-center gap-3 text-sm text-black/60 dark:text-white/60">
              {hotel.reviewAverage != null && <span>評価 {hotel.reviewAverage}</span>}
              <span>{hotel.address}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {hotel.rooms.map((room) => (
              <div key={`${room.roomClass}-${room.planName}`} className="border-t border-black/5 pt-3 dark:border-white/10">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="font-medium">{room.roomName}</span>
                    {room.planName && (
                      <span className="ml-2 text-sm text-black/60 dark:text-white/60">{room.planName}</span>
                    )}
                  </div>
                  <span className="text-sm text-black/60 dark:text-white/60">
                    1泊あたり ¥{formatter.format(room.minPrice)}〜¥{formatter.format(room.maxPrice)}
                  </span>
                </div>

                <div className="mb-2 flex flex-wrap gap-1.5">
                  {room.withBreakfast && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                      朝食付き
                    </span>
                  )}
                  {room.withDinner && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                      夕食付き
                    </span>
                  )}
                  {!room.withBreakfast && !room.withDinner && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                      食事なし
                    </span>
                  )}
                  {getPaymentLabel(room.payment) && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                      {getPaymentLabel(room.payment)}
                    </span>
                  )}
                  {room.pointRate > 1 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      ポイント{room.pointRate}倍
                    </span>
                  )}
                </div>

                <DailyRateTable nights={nights} room={room} />
                <PlanContents text={room.planContents} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
