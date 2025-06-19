-- Fix push_subscriptions table structure
-- First, let's see what we have and fix it

-- Drop the table if it exists and recreate it properly
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

-- Create push_subscriptions table with correct structure
CREATE TABLE public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.push_subscriptions
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert access for all users" ON public.push_subscriptions
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.push_subscriptions
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON public.push_subscriptions
    FOR DELETE
    TO public
    USING (true); 