"use client";

import { useState } from "react";
import SearchForm from "./components/SearchForm";
import HotelResults from "./components/HotelResults";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Home() {
  const [form, setForm] = useState({
    regionCode: "tokyo",
    cityCode: "",
    detailCode: "",
    checkinDate: today(),
    checkoutDate: plusDays(today(), 1),
    adultNum: 1,
  });
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        region: form.regionCode,
        checkinDate: form.checkinDate,
        checkoutDate: form.checkoutDate,
        adultNum: String(form.adultNum),
        roomNum: "1",
      });
      if (form.cityCode) params.set("city", form.cityCode);
      if (form.detailCode) params.set("detail", form.detailCode);
      const res = await fetch(`/api/hotels/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "検索に失敗しました");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">日本ホテル料金検索</h1>
        <p className="mt-1 text-black/60 dark:text-white/60">
          地域と期間を指定して、部屋タイプごとの日毎の料金を確認できます。
        </p>

        <div className="mt-6">
          <SearchForm value={form} onChange={setForm} onSubmit={handleSearch} isLoading={isLoading} />
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        <HotelResults result={result} />
      </main>
    </div>
  );
}
