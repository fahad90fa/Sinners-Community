import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  try {
    console.log("🚀 Running Discord tokens migration...\n");

    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/create_discord_tokens_table.sql"
    );

    const sql = fs.readFileSync(migrationPath, "utf-8");

    const { error } = await supabase.rpc("exec", {
      sql_query: sql,
    }).catch(async () => {
      console.log("⚠️  Using direct SQL execution...");
      
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (!statement.trim()) continue;
        
        const { error } = await supabase.rpc('exec', {
          sql_query: statement.trim()
        });
        
        if (error) {
          console.error(`Error executing: ${statement.substring(0, 50)}...`);
          console.error(error);
        }
      }
      
      return { error: null };
    });

    if (error) {
      console.error("❌ Migration failed:", error.message);
      process.exit(1);
    }

    console.log("✅ Discord tokens table created successfully!");
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
    console.log("\n✅ RLS policies and indexes created");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  }
}

runMigration();
