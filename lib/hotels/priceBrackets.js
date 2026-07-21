// 5,000円刻みの価格帯。25,000円以上は最後のブラケットにまとめる。
export const PRICE_BRACKETS = [
  { id: "0-5000", label: "〜¥5,000", min: 0, max: 5000 },
  { id: "5000-10000", label: "¥5,000〜10,000", min: 5000, max: 10000 },
  { id: "10000-15000", label: "¥10,000〜15,000", min: 10000, max: 15000 },
  { id: "15000-20000", label: "¥15,000〜20,000", min: 15000, max: 20000 },
  { id: "20000-25000", label: "¥20,000〜25,000", min: 20000, max: 25000 },
  { id: "25000-", label: "¥25,000〜", min: 25000, max: Infinity },
];

export function matchesPriceBrackets(price, selectedIds) {
  if (!selectedIds || selectedIds.size === 0) return true;
  return PRICE_BRACKETS.some((b) => selectedIds.has(b.id) && price >= b.min && price < b.max);
}
