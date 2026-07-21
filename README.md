# 日本ホテル料金検索

地域と期間を指定すると、部屋タイプ（シングル/ツイン/和室など）ごとに日毎の料金を検索できるアプリです。

## セットアップ

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認できます。

## データソース

- **楽天トラベル空室検索API**（`RAKUTEN_APP_ID` を設定した場合に使用）
- **モックデータ**（APIキー未設定時のデフォルト）

`.env.example` を `.env.local` にコピーし、[楽天ウェブサービス](https://webservice.rakuten.co.jp/)で取得したアプリIDを設定すると実データに切り替わります。

```bash
cp .env.example .env.local
# .env.local を編集して RAKUTEN_APP_ID を設定
```

設定後は `npm run dev` を再起動すれば自動的に実データ検索に切り替わります（`lib/hotels/index.js` がキーの有無でプロバイダを自動選択）。

### 一休・Google Hotelsについて

- 一休.comは一般開発者向けの公開APIを提供していないため未対応です。
- Google Hotelsの検索結果を取得できる一般公開APIは無く、Google Hotel Adsはホテル/OTA側のパートナー契約が必要なため未対応です。
- 将来的に対応する場合は `lib/hotels/providers/` に新しいプロバイダファイルを追加し、`lib/hotels/index.js` で選択ロジックを拡張してください。

## 実装メモ

- 楽天トラベル空室検索API（`VacantHotelSearch`）は1回の呼び出しにつき1泊分の検索結果を返す仕様のため、期間中の日毎料金を取得するには宿泊日ごとに逐次呼び出し、`lib/hotels/providers/rakutenProvider.js` 内でホテル・部屋タイプ単位にマージしています（APIのレート制限を考慮し、呼び出し間に約1秒のウェイトを入れています）。
- 検索は最大14泊まで、大人人数は1〜10人まで対応しています（`app/api/hotels/search/route.js`）。
- 楽天APIのレスポンス構造は実際のキーで一度動作確認し、必要に応じて `rakutenProvider.js` のパース処理を調整してください。

## ディレクトリ構成

```
app/
  page.js                     検索ページ(フォーム+結果表示)
  components/                 SearchForm / HotelResults / DailyRateTable
  api/hotels/search/route.js  検索APIエンドポイント
lib/hotels/
  regions.js                  都道府県一覧(楽天middleClassCode準拠)
  dateUtils.js                日付ユーティリティ
  providers/mockProvider.js   モックデータ生成
  providers/rakutenProvider.js 楽天トラベルAPI連携
  index.js                    プロバイダ自動選択
```
