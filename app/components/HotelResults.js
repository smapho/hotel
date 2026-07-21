"use client";

import { useMemo, useState } from "react";
import DailyRateTable from "./DailyRateTable";
import PlanContents from "./PlanContents";

const formatter = new Intl.NumberFormat("ja-JP");

const PAYMENT_LABELS = { 0: "現金のみ", 1: "カード/現金", 2: "カードのみ" };

function getPaymentLabel(payment) {
  if (payment == null) return null;
  return PAYMENT_LABELS[Number(payment)] ?? null;
}

// 5,000円刻みの価格帯。25,000円以上は最後のブラケットにまとめる。
const PRICE_BRACKETS = [
  { id: "0-5000", label: "〜¥5,000", min: 0, max: 5000 },
  { id: "5000-10000", label: "¥5,000〜10,000", min: 5000, max: 10000 },
  { id: "10000-15000", label: "¥10,000〜15,000", min: 10000, max: 15000 },
  { id: "15000-20000", label: "¥15,000〜20,000", min: 15000, max: 20000 },
  { id: "20000-25000", label: "¥20,000〜25,000", min: 20000, max: 25000 },
  { id: "25000-", label: "¥25,000〜", min: 25000, max: Infinity },
];

function matchesBrackets(price, selectedIds) {
  if (selectedIds.size === 0) return true;
  return PRICE_BRACKETS.some((b) => selectedIds.has(b.id) && price >= b.min && price < b.max);
}

export default function HotelResults({ result }) {
  const [selectedBrackets, setSelectedBrackets] = useState(new Set());

  const toggleBracket = (id) => {
    setSelectedBrackets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredHotels = useMemo(() => {
    if (!result) return [];
    return result.hotels
      .map((hotel) => ({
        ...hotel,
        rooms: hotel.rooms.filter((room) => matchesBrackets(room.minPrice, selectedBrackets)),
      }))
      .filter((hotel) => hotel.rooms.length > 0);
  }, [result, selectedBrackets]);

  if (!result) return null;
  const { nights, regionName, cityName, detailAreaName, provider } = result;
  const areaLabel = [regionName, cityName, detailAreaName].filter(Boolean).join(" ");

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-black/70 dark:text-white/70">価格帯で絞り込み:</span>
        {PRICE_BRACKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => toggleBracket(b.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              selectedBrackets.has(b.id)
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-black/15 bg-transparent text-black/70 hover:border-black/30 dark:border-white/20 dark:text-white/70"
            }`}
          >
            {b.label}
          </button>
        ))}
        {selectedBrackets.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedBrackets(new Set())}
            className="text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
          >
            クリア
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-black/60 dark:text-white/60">
          {areaLabel} / {nights[0]} 〜 {nights[nights.length - 1]}（{nights.length}泊） の検索結果 {filteredHotels.length}件
          {selectedBrackets.size > 0 && `（全${result.hotels.length}件中）`}
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
