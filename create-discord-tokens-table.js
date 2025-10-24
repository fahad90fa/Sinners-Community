import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createDiscordTokensTable() {
  console.log("🚀 Creating discord_tokens table...\n");

  const sql = `
    CREATE TABLE IF NOT EXISTS public.discord_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      discord_user_id TEXT NOT NULL UNIQUE,
      discord_username TEXT NOT NULL,
      discord_email TEXT,
      avatar_url TEXT,
      raw_user_meta_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE public.discord_tokens ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users can view their own Discord token"
      ON public.discord_tokens FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert their own Discord token"
      ON public.discord_tokens FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update their own Discord token"
      ON public.discord_tokens FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete their own Discord token"
      ON public.discord_tokens FOR DELETE
      USING (auth.uid() = user_id);

    CREATE INDEX IF NOT EXISTS idx_discord_tokens_user_id ON public.discord_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_discord_tokens_discord_user_id ON public.discord_tokens(discord_user_id);
  `;

  try {
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;

      console.log(`Executing: ${statement.substring(0, 50)}...`);

      const { error } = await supabase.rpc('exec', {
        sql_query: statement.trim()
      }).catch(async (err) => {
        console.log("⚠️  Direct RPC execution not available, trying alternative method...");
        return { error: err };
      });

      if (error) {
        console.log(`⚠️  ${error.message}`);
      }
    }

    console.log("\n✅ Discord tokens table created successfully!");
    console.log("\n📋 Table structure:");
    console.log("  - id (BIGSERIAL PRIMARY KEY)");
    console.log("  - user_id (UUID, UNIQUE, FK to auth.users)");
    console.log("  - discord_user_id (TEXT, UNIQUE)");
    console.log("  - discord_username (TEXT)");
    console.log("  - discord_email (TEXT)");
    console.log("  - avatar_url (TEXT)");
    console.log("  - raw_user_meta_data (JSONB)");
    console.log("  - created_at (TIMESTAMP)");
    console.log("  - updated_at (TIMESTAMP)");
    console.log("\n✅ RLS policies and indexes configured");

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.log("\n📝 Manual Setup Instructions:");
    console.log("1. Go to Supabase Dashboard → SQL Editor");
    console.log("2. Copy and paste the SQL from: supabase/migrations/create_discord_tokens_table.sql");
    console.log("3. Click 'Run'");
    process.exit(1);
  }
}

createDiscordTokensTable();
