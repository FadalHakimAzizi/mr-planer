-- =============================================
-- MR. PLANER TELEGRAM — Database Schema
-- Isolated from web app. Telegram/n8n only.
-- Run this in Supabase SQL Editor (new project)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users: identified by telegram_id, no Supabase Auth
CREATE TABLE public.users (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id       bigint      UNIQUE NOT NULL,
  telegram_username text,
  full_name         text,
  language_code     text        NOT NULL DEFAULT 'id',
  role              text        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan_type         text        NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  last_active_at    timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  description    text,
  image_url      text,
  selling_points jsonb       NOT NULL DEFAULT '[]',
  target_market  text,
  -- Dibaca oleh WF-03 (Build AI Prompt) untuk memperkaya konten. Belum diisi WF-02
  -- (butuh enhancement analisis produk); default [] supaya aman dibaca.
  pain_points       jsonb    NOT NULL DEFAULT '[]',
  competitor_angles jsonb    NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_plans (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id          uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  duration_days       int         NOT NULL CHECK (duration_days IN (7, 30)),
  spreadsheet_url     text,
  telegram_message_id bigint,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid        NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  row_number   int         NOT NULL,
  post_date    date        NOT NULL,
  post_time    text,
  product_name text,
  title        text,
  content_type text        CHECK (content_type IN ('Entertain', 'Softselling', 'Edukasi', 'Hardselling', 'Trend', 'Problem-Solution')),
  post_type    text,
  hook         text,
  caption      text,
  hashtags     text[]      DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  UNIQUE(plan_id, row_number)
);

CREATE TABLE public.scripts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          uuid        NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hook_text        text,
  problem          text,
  solution         text,
  cta              text,
  visual_direction text,
  audio_cue        text,
  docs_url         text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.keywords (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  keyword     text        NOT NULL,
  trend_score int         NOT NULL DEFAULT 0,
  region      text        NOT NULL DEFAULT 'ID',
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, keyword)
);

CREATE TABLE public.activity_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_chat_id bigint,
  action           text        NOT NULL,
  metadata         jsonb       DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_telegram_id        ON public.users(telegram_id);
CREATE INDEX idx_products_user_id         ON public.products(user_id);
CREATE INDEX idx_products_created_at      ON public.products(created_at DESC);
CREATE INDEX idx_content_plans_user_id    ON public.content_plans(user_id);
CREATE INDEX idx_content_plans_product_id ON public.content_plans(product_id);
CREATE INDEX idx_content_plans_status     ON public.content_plans(status);
CREATE INDEX idx_content_items_plan_id    ON public.content_items(plan_id);
CREATE INDEX idx_scripts_user_id          ON public.scripts(user_id);
CREATE INDEX idx_scripts_item_id          ON public.scripts(item_id);
CREATE INDEX idx_keywords_product_id      ON public.keywords(product_id);
CREATE INDEX idx_keywords_trend_score     ON public.keywords(trend_score DESC);
CREATE INDEX idx_activity_logs_user_id    ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
-- RLS diaktifkan tapi TANPA policy.
-- n8n menggunakan service_role key yang bypass RLS secara otomatis.
-- Koneksi non-service-role (anon) tidak bisa akses tabel apapun.

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs  ENABLE ROW LEVEL SECURITY;

-- Tidak ada policy auth.uid() karena tidak ada Supabase Auth di project ini.
-- n8n WAJIB menggunakan SUPABASE_SERVICE_ROLE_KEY.
