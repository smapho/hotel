"use client";

import { REGIONS } from "@/lib/hotels/regions";
import { getCitiesForRegion, getDetailAreasForCity } from "@/lib/hotels/cities";
import { PRICE_BRACKETS } from "@/lib/hotels/priceBrackets";

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function plusDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function SearchForm({ value, onChange, onSubmit, isLoading, priceBrackets, onTogglePriceBracket, onClearPriceBrackets }) {
  const cities = getCitiesForRegion(value.regionCode);
  const detailAreas = getDetailAreasForCity(value.regionCode, value.cityCode);

  const handleChange = (field) => (e) => {
    const next = { ...value, [field]: e.target.value };
    if (field === "checkinDate" && next.checkoutDate <= e.target.value) {
      next.checkoutDate = plusDays(e.target.value, 1);
    }
    if (field === "regionCode") {
      // 都道府県を変えたら市区町村・詳細エリア選択はリセットする(前の都道府県のコードのまま残らないように)
      next.cityCode = "";
      next.detailCode = "";
    }
    if (field === "cityCode") {
      next.detailCode = "";
    }
    onChange(next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-1 gap-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/20 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">地域</label>
        <select
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          value={value.regionCode}
          onChange={handleChange("regionCode")}
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">市区町村</label>
        <select
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          value={value.cityCode}
          onChange={handleChange("cityCode")}
        >
          <option value="">指定なし(代表都市周辺)</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {detailAreas.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">詳細エリア</label>
          <select
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            value={value.detailCode}
            onChange={handleChange("detailCode")}
          >
            <option value="">指定なし</option>
            {detailAreas.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">チェックイン</label>
        <input
          type="date"
          min={today()}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          value={value.checkinDate}
          onChange={handleChange("checkinDate")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">チェックアウト</label>
        <input
          type="date"
          min={plusDays(value.checkinDate, 1)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          value={value.checkoutDate}
          onChange={handleChange("checkoutDate")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">大人人数</label>
        <input
          type="number"
          min={1}
          max={10}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          value={value.adultNum}
          onChange={handleChange("adultNum")}
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "検索中..." : "料金を検索"}
        </button>
      </div>

      <div className="col-span-full flex flex-wrap items-center gap-2 border-t border-black/5 pt-4 dark:border-white/10">
        <span className="text-sm font-medium text-black/70 dark:text-white/70">価格帯で絞り込み:</span>
        {PRICE_BRACKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onTogglePriceBracket(b.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              priceBrackets.has(b.id)
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-black/15 bg-transparent text-black/70 hover:border-black/30 dark:border-white/20 dark:text-white/70"
            }`}
          >
            {b.label}
          </button>
        ))}
        {priceBrackets.size > 0 && (
          <button
            type="button"
            onClick={onClearPriceBrackets}
            className="text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
          >
            クリア
          </button>
        )}
      </div>
    </form>
  );
}
