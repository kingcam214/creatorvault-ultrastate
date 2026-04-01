import { db } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Checking if Johanny exists...");
  const existingUsers = await db.select().from(users).where(eq(users.username, "johanny"));
  
  if (existingUsers.length > 0) {
    console.log("Johanny already exists:", existingUsers[0]);
    process.exit(0);
  }

  console.log("Adding Johanny...");
  const result = await db.insert(users).values({
    username: "johanny",
    firstName: "Johanny",
    lastName: "Dominicana",
    email: "johanny@example.com",
    role: "creator",
    creatorStatus: "active",
    country: "Dominican Republic",
    city: "Puerto Plata",
    language: "es-DO",
    bio: "Baseball player from Dominican Republic living in Puerto Plata. Also a main recruit for that area.",
    tiktokHandle: "johanny_baseball",
    instagramHandle: "johanny_dr",
    onlyfansHandle: "johanny_vip",
    fanslyHandle: "johanny_fans",
  });
  
  console.log("Added Johanny successfully!");
  
  const newUser = await db.select().from(users).where(eq(users.username, "johanny"));
  console.log("New user:", newUser[0]);
  process.exit(0);
}

main().catch(console.error);
