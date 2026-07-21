import DailyRateTable from "./DailyRateTable";

const formatter = new Intl.NumberFormat("ja-JP");

export default function HotelResults({ result }) {
  if (!result) return null;
  const { hotels, nights, regionName, provider } = result;

  if (hotels.length === 0) {
    return <p className="mt-8 text-black/60 dark:text-white/60">この条件に一致する空室が見つかりませんでした。</p>;
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-black/60 dark:text-white/60">
          {regionName} / {nights[0]} 〜 {nights[nights.length - 1]}（{nights.length}泊） の検索結果 {hotels.length}件
        </p>
        {provider === "mock" && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
            モックデータ表示中
          </span>
        )}
      </div>

      {hotels.map((hotel) => (
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
                    <span className="ml-2 text-sm text-black/60 dark:text-white/60">{room.planName}</span>
                  </div>
                  <span className="text-sm text-black/60 dark:text-white/60">
                    1泊あたり ¥{formatter.format(room.minPrice)}〜¥{formatter.format(room.maxPrice)}
                  </span>
                </div>
                <DailyRateTable nights={nights} room={room} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
