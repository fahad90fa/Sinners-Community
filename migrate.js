import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const oldSupabaseUrl = "https://lctyqbgxehevjolsfxxi.supabase.co";
const oldSupabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjdHlxYmd4ZWhldmpvbHNmeHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzEzMjksImV4cCI6MjA3NjY0NzMyOX0.5ITdOZ9xqGRxVTqGCip-JQ-1RXkJEZkVKybl6gNjwbw";

const newSupabaseUrl = process.env.VITE_SUPABASE_URL;
const newServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!newSupabaseUrl || !newServiceRoleKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

console.log(`Old Database: ${oldSupabaseUrl}`);
console.log(`New Database: ${newSupabaseUrl}\n`);

const oldClient = createClient(oldSupabaseUrl, oldSupabaseKey);
const newClient = createClient(newSupabaseUrl, newServiceRoleKey);

const tables = [
  "profiles",
  "posts",
  "media",
  "comments",
  "likes",
  "follows",
  "messages",
  "conversations",
  "conversation_members",
  "call_sessions",
  "voicemails",
  "attachments",
  "saved_posts",
  "hashtags",
  "post_hashtags",
  "mentions",
  "blocks",
  "reports",
  "stories",
  "story_views",
  "verified_users",
  "notifications",
];

async function migrateTable(tableName) {
  try {
    console.log(`📦 Migrating ${tableName}...`);

    const { data, error } = await oldClient.from(tableName).select("*").limit(10000);

    if (error) {
      console.log(`   ⚠️  Skipped (not found)`);
      return 0;
    }

    if (!data || data.length === 0) {
      console.log(`   ✓ Empty table`);
      return 0;
    }

    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error: insertError } = await newClient.from(tableName).insert(batch);

      if (insertError) {
        if (insertError.code !== "23505") {
          console.error(`   ✗ Insert error:`, insertError.message);
          continue;
        }
      }
      totalInserted += batch.length;
    }

    console.log(`   ✓ ${totalInserted} records migrated`);
    return totalInserted;
  } catch (err) {
    console.error(`   ✗ Error:`, err.message);
    return 0;
  }
}

async function migrate() {
  console.log("🚀 Starting data migration...\n");

  let totalRecords = 0;

  for (const table of tables) {
    totalRecords += await migrateTable(table);
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`📊 Total records migrated: ${totalRecords}`);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
