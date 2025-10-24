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

  let clearedCount = 0;
  let errorCount = 0;

  for (const table of tablesToClear) {
    try {
      const { error, status, statusText } = await supabase
        .from(table)
        .delete()
        .not("id", "is", null);

      if (error) {
        if (error.code === "PGRST204") {
          console.log(`✅ ${table}: Already empty`);
          clearedCount++;
        } else {
          console.log(`❌ ${table}: ${error.message}`);
          errorCount++;
        }
      } else if (status === 204) {
        console.log(`✅ ${table}: All records deleted`);
        clearedCount++;
      } else {
        console.log(`✅ ${table}: Cleared`);
        clearedCount++;
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Cleared: ${clearedCount}/${tablesToClear.length} tables`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} tables`);
  }
  console.log(`\n✨ Database clear complete! All data removed, tables remain intact.`);
}

clearDatabase().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
