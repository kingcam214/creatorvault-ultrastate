import { runSocialMediaAudit } from "./server/services/socialMediaAudit";
import { db } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Looking up Yodeiris...");
  const yodeirisUsers = await db.select().from(users).where(eq(users.id, 8078));
  
  if (yodeirisUsers.length === 0) {
    console.log("Yodeiris not found in database.");
    process.exit(1);
  }
  
  const yodeiris = yodeirisUsers[0];
  console.log(`Found Yodeiris (ID: ${yodeiris.id})`);
  
  console.log("Running Social Media Audit...");
  try {
    const auditResult = await runSocialMediaAudit(yodeiris.id.toString(), [
      { platform: "instagram", username: "la_yoder_" },
      { platform: "tiktok", username: "yodeiriscaraballo18" }
    ]);
    
    console.log("Audit Result:", JSON.stringify(auditResult, null, 2));
    console.log("Audit successfully completed!");
  } catch (error) {
    console.error("Error running audit:", error);
  }
  
  process.exit(0);
}

main().catch(console.error);
