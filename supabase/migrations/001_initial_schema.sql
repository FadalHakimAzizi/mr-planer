-- =============================================
-- MR. PLANER — Initial Schema Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

CREATE TABLE public.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   bigint UNIQUE,
  email         text UNIQUE,
  full_name     text,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan_type     text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  image_url      text,
  selling_points jsonb DEFAULT '[]',
  target_market  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  duration_days   int NOT NULL CHECK (duration_days IN (7, 30)),
  spreadsheet_url text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'error')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  row_number   int NOT NULL,
  post_date    date NOT NULL,
  product_name text,
  title        text,
  content_type text CHECK (content_type IN ('Entertain', 'Softselling', 'Edukasi', 'Hardselling', 'Trend', 'Problem-Solution')),
  post_type    text,
  hook         text,
  caption      text,
  hashtags     text[] DEFAULT '{}',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  UNIQUE(plan_id, row_number)
);

CREATE TABLE public.scripts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  keyword     text NOT NULL,
  trend_score int DEFAULT 0,
  region      text NOT NULL DEFAULT 'ID',
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action     text NOT NULL,
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_content_plans_user_id ON public.content_plans(user_id);
CREATE INDEX idx_content_plans_product_id ON public.content_plans(product_id);
CREATE INDEX idx_content_items_plan_id ON public.content_items(plan_id);
CREATE INDEX idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX idx_keywords_product_id ON public.keywords(product_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- users: can only see/edit own row; admin sees all
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- products: user sees own products; admin sees all
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (user_id = auth.uid());

-- content_plans
CREATE POLICY "plans_select" ON public.content_plans
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));
CREATE POLICY "plans_insert" ON public.content_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "plans_update" ON public.content_plans
  FOR UPDATE USING (user_id = auth.uid());

-- content_items (access via parent plan)
CREATE POLICY "items_select" ON public.content_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.content_plans cp
    WHERE cp.id = plan_id AND (cp.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
    ))
  ));
CREATE POLICY "items_insert" ON public.content_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.content_plans cp WHERE cp.id = plan_id AND cp.user_id = auth.uid()
  ));
CREATE POLICY "items_update" ON public.content_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.content_plans cp WHERE cp.id = plan_id AND cp.user_id = auth.uid()
  ));

-- scripts
CREATE POLICY "scripts_select" ON public.scripts
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));
CREATE POLICY "scripts_insert" ON public.scripts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- keywords (readable by owner of product; admin sees all)
CREATE POLICY "keywords_select" ON public.keywords
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
      )
    )
  ));

-- activity_logs
CREATE POLICY "logs_select" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));
CREATE POLICY "logs_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- SERVICE ROLE BYPASS (for n8n server-side calls)
-- n8n uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS automatically
-- No extra policy needed.
-- =============================================

-- =============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
