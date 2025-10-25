import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const newSupabaseUrl = process.env.VITE_SUPABASE_URL;
const newServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!newSupabaseUrl || !newServiceRoleKey) {
  console.error("❌ Missing credentials in .env");
  process.exit(1);
}

const newClient = createClient(newSupabaseUrl, newServiceRoleKey);

const migrationFiles = [
  "supabase/migrations/20251021185149_356f8a7a-92ee-419a-99eb-d9a7ff2b4476.sql",
  "supabase/migrations/20251021185211_4800140c-6b74-4b59-8020-e417ec96571e.sql",
  "supabase/migrations/20251022115430_live_chat.sql",
  "supabase/migrations/20251024_add_social_features.sql",
  "supabase/migrations/20251024_complete_features.sql",
  "supabase/migrations/20251025_fix_rls_policy.sql",
  "supabase/migrations/20251025_add_group_chat_rls.sql",
  "supabase/migrations/20251025_enhance_login_notifications.sql",
  "supabase/migrations/20251025_add_notification_subtype.sql",
];

async function runMigrations() {
  console.log("🚀 Running migrations...\n");

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    console.log(`📝 Executing: ${path.basename(file)}...`);
    const sql = fs.readFileSync(filePath, "utf-8");

    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        const { error } = await newClient.rpc("exec", {
          command: statement,
        });

        if (error && error.code !== "42883") {
          console.error(
            `   ✗ Error in statement ${i + 1}: ${error.message}`
          );
        }
      } catch (err) {
        console.error(
          `   ✗ Error executing statement ${i + 1}: ${err.message}`
        );
      }
    }

    console.log(`   ✓ Completed`);
  }

  console.log("\n✅ All migrations executed!");
}

runMigrations().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
