import * as dotenv from "dotenv";
dotenv.config();
import { db } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

async function main() {
  const creatorId = 8078;
  
  // Read the artifacts we generated
  const vaultxPack = JSON.parse(fs.readFileSync('yodeiris_vaultx_pack.json', 'utf8'));
  const demoScript = fs.readFileSync('yodeiris_demo_script.md', 'utf8');
  
  const artifacts = {
    ...vaultxPack.artifacts,
    longformDemoScript: demoScript,
    teaserScripts: "Teaser scripts are integrated within the longform demo script."
  };
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, creatorId)
  });
  
  if (!user) {
    console.error("User not found!");
    return;
  }
  
  const existingPreferences = user.preferences ? (typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences) : {};
  
  const updatedPreferences = {
    ...existingPreferences,
    artifacts: artifacts
  };
  
  await db.update(users)
    .set({ preferences: JSON.stringify(updatedPreferences) })
    .where(eq(users.id, creatorId));
    
  console.log(`Successfully persisted artifacts for creator ${creatorId}`);
  console.log("Storage location: users table, preferences JSON column, under the 'artifacts' key.");
  console.log("Fetch method: db.query.users.findFirst() and parsing the preferences column.");
  console.log("Identifier: creatorId = 8078");
  
  // Also write to a local JSON file as backup/canonical source of truth
  fs.writeFileSync('yodeiris_canonical_bundle.json', JSON.stringify(updatedPreferences, null, 2));
}

main().catch(console.error);
