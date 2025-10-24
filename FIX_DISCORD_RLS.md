# Fix Discord Tokens RLS Policies

Run this SQL in your Supabase SQL Editor to fix RLS policies:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own Discord token" ON public.discord_tokens;
DROP POLICY IF EXISTS "Users can view their own Discord token" ON public.discord_tokens;
DROP POLICY IF EXISTS "Users can update their own Discord token" ON public.discord_tokens;
DROP POLICY IF EXISTS "Users can delete their own Discord token" ON public.discord_tokens;

-- Create new policies that allow authenticated users
CREATE POLICY "Users can insert their own Discord token"
  ON public.discord_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own Discord token"
  ON public.discord_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Discord token"
  ON public.discord_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Discord token"
  ON public.discord_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE public.discord_tokens ENABLE ROW LEVEL SECURITY;
```

## Or if you want to allow anonymous inserts temporarily:

```sql
DROP POLICY IF EXISTS "Users can insert their own Discord token" ON public.discord_tokens;

CREATE POLICY "Allow authenticated users to insert Discord token"
  ON public.discord_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## Verify the policies are working:

1. Go to **Supabase Dashboard**
2. Click **Table Editor**
3. Select **discord_tokens** table
4. Go to **RLS** tab
5. Verify policies are listed for INSERT, SELECT, UPDATE, DELETE
6. Make sure RLS is **enabled** (toggle at top)

After running this SQL, try logging in with Discord again. The data should save now.
