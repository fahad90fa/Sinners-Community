import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const oldSupabaseUrl = "https://lctyqbgxehevjolsfxxi.supabase.co";
const oldSupabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjdHlxYmd4ZWhldmpvbHNmeHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzEzMjksImV4cCI6MjA3NjY0NzMyOX0.5ITdOZ9xqGRxVTqGCip-JQ-1RXkJEZkVKybl6gNjwbw";

const newSupabaseUrl = process.env.VITE_SUPABASE_URL;
const newServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!newSupabaseUrl || !newServiceRoleKey) {
  console.error("❌ Missing credentials in .env");
  process.exit(1);
}

const oldClient = createClient(oldSupabaseUrl, oldSupabaseKey);
const newClient = createClient(newSupabaseUrl, newServiceRoleKey);

async function migrateTable(tableName) {
  try {
    const { data, error } = await oldClient
      .from(tableName)
      .select("*")
      .limit(10000);

    if (error) {
      console.log(`⏭️  ${tableName}: Table not found`);
      return 0;
    }

    if (!data || data.length === 0) {
      console.log(`⏭️  ${tableName}: Empty`);
      return 0;
    }

    console.log(`📦 ${tableName}: Processing ${data.length} records...`);

    const batchSize = 100;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          const { error: insertError } = await newClient
            .from(tableName)
            .insert([record]);

          if (insertError) {
            failCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          failCount++;
        }
      }
    }

    console.log(`   ✓ Success: ${successCount}, Failed: ${failCount}`);
    return successCount;
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
    return 0;
  }
}

async function migrate() {
  console.log("🚀 Starting data migration...\n");

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
    "discord_tokens",
  ];

  let totalRecords = 0;
  for (const table of tables) {
    totalRecords += await migrateTable(table);
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`📊 Total records migrated: ${totalRecords}`);
  console.log(
    "\n⚠️  Note: Some records may have failed due to foreign key constraints."
  );
  console.log(
    "   Make sure users exist in both databases for full data integrity."
  );
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
