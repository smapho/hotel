const formatter = new Intl.NumberFormat("ja-JP");
const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", { weekday: "short" });

function isWeekend(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

export default function DailyRateTable({ nights, room }) {
  const rateByDate = new Map(room.dailyRates.map((r) => [r.date, r.price]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            {nights.map((date) => (
              <th
                key={date}
                className={`whitespace-nowrap border-b border-black/10 px-3 py-1 text-left font-normal text-black/60 dark:border-white/10 dark:text-white/60 ${
                  isWeekend(date) ? "text-red-500 dark:text-red-400" : ""
                }`}
              >
                {date.slice(5).replace("-", "/")}({weekdayFormatter.format(new Date(`${date}T00:00:00`))})
              </th>
            ))}
            <th className="whitespace-nowrap border-b border-black/10 px-3 py-1 text-left font-medium dark:border-white/10">
              合計
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {nights.map((date) => {
              const price = rateByDate.get(date);
              return (
                <td key={date} className="whitespace-nowrap px-3 py-1.5">
                  {price != null ? `¥${formatter.format(price)}` : "満室"}
                </td>
              );
            })}
            <td className="whitespace-nowrap px-3 py-1.5 font-semibold">
              ¥{formatter.format(room.totalForPeriod)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
