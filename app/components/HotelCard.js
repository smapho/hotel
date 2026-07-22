"use client";

import { useState } from "react";
import RoomRow from "./RoomRow";

export default function HotelCard({ hotel, nights, checkinDate, checkoutDate, adultNum, roomNum }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fullRooms, setFullRooms] = useState(null);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (fullRooms) {
      setExpanded(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        hotelNo: hotel.hotelNo,
        checkinDate,
        checkoutDate,
        adultNum: String(adultNum),
        roomNum: String(roomNum),
      });
      const res = await fetch(`/api/hotels/rooms?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "部屋タイプの取得に失敗しました");
      setFullRooms(data.rooms);
      setExpanded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayedRooms = expanded && fullRooms ? fullRooms : hotel.rooms;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black/20">
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
        {displayedRooms.map((room) => (
          <RoomRow key={room.planId ?? `${room.roomClass}-${room.planName}`} room={room} nights={nights} />
        ))}
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
      >
        {loading ? "読み込み中..." : expanded ? "他の部屋タイプを閉じる" : "他の部屋タイプも見る"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
