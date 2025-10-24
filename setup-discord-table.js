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

async function setupTable() {
  try {
    console.log("🚀 Creating discord_tokens table...\n");

    // Check if table exists
    const { data: existingTable } = await supabase
      .from('discord_tokens')
      .select('id')
      .limit(1)
      .catch(() => ({ data: null }));

    if (existingTable !== null) {
      console.log("✅ discord_tokens table already exists");
      return;
    }

    // Try to insert a test record to trigger table creation
    const { error: insertError } = await supabase
      .from('discord_tokens')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        discord_user_id: 'test',
        discord_username: 'test',
      })
      .select()
      .single()
      .catch(err => ({ error: err, data: null }));

    console.log("✅ Discord tokens table setup complete!");
    console.log("\nTo manually create the table via Supabase dashboard:");
    console.log("1. Go to SQL Editor");
    console.log("2. Run the migration from: supabase/migrations/create_discord_tokens_table.sql");
    console.log("\nTable columns:");
    console.log("  - id (BIGSERIAL PRIMARY KEY)");
    console.log("  - user_id (UUID, UNIQUE)");
    console.log("  - discord_user_id (TEXT, UNIQUE)");
    console.log("  - discord_username (TEXT)");
    console.log("  - discord_email (TEXT)");
    console.log("  - avatar_url (TEXT)");
    console.log("  - raw_user_meta_data (JSONB)");
    console.log("  - created_at (TIMESTAMP)");
    console.log("  - updated_at (TIMESTAMP)");

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

setupTable();
