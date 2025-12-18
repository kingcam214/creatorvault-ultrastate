import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "creatorvault.db");

export interface TelegramBot {
  id: string;
  name: string;
  botToken: string;
  webhookUrl: string | null;
  status: string;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export interface TelegramLead {
  id: string;
  botId: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  country: string | null;
  creatorType: string | null;
  funnelId: string | null;
  currentStep: number;
  dataJson: string | null;
  createdAt: number;
  updatedAt: number;
}

export class TelegramService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma("foreign_keys = ON");
  }

  // Create bot
  createBot(params: {
    name: string;
    botToken: string;
    webhookUrl?: string;
    createdBy: number;
  }): TelegramBot {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO telegram_bots (id, name, botToken, webhookUrl, status, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `);

    stmt.run(
      id,
      params.name,
      params.botToken,
      params.webhookUrl || null,
      params.createdBy,
      now,
      now
    );

    return this.getBot(id)!;
  }

  // Get bot
  getBot(id: string): TelegramBot | null {
    const stmt = this.db.prepare("SELECT * FROM telegram_bots WHERE id = ?");
    return stmt.get(id) as TelegramBot | null;
  }

  // List bots
  listBots(): TelegramBot[] {
    const stmt = this.db.prepare("SELECT * FROM telegram_bots ORDER BY createdAt DESC");
    return stmt.all() as TelegramBot[];
  }

  // Create lead from Telegram message
  createLead(params: {
    botId: string;
    telegramUserId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    country?: string;
    creatorType?: string;
    funnelId?: string;
    dataJson?: any;
  }): TelegramLead {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO telegram_leads (
        id, botId, telegramUserId, username, firstName, lastName,
        email, country, creatorType, funnelId, currentStep, dataJson,
        createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.botId,
      params.telegramUserId,
      params.username || null,
      params.firstName || null,
      params.lastName || null,
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
      VALUES (?, 'telegram', ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `);

    leadStmt.run(
      crypto.randomUUID(),
      params.telegramUserId,
      params.email || null,
      params.firstName || params.username || null,
      params.country || null,
      params.creatorType || null,
      params.dataJson ? JSON.stringify(params.dataJson) : null,
      now,
      now
    );

    return this.getLead(id)!;
  }

  // Get lead
  getLead(id: string): TelegramLead | null {
    const stmt = this.db.prepare("SELECT * FROM telegram_leads WHERE id = ?");
    return stmt.get(id) as TelegramLead | null;
  }

  // Get lead by Telegram user ID
  getLeadByTelegramUserId(botId: string, telegramUserId: string): TelegramLead | null {
    const stmt = this.db.prepare(
      "SELECT * FROM telegram_leads WHERE botId = ? AND telegramUserId = ?"
    );
    return stmt.get(botId, telegramUserId) as TelegramLead | null;
  }

  // Update lead
  updateLead(id: string, updates: Partial<TelegramLead>): void {
    const now = Math.floor(Date.now() / 1000);
    const fields: string[] = [];
    const values: any[] = [];

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

    const stmt = this.db.prepare(`UPDATE telegram_leads SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);
  }

  // List leads
  listLeads(botId?: string): TelegramLead[] {
    if (botId) {
      const stmt = this.db.prepare(
        "SELECT * FROM telegram_leads WHERE botId = ? ORDER BY createdAt DESC"
      );
      return stmt.all(botId) as TelegramLead[];
    }
    const stmt = this.db.prepare("SELECT * FROM telegram_leads ORDER BY createdAt DESC");
    return stmt.all() as TelegramLead[];
  }

  // Handle incoming Telegram webhook
  async handleWebhook(botId: string, update: any): Promise<{ success: boolean; leadId?: string }> {
    try {
      const message = update.message || update.edited_message;
      if (!message) return { success: false };

      const from = message.from;
      if (!from) return { success: false };

      // Check if lead exists
      let lead = this.getLeadByTelegramUserId(botId, String(from.id));

      if (!lead) {
        // Create new lead
        lead = this.createLead({
          botId,
          telegramUserId: String(from.id),
          username: from.username,
          firstName: from.first_name,
          lastName: from.last_name,
          dataJson: { language_code: from.language_code },
        });
      }

      // Process message text for data collection
      const text = message.text?.toLowerCase() || "";

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
        "telegram.webhook",
        `telegram_user_${from.id}`,
        "process_message",
        lead.id,
        JSON.stringify({ message: text.substring(0, 100) }),
        Math.floor(Date.now() / 1000)
      );

      return { success: true, leadId: lead.id };
    } catch (err: any) {
      console.error("Telegram webhook error:", err);
      return { success: false };
    }
  }

  close() {
    this.db.close();
  }
}

// Export singleton
export const telegramService = new TelegramService();
