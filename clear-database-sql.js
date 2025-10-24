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

const tablesToClear = [
  "likes",
  "comments",
  "attachments",
  "saved_posts",
  "post_hashtags",
  "media",
  "posts",
  "stories",
  "story_views",
  "messages",
  "conversation_members",
  "conversations",
  "call_sessions",
  "voicemails",
  "mentions",
  "blocks",
  "reports",
  "follows",
  "hashtags",
  "verified_users",
  "notifications",
  "group_messages",
  "group_chat_members",
  "group_chats",
  "discord_tokens",
  "profiles",
];

async function clearDatabase() {
  console.log("🗑️  Starting database clear...\n");

  const truncateSql = tablesToClear
    .map(table => `TRUNCATE TABLE public."${table}" RESTART IDENTITY CASCADE;`)
    .join('\n');

  const sql = `
    BEGIN;
    ${truncateSql}
    COMMIT;
  `;

  try {
    const { error } = await supabase.rpc('exec', { sql_query: sql });

    if (error) {
      console.error("❌ Error clearing database:", error.message);
      console.log("\n📝 Attempting table-by-table clear...\n");
      
      let clearedCount = 0;
      for (const table of tablesToClear) {
        try {
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .gt("id", "0");

          if (deleteError?.code === "PGRST204") {
            console.log(`✅ ${table}: Already empty`);
            clearedCount++;
          } else if (!deleteError) {
            console.log(`✅ ${table}: Cleared`);
            clearedCount++;
          }
        } catch (err) {
          console.log(`⚠️  ${table}: ${err.message}`);
        }
      }
      console.log(`\n✨ Cleared ${clearedCount} tables`);
    } else {
      console.log("✅ All tables truncated successfully!\n");
      console.log("📊 Tables cleared:");
      tablesToClear.forEach(t => console.log(`   ✓ ${t}`));
      console.log("\n✨ Database is now empty! Tables and columns remain intact.");
    }
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
}

clearDatabase();
