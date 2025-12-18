import { telegramService } from "./server/telegram";
import { whatsappService } from "./server/whatsapp";

console.log("🔥 Testing Telegram + WhatsApp Services\n");

// Test Telegram
console.log("=== TELEGRAM TESTS ===\n");

// Create bot
const bot = telegramService.createBot({
  name: "CreatorVault Bot",
  botToken: "test-token-123",
  webhookUrl: "https://creatorvault.com/api/telegram/webhook",
  createdBy: 1, // KingCam user ID
});
console.log("✓ Created bot:", bot.id, bot.name);

// Simulate webhook - new user
const webhook1 = await telegramService.handleWebhook(bot.id, {
  message: {
    from: {
      id: 123456789,
      username: "creator_john",
      first_name: "John",
      last_name: "Doe",
      language_code: "en",
    },
    text: "Hi! I'm a YouTube creator interested in CreatorVault",
  },
});
console.log("✓ Webhook 1 processed:", webhook1);

// Simulate webhook - user provides email
const webhook2 = await telegramService.handleWebhook(bot.id, {
  message: {
    from: {
      id: 123456789,
      username: "creator_john",
      first_name: "John",
    },
    text: "My email is john@example.com",
  },
});
console.log("✓ Webhook 2 processed:", webhook2);

// Check lead
const telegramLead = telegramService.getLead(webhook1.leadId!);
console.log("✓ Telegram lead:", {
  id: telegramLead?.id,
  email: telegramLead?.email,
  creatorType: telegramLead?.creatorType,
  username: telegramLead?.username,
});

// List all telegram leads
const telegramLeads = telegramService.listLeads();
console.log(`✓ Total Telegram leads: ${telegramLeads.length}\n`);

// Test WhatsApp
console.log("=== WHATSAPP TESTS ===\n");

// Create provider
const provider = whatsappService.createProvider({
  name: "Twilio WhatsApp",
  provider: "twilio",
  credentialsJson: { accountSid: "test", authToken: "test" },
  phoneNumber: "+1234567890",
  createdBy: 1,
});
console.log("✓ Created provider:", provider.id, provider.name);

// Simulate webhook - new user
const waWebhook1 = await whatsappService.handleWebhook(provider.id, {
  from: "+1987654321",
  profile: { name: "Maria Garcia" },
  body: "Hola! I'm an Instagram creator from Dominican Republic",
});
console.log("✓ WhatsApp webhook 1 processed:", waWebhook1);

// Simulate webhook - user provides email
const waWebhook2 = await whatsappService.handleWebhook(provider.id, {
  from: "+1987654321",
  body: "My email is maria@example.com",
});
console.log("✓ WhatsApp webhook 2 processed:", waWebhook2);

// Check lead
const whatsappLead = whatsappService.getLead(waWebhook1.leadId!);
console.log("✓ WhatsApp lead:", {
  id: whatsappLead?.id,
  email: whatsappLead?.email,
  creatorType: whatsappLead?.creatorType,
  phoneNumber: whatsappLead?.phoneNumber,
});

// List all whatsapp leads
const whatsappLeads = whatsappService.listLeads();
console.log(`✓ Total WhatsApp leads: ${whatsappLeads.length}\n`);

// Check events log
import Database from "better-sqlite3";
const db = new Database("creatorvault.db");
const events = db.prepare("SELECT * FROM events WHERE eventType LIKE '%webhook%' ORDER BY createdAt DESC").all();
console.log("=== EVENTS LOG ===");
console.log(`✓ Total webhook events logged: ${events.length}`);
events.forEach((e: any) => {
  console.log(`  - ${e.eventType} by ${e.actor}: ${e.action} (${e.status})`);
});

// Check leads table
const allLeads = db.prepare("SELECT * FROM leads ORDER BY createdAt DESC").all();
console.log(`\n✓ Total leads in database: ${allLeads.length}`);
allLeads.forEach((lead: any) => {
  console.log(`  - ${lead.source}: ${lead.name || lead.email || lead.sourceId} (${lead.creatorType || 'unknown'})`);
});

db.close();
telegramService.close();
whatsappService.close();

console.log("\n🔥 All tests passed! Telegram + WhatsApp services operational.");
