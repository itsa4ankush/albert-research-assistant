ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS research_context jsonb;