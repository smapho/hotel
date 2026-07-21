-- Supabaseダッシュボードの SQL Editor で実行してください。
-- 楽天トラベルAPIから取得した「地域×宿泊日」単位の料金結果をキャッシュするテーブル。
--
-- 以前このテーブルを作成済みの場合(plan_id列が無いバージョン)は、キャッシュは使い捨てデータなので
-- 先に `drop table if exists hotel_rate_cache;` を実行してから、以下を再実行してください。

create table if not exists hotel_rate_cache (
  id bigint generated always as identity primary key,
  region_code text not null,
  stay_date date not null,
  hotel_no text not null,
  hotel_name text not null,
  address text,
  hotel_information_url text,
  review_average numeric,
  plan_id text,
  room_class text,
  room_name text not null,
  plan_name text not null,
  reserve_url text,
  -- plan_idがあればそれ、無ければroomClass__planNameをアプリ側(cache.js)で計算して入れる識別キー。
  -- PostgRESTのupsert(on_conflict)は実カラムしか指定できないため、式ではなく列として持たせている。
  room_key text not null,
  price integer not null,
  fetched_at timestamptz not null default now()
);

-- 同じ地域・宿泊日・ホテル・プランの重複行を防ぐ(plan_idがあれば優先して使う)
create unique index if not exists hotel_rate_cache_unique
  on hotel_rate_cache (region_code, stay_date, hotel_no, room_key);

-- 「その地域・日付のデータが揃っているか」の判定を高速化する
create index if not exists hotel_rate_cache_lookup
  on hotel_rate_cache (region_code, stay_date, fetched_at);
