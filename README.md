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
- 検索は最大14泊まで、大人人数は1〜10人まで対応しています（`app/api/hotels/search/route.js`）。
- 地域指定は`largeClassCode`/`middleClassCode`(都道府県単位)ではなく、`lib/hotels/regionCoordinates.js`にある**代表都市の緯度経度+検索半径3.0km(API上限)**で行っています。都道府県単位のクラスコードのみでは「valid classcodes」エラーになったための対応で、県庁所在地など中心部から離れたホテルは検索結果に含まれません。より正確にする場合は、楽天の地区コードAPI(GetAreaClass)で市区町村単位(smallClassCode)を取得し、2段階の地域選択UIに変更してください。
- 楽天APIのレスポンス構造は実際のキーで一度動作確認し、必要に応じて `rakutenProvider.js` のパース処理を調整してください。

## ディレクトリ構成

```
app/
  page.js                     検索ページ(フォーム+結果表示)
  components/                 SearchForm / HotelResults / DailyRateTable
  api/hotels/search/route.js  検索APIエンドポイント
lib/hotels/
  regions.js                  都道府県一覧(UI表示用)
  regionCoordinates.js         都道府県の代表都市の緯度経度
  dateUtils.js                日付ユーティリティ
  cache.js                    Supabaseキャッシュ読み書き
  providers/mockProvider.js   モックデータ生成
  providers/rakutenProvider.js 楽天トラベルAPI連携
  index.js                    プロバイダ自動選択
lib/supabase/client.js        Supabaseクライアント初期化
supabase/schema.sql           キャッシュ用テーブルのDDL
```
