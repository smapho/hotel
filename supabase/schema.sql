-- Supabaseダッシュボードの SQL Editor で実行してください。
-- 楽天トラベルAPIから取得した「地域×宿泊日」単位の料金結果をキャッシュするテーブル。

create table if not exists hotel_rate_cache (
  id bigint generated always as identity primary key,
  region_code text not null,
  stay_date date not null,
  hotel_no text not null,
  hotel_name text not null,
  address text,
  hotel_information_url text,
  review_average numeric,
  room_class text,
  room_name text not null,
  plan_name text not null,
  reserve_url text,
  price integer not null,
  fetched_at timestamptz not null default now()
);

-- 同じ地域・宿泊日・ホテル・部屋タイプの重複行を防ぐ
create unique index if not exists hotel_rate_cache_unique
  on hotel_rate_cache (region_code, stay_date, hotel_no, room_class, plan_name);

-- 「その地域・日付のデータが揃っているか」の判定を高速化する
create index if not exists hotel_rate_cache_lookup
  on hotel_rate_cache (region_code, stay_date, fetched_at);
