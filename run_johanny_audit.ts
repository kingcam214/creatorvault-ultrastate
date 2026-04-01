import { runSocialMediaAudit } from "./server/services/socialMediaAudit";
import { db } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Looking up Johanny...");
  const johannyUsers = await db.select().from(users).where(eq(users.username, "johanny"));
  
  if (johannyUsers.length === 0) {
    console.log("Johanny not found in database.");
    process.exit(1);
  }
  
  const johanny = johannyUsers[0];
  console.log(`Found Johanny (ID: ${johanny.id})`);
  
  console.log("Running Social Media Audit...");
  try {
    const auditResult = await runSocialMediaAudit(johanny.id.toString(), [
      { platform: "instagram", username: "johanny_dr" },
      { platform: "tiktok", username: "johanny_baseball" }
    ]);
    
    console.log("Audit Result:", JSON.stringify(auditResult, null, 2));
    console.log("Audit successfully completed!");
  } catch (error) {
    console.error("Error running audit:", error);
  }
  
  process.exit(0);
}

main().catch(console.error);
