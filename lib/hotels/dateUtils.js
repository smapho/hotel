export function toDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, days) {
  const date = toDateOnly(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

// checkinDate(含む)〜checkoutDate(含まない)の宿泊日(泊)を一覧化する
export function getNightsInRange(checkinDate, checkoutDate) {
  const nights = [];
  let cursor = checkinDate;
  while (cursor < checkoutDate) {
    nights.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return nights;
}

export function isWeekendNight(dateStr) {
  const day = toDateOnly(dateStr).getDay();
  // 金・土泊は需要が高くなりやすい
  return day === 5 || day === 6;
}
