import { searchHotels as searchHotelsMock } from "./providers/mockProvider";
import { searchHotels as searchHotelsRakuten } from "./providers/rakutenProvider";

// RAKUTEN_APP_ID が設定されていれば実データ(楽天トラベル)、なければモックデータを使う。
// USE_MOCK_HOTELS=true を指定すると、キーがあっても強制的にモックを使える。
export function getActiveProvider() {
  const forceMock = process.env.USE_MOCK_HOTELS === "true";
  const hasRakutenKey = Boolean(process.env.RAKUTEN_APP_ID);
  if (!forceMock && hasRakutenKey) {
    return { name: "rakuten", searchHotels: searchHotelsRakuten };
  }
  return { name: "mock", searchHotels: searchHotelsMock };
}

export async function searchHotels(params) {
  const provider = getActiveProvider();
  return provider.searchHotels(params);
}
