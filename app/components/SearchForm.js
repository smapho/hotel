"use client";

import { REGIONS } from "@/lib/hotels/regions";

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function plusDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function SearchForm({ value, onChange, onSubmit, isLoading }) {
  const handleChange = (field) => (e) => {
    const next = { ...value, [field]: e.target.value };
    if (field === "checkinDate" && next.checkoutDate <= e.target.value) {
      next.checkoutDate = plusDays(e.target.value, 1);
    }
    onChange(next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-1 gap-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/20 sm:grid-cols-2 lg:grid-cols-5"
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
    </form>
  );
}
