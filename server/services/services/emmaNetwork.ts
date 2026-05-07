/**
 * 🌐 EMMA NETWORK - DR CREATOR IMPORT SYSTEM
 * 
 * Emma's 2,000+ Dominican Republic creator network
 * Trust-based partnership for CreatorVault expansion
 * 
 * Version: 1.0
 * Integrated: December 23, 2024
 */

import { db } from "../db";
import { users, emmaNetwork } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface EmmaCreatorRecord {
  name: string;
  email?: string;
  phone?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  contentType: string[]; // ["fashion", "lifestyle", "beauty"]
  primaryLanguage: "spanish" | "bilingual" | "english";
  city: string; // City in DR
  country: "DR";
  referredBy: "Emma";
  contactDate?: string;
  status: "pending" | "contacted" | "interested" | "onboarded" | "declined";
  notes?: string;
  tags?: string[];
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ record: EmmaCreatorRecord; error: string }>;
}

/**
 * Check if creator already exists in database
 */
async function checkDuplicate(record: EmmaCreatorRecord): Promise<boolean> {
  // Check by email
  if (record.email) {
    const existingByEmail = await db.select().from(users).where(eq(users.email, record.email)).limit(1);
    if (existingByEmail.length > 0) return true;
  }

  // Check by Instagram handle
  if (record.instagram) {
    const existingByInstagram = await db.select().from(emmaNetwork).where(eq(emmaNetwork.instagram, record.instagram)).limit(1);
    if (existingByInstagram.length > 0) return true;
  }

  // Check by phone/WhatsApp
  if (record.whatsapp) {
    const existingByWhatsApp = await db.select().from(emmaNetwork).where(eq(emmaNetwork.whatsapp, record.whatsapp)).limit(1);
    if (existingByWhatsApp.length > 0) return true;
  }

  return false;
}

/**
 * Create Emma Network user in database
 */
async function createEmmaNetworkUser(record: EmmaCreatorRecord): Promise<void> {
  // Create user account
  const [user] = await db.insert(users).values({
    openId: `emma-dr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: record.name,
    email: record.email || `${record.name.toLowerCase().replace(/\s+/g, ".")}@temp.creatorvault.com`,
    role: "user",
    language: record.primaryLanguage === "spanish" ? "es" : record.primaryLanguage === "bilingual" ? "es" : "en",
    country: "DR",
    createdAt: new Date(),
  }).$returningId();

  // Create Emma Network entry
  await db.insert(emmaNetwork).values({
    userId: user.id,
    instagram: record.instagram,
    tiktok: record.tiktok,
    whatsapp: record.whatsapp,
    contactDate: record.contactDate ? new Date(record.contactDate) : null,
    onboardedDate: record.status === "onboarded" ? new Date() : null,
    city: record.city,
    contentTags: record.contentType,
    notes: record.notes,
    createdAt: new Date(),
  });
}

/**
 * Import Emma Network creators in bulk
 * 
 * CSV Format Expected:
 * name,instagram,tiktok,contentType,city,status
 * Maria Rodriguez,@maria_dr,@mariatiktok,"fashion,lifestyle",Santo Domingo,contacted
 */
export async function importEmmaNetwork(records: EmmaCreatorRecord[]): Promise<ImportResult> {
  let success = 0;
  let failed = 0;
  let duplicates = 0;
  const errors: Array<{ record: EmmaCreatorRecord; error: string }> = [];

  for (const record of records) {
    try {
      // Validate required fields
      if (!record.name) {
        throw new Error("Name is required");
      }
      if (!record.city) {
        throw new Error("City is required");
      }
      if (!record.contentType || record.contentType.length === 0) {
        throw new Error("Content type is required");
      }

      // Check for duplicates
      const isDuplicate = await checkDuplicate(record);
      if (isDuplicate) {
        duplicates++;
        continue;
      }

      // Insert into database
      await createEmmaNetworkUser(record);
      success++;
    } catch (error) {
      failed++;
      errors.push({
        record,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { success, failed, duplicates, errors };
}

/**
 * Get Emma Network statistics
 */
export async function getEmmaNetworkStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCity: Record<string, number>;
  byContentType: Record<string, number>;
}> {
  const allRecords = await db.select().from(emmaNetwork);

  const byStatus: Record<string, number> = {
    pending: 0,
    contacted: 0,
    interested: 0,
    onboarded: 0,
    declined: 0,
  };

  const byCity: Record<string, number> = {};
  const byContentType: Record<string, number> = {};

  for (const record of allRecords) {
    // Status counting
    if (record.onboardedDate) {
      byStatus.onboarded++;
    } else if (record.contactDate) {
      byStatus.contacted++;
    } else {
      byStatus.pending++;
    }

    // City counting
    if (record.city) {
      byCity[record.city] = (byCity[record.city] || 0) + 1;
    }

    // Content type counting
    if (record.contentTags && Array.isArray(record.contentTags)) {
      for (const tag of record.contentTags) {
        byContentType[tag] = (byContentType[tag] || 0) + 1;
      }
    }
  }

  return {
    total: allRecords.length,
    byStatus,
    byCity,
    byContentType,
  };
}

/**
 * Parse CSV file into EmmaCreatorRecord array
 */
export function parseEmmaNetworkCSV(csvContent: string): EmmaCreatorRecord[] {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const records: EmmaCreatorRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const record: any = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value: any = values[j];

      // Parse content type array
      if (header === "contentType" && value) {
        value = value.replace(/["\[\]]/g, "").split(/\s*,\s*/);
      }

      // Parse tags array
      if (header === "tags" && value) {
        value = value.replace(/["\[\]]/g, "").split(/\s*,\s*/);
      }

      record[header] = value || undefined;
    }

    // Set defaults
    record.country = "DR";
    record.referredBy = "Emma";
    record.status = record.status || "pending";
    record.primaryLanguage = record.primaryLanguage || "spanish";

    records.push(record as EmmaCreatorRecord);
  }

  return records;
}
