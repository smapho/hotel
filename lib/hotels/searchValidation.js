export function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(new Date(`${str}T00:00:00`).getTime());
}

const MAX_NIGHTS = 14;

// 日付・人数まわりの共通バリデーション。問題があればエラーメッセージを返し、無ければnullを返す。
export function validateDatesAndGuests({ checkinDate, checkoutDate, adultNum, roomNum }) {
  if (!isValidDate(checkinDate) || !isValidDate(checkoutDate)) {
    return "checkinDate / checkoutDate は YYYY-MM-DD 形式で指定してください";
  }
  if (checkinDate >= checkoutDate) {
    return "checkoutDate は checkinDate より後の日付にしてください";
  }
  const nightsCount = (new Date(checkoutDate) - new Date(checkinDate)) / 86400000;
  if (nightsCount > MAX_NIGHTS) {
    return `一度に検索できるのは最大${MAX_NIGHTS}泊までです`;
  }
  if (!Number.isInteger(adultNum) || adultNum < 1 || adultNum > 10) {
    return "adultNum は1〜10の整数で指定してください";
  }
  if (!Number.isInteger(roomNum) || roomNum < 1 || roomNum > 9) {
    return "roomNum は1〜9の整数で指定してください";
  }
  return null;
}
