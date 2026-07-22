# 日本ホテル料金検索

地域と期間を指定すると、部屋タイプ（シングル/ツイン/和室など）ごとに日毎の料金を検索できるアプリです。

## セットアップ

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認できます。

## データソース

- **楽天トラベル空室検索API**（`RAKUTEN_APP_ID` と `RAKUTEN_ACCESS_KEY` を設定した場合に使用）
- **モックデータ**（未設定時のデフォルト）

`.env.example` を `.env.local` にコピーし、[楽天ウェブサービス](https://webservice.rakuten.co.jp/)で取得したアプリID・アクセスキーを設定すると実データに切り替わります。

```bash
cp .env.example .env.local
# .env.local を編集して RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY を設定
```

設定後は `npm run dev` を再起動すれば自動的に実データ検索に切り替わります（`lib/hotels/index.js` がキーの有無でプロバイダを自動選択）。

> **2026年5月の楽天API仕様変更について**: エンドポイントが `openapi.rakuten.co.jp` に変わり、`accessKey` が必須化、Referer/Originヘッダーの送信も必要になりました。アプリ登録時の「許可されたWebサイト」には、本番ドメインに加えてVercelのプレビューデプロイ用ワイルドカード(例: `hotel-*-smapho.vercel.app`)とローカル開発用の`localhost:3000`を登録してください。

### 料金データのキャッシュ(Supabase)

楽天トラベルAPIは1泊ごとに呼び出す仕様のため、期間を長く指定するほど呼び出し回数が増えます。Supabaseの`SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`を設定すると、`地域×宿泊日`単位で結果をキャッシュし(有効期限6時間)、同じ条件の再検索時はAPIを呼ばずキャッシュから返すようになります。

1. [Supabase](https://supabase.com/)でプロジェクトを作成(またはVercel MarketplaceからSupabase統合を追加)
2. SQL Editorで [`supabase/schema.sql`](supabase/schema.sql) を実行してテーブルを作成
3. `.env.local` に `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を設定(Project Settings > API から取得)

未設定の場合はキャッシュを使わず、常に楽天APIを直接呼び出します(動作に支障はありません)。

### 一休・Google Hotelsについて

- 一休.comは一般開発者向けの公開APIを提供していないため未対応です。
- Google Hotelsの検索結果を取得できる一般公開APIは無く、Google Hotel Adsはホテル/OTA側のパートナー契約が必要なため未対応です。
- 将来的に対応する場合は `lib/hotels/providers/` に新しいプロバイダファイルを追加し、`lib/hotels/index.js` で選択ロジックを拡張してください。

## 実装メモ

- 楽天トラベル空室検索API（`VacantHotelSearch`）は1回の呼び出しにつき1泊分の検索結果を返す仕様のため、期間中の日毎料金を取得するには宿泊日ごとに逐次呼び出し、`lib/hotels/providers/rakutenProvider.js` 内でホテル・部屋タイプ単位にマージしています（楽天APIのレート制限を考慮し、呼び出し間に1.5秒のウェイトを入れています）。
- 検索結果一覧は`searchPattern=0`(施設ごと・1ホテル1室)で取得しています。`searchPattern=1`(プランごと)を使うと、プラン数の多いカプセルホテル等が上位30件枠を占有してしまい、価格帯が偏る(高級〜標準ホテルが1件も出てこない)ことが実データで確認されたためです。そのかわり一覧では1ホテルにつき1室分の料金しか出ないので、ホテルカードの「他の部屋タイプも見る」ボタンから`/api/hotels/rooms`(`hotelNo`指定+`searchPattern=1`)を呼び、そのホテル単体の全プランをオンデマンド取得しています(`hotelNo`単体検索は他ホテルと30件枠を取り合わないため、プラン数に関わらず正しく全件返ります)。
- 検索は最大14泊まで、大人人数は1〜10人まで対応しています（`app/api/hotels/search/route.js`）。
- 地域は「都道府県」+任意の「市区町村」の2段階選択です。市区町村を選ぶと`largeClassCode`/`middleClassCode`/`smallClassCode`のクラスコード検索、指定しない場合は`lib/hotels/regionCoordinates.js`の代表都市の緯度経度+検索半径3.0km(API上限)にフォールバックします（都道府県コードだけでは「valid classcodes」エラーになるため）。
- 都道府県・市区町村のコード一覧(`lib/hotels/regions.js` / `lib/hotels/cities.generated.json`)は、楽天の地区コードAPI(GetAreaClass)のレスポンスから `node scripts/generateAreaData.mjs` で生成しています。楽天側にコード追加・変更があった場合は、`node scripts/fetchAreaClasses.mjs`(要`.env.local`の`RAKUTEN_APP_ID`/`RAKUTEN_ACCESS_KEY`)→`node scripts/generateAreaData.mjs`の順で再生成してください。
- 楽天APIのレスポンス構造は実際のキーで一度動作確認し、必要に応じて `rakutenProvider.js` のパース処理を調整してください。

## ディレクトリ構成

```
app/
  page.js                     検索ページ(フォーム+結果表示)
  components/                 SearchForm / HotelResults / DailyRateTable
  api/hotels/search/route.js  検索APIエンドポイント
lib/hotels/
  regions.js                  都道府県一覧(GetAreaClassから生成)
  cities.generated.json        市区町村一覧(GetAreaClassから生成)
  cities.js                    市区町村一覧の参照ヘルパー
  regionCoordinates.js         都道府県の代表都市の緯度経度(市区町村未指定時のフォールバック)
  dateUtils.js                日付ユーティリティ
  cache.js                    Supabaseキャッシュ読み書き
  providers/mockProvider.js   モックデータ生成
  providers/rakutenProvider.js 楽天トラベルAPI連携
  index.js                    プロバイダ自動選択
lib/supabase/client.js        Supabaseクライアント初期化
supabase/schema.sql           キャッシュ用テーブルのDDL
scripts/fetchAreaClasses.mjs  楽天GetAreaClassの生データ取得
scripts/generateAreaData.mjs  生データからregions.js/cities.generated.jsonを生成
```
