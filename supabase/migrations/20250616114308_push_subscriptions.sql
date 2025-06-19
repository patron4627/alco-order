-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 