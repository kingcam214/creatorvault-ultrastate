import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "creatorvault.db");

export interface WhatsAppProvider {
  id: string;
  name: string;
  provider: string; // 'twilio', 'whatsapp-business-api', etc.
  credentialsJson: string;
  phoneNumber: string | null;
  status: string;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export interface WhatsAppLead {
  id: string;
  providerId: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  country: string | null;
  creatorType: string | null;
  funnelId: string | null;
  currentStep: number;
  dataJson: string | null;
  createdAt: number;
  updatedAt: number;
}

export class WhatsAppService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma("foreign_keys = ON");
  }

  // Create provider
  createProvider(params: {
    name: string;
    provider: string;
    credentialsJson: any;
    phoneNumber?: string;
    createdBy: number;
  }): WhatsAppProvider {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO whatsapp_providers (id, name, provider, credentialsJson, phoneNumber, status, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `);

    stmt.run(
      id,
      params.name,
      params.provider,
      JSON.stringify(params.credentialsJson),
      params.phoneNumber || null,
      params.createdBy,
      now,
      now
    );

    return this.getProvider(id)!;
  }

  // Get provider
  getProvider(id: string): WhatsAppProvider | null {
    const stmt = this.db.prepare("SELECT * FROM whatsapp_providers WHERE id = ?");
    return stmt.get(id) as WhatsAppProvider | null;
  }

  // List providers
  listProviders(): WhatsAppProvider[] {
    const stmt = this.db.prepare("SELECT * FROM whatsapp_providers ORDER BY createdAt DESC");
    return stmt.all() as WhatsAppProvider[];
  }

  // Create lead from WhatsApp message
  createLead(params: {
    providerId: string;
    phoneNumber: string;
    name?: string;
    email?: string;
    country?: string;
    creatorType?: string;
    funnelId?: string;
    dataJson?: any;
  }): WhatsAppLead {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO whatsapp_leads (
        id, providerId, phoneNumber, name, email, country, creatorType,
        funnelId, currentStep, dataJson, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.providerId,
      params.phoneNumber,
      params.name || null,
      params.email || null,
      params.country || null,
      params.creatorType || null,
      params.funnelId || null,
      params.dataJson ? JSON.stringify(params.dataJson) : null,
      now,
      now
    );

    // Also create in leads table
    const leadStmt = this.db.prepare(`
      INSERT INTO leads (id, source, sourceId, email, name, country, creatorType, status, dataJson, createdAt, updatedAt)
      VALUES (?, 'whatsapp', ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `);

    leadStmt.run(
      crypto.randomUUID(),
      params.phoneNumber,
      params.email || null,
      params.name || null,
      params.country || null,
      params.creatorType || null,
      params.dataJson ? JSON.stringify(params.dataJson) : null,
      now,
      now
    );

    return this.getLead(id)!;
  }

  // Get lead
  getLead(id: string): WhatsAppLead | null {
    const stmt = this.db.prepare("SELECT * FROM whatsapp_leads WHERE id = ?");
    return stmt.get(id) as WhatsAppLead | null;
  }

  // Get lead by phone number
  getLeadByPhoneNumber(providerId: string, phoneNumber: string): WhatsAppLead | null {
    const stmt = this.db.prepare(
      "SELECT * FROM whatsapp_leads WHERE providerId = ? AND phoneNumber = ?"
    );
    return stmt.get(providerId, phoneNumber) as WhatsAppLead | null;
  }

  // Update lead
  updateLead(id: string, updates: Partial<WhatsAppLead>): void {
    const now = Math.floor(Date.now() / 1000);
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push("email = ?");
      values.push(updates.email);
    }
    if (updates.country !== undefined) {
      fields.push("country = ?");
      values.push(updates.country);
    }
    if (updates.creatorType !== undefined) {
      fields.push("creatorType = ?");
      values.push(updates.creatorType);
    }
    if (updates.currentStep !== undefined) {
      fields.push("currentStep = ?");
      values.push(updates.currentStep);
    }
    if (updates.dataJson !== undefined) {
      fields.push("dataJson = ?");
      values.push(updates.dataJson);
    }

    if (fields.length === 0) return;

    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`UPDATE whatsapp_leads SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);
  }

  // List leads
  listLeads(providerId?: string): WhatsAppLead[] {
    if (providerId) {
      const stmt = this.db.prepare(
        "SELECT * FROM whatsapp_leads WHERE providerId = ? ORDER BY createdAt DESC"
      );
      return stmt.all(providerId) as WhatsAppLead[];
    }
    const stmt = this.db.prepare("SELECT * FROM whatsapp_leads ORDER BY createdAt DESC");
    return stmt.all() as WhatsAppLead[];
  }

  // Handle incoming WhatsApp webhook
  async handleWebhook(
    providerId: string,
    message: any
  ): Promise<{ success: boolean; leadId?: string }> {
    try {
      const phoneNumber = message.from || message.phone_number;
      if (!phoneNumber) return { success: false };

      // Check if lead exists
      let lead = this.getLeadByPhoneNumber(providerId, phoneNumber);

      if (!lead) {
        // Create new lead
        lead = this.createLead({
          providerId,
          phoneNumber,
          name: message.profile?.name || message.name,
          dataJson: { provider_data: message },
        });
      }

      // Process message text for data collection
      const text = (message.text?.body || message.body || "").toLowerCase();

      // Extract email
      const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      if (emailMatch && !lead.email) {
        this.updateLead(lead.id, { email: emailMatch[1] });
      }

      // Extract creator type
      if (text.includes("youtube") || text.includes("youtuber")) {
        this.updateLead(lead.id, { creatorType: "youtube" });
      } else if (text.includes("instagram") || text.includes("ig")) {
        this.updateLead(lead.id, { creatorType: "instagram" });
      } else if (text.includes("tiktok")) {
        this.updateLead(lead.id, { creatorType: "tiktok" });
      } else if (text.includes("onlyfans") || text.includes("adult")) {
        this.updateLead(lead.id, { creatorType: "adult" });
      }

      // Log event
      const eventStmt = this.db.prepare(`
        INSERT INTO events (eventType, actor, action, featureId, inputsJson, status, createdAt)
        VALUES (?, ?, ?, ?, ?, 'success', ?)
      `);
      eventStmt.run(
        "whatsapp.webhook",
        `whatsapp_${phoneNumber}`,
        "process_message",
        lead.id,
        JSON.stringify({ message: text.substring(0, 100) }),
        Math.floor(Date.now() / 1000)
      );

      return { success: true, leadId: lead.id };
    } catch (err: any) {
      console.error("WhatsApp webhook error:", err);
      return { success: false };
    }
  }

  close() {
    this.db.close();
  }
}

// Export singleton
export const whatsappService = new WhatsAppService();
