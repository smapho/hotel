import DailyRateTable from "./DailyRateTable";
import PlanContents from "./PlanContents";

const formatter = new Intl.NumberFormat("ja-JP");

const PAYMENT_LABELS = { 0: "現金のみ", 1: "カード/現金", 2: "カードのみ" };

function getPaymentLabel(payment) {
  if (payment == null) return null;
  return PAYMENT_LABELS[Number(payment)] ?? null;
}

export default function RoomRow({ room, nights }) {
  return (
    <div className="border-t border-black/5 pt-3 dark:border-white/10">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{room.roomName}</span>
          {room.planName && <span className="ml-2 text-sm text-black/60 dark:text-white/60">{room.planName}</span>}
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
  );
}
