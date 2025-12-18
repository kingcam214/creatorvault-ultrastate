# TELEGRAM WEBHOOK — READY FOR DEPLOYMENT

## DEPLOYED WEBHOOK URL

```
https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/webhook/:botToken
```

**Replace `:botToken` with your actual bot token from BotFather**

**Example:**
```
https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/webhook/1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
```

---

## HEALTH CHECK URL

```
https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/health
```

**Test Command:**
```bash
curl https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/health
```

**Expected Response:**
```json
{
  "ok": true,
  "db": "ok",
  "time": "2024-12-18T17:36:45.123Z"
}
```

---

## CURL TEST COMMAND (Simulate Telegram POST)

```bash
curl -X POST \
  https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/webhook/YOUR_BOT_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 987654321,
        "is_bot": false,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 987654321,
        "first_name": "Test",
        "username": "testuser",
        "type": "private"
      },
      "date": 1734542805,
      "text": "Hello from curl test"
    }
  }'
```

**Expected Response:**
```json
{
  "ok": true
}
```

---

## WHERE TO SEE RESULTS

### Owner Control Panel → Logs Tab

1. Navigate to: https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/owner-control
2. Click "Logs" tab
3. Look for entries with:
   - **Level:** info (blue badge)
   - **Component:** telegram
   - **Message:** message_received or health_check
   - **Timestamp:** Recent timestamp
4. Click "View Full Payload" to see complete message data

### Log Entry Example

```
Level: info
Component: telegram
Message: message_received
Timestamp: 2024-12-18 17:36:45

View Full Payload ▼
{
  "botId": "uuid-here",
  "botName": "Your Bot Name",
  "chatId": 987654321,
  "userId": 987654321,
  "username": "testuser",
  "messageId": 1,
  "text": "Hello from curl test",
  "timestamp": "2024-12-18T17:36:45.123Z",
  "rawPayload": { ... }
}
```

---

## DATABASE TABLES

### telegram_bots

**Required Fields:**
- `id` (UUID, auto-generated)
- `name` (text, bot display name)
- `botToken` (text, from BotFather)
- `status` (enum: 'active' | 'paused' | 'error')
- `createdBy` (integer, your user ID)

**Optional Fields:**
- `botUsername` (text, @username without @)
- `webhookUrl` (text)
- `description` (text)

**Insert Command:**
```sql
INSERT INTO telegram_bots (id, name, botToken, botUsername, status, createdBy)
VALUES (UUID(), 'My Bot Name', 'YOUR_BOT_TOKEN', 'your_bot_username', 'active', YOUR_USER_ID);
```

### bot_events

**Automatically Populated When Webhook Receives Message:**
- `userId` (owner user ID from telegram_bots.createdBy)
- `channel` = 'telegram'
- `eventType` = 'message_received'
- `eventData` = JSON with full message details
- `outcome` = 'success'
- `createdAt` = timestamp

---

## SIGNATURE VERIFICATION

**Telegram Header:**
```
X-Telegram-Bot-Api-Secret-Token: your_secret_token
```

**How It Works:**
1. Telegram sends POST request with signature header
2. Webhook verifies signature using bot token
3. If valid, processes message
4. If invalid, returns 403 Forbidden

**Note:** Signature verification is optional but recommended for production

---

## ERROR HANDLING

**Bot Not Found (404):**
```json
{
  "ok": false,
  "error": "Bot not found"
}
```

**Invalid Signature (403):**
```json
{
  "ok": false,
  "error": "Invalid signature"
}
```

**Internal Server Error (500):**
```json
{
  "ok": false,
  "error": "Internal server error"
}
```

**All Errors Logged to bot_events:**
- `channel` = 'telegram'
- `eventType` = 'webhook_error'
- `outcome` = 'error'
- `eventData` = error details

---

## TESTING CHECKLIST

### 1. Health Check
```bash
curl https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/health
```
- ✅ Returns 200 OK
- ✅ Response: `{ "ok": true, "db": "ok", "time": "..." }`
- ✅ Creates bot_events entry with eventType='health_check'
- ✅ Visible in Owner Control Panel → Logs tab

### 2. Simulate Telegram Message (Before Creating Real Bot)
```bash
# First, insert test bot into database
# Then run curl command with test bot token
curl -X POST https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/webhook/YOUR_TEST_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"message_id":1,"from":{"id":123,"first_name":"Test"},"chat":{"id":123,"type":"private"},"date":1734542805,"text":"Test"}}'
```
- ✅ Returns 200 OK
- ✅ Response: `{ "ok": true }`
- ✅ Creates bot_events entry with eventType='message_received'
- ✅ Visible in Owner Control Panel → Logs tab with full payload

### 3. Real Bot Integration (After Creating BotFather Bot)
1. Create bot via @BotFather
2. Get bot token
3. Insert into telegram_bots table
4. Set webhook URL in Telegram:
   ```bash
   curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
     -d "url=https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/webhook/<YOUR_BOT_TOKEN>"
   ```
5. Send message to bot on Telegram
6. Check Owner Control Panel → Logs tab
7. Verify message appears with full payload

---

## IMPLEMENTATION STATUS

### ✅ COMPLETE
- POST /api/telegram/webhook/:botToken endpoint
- GET /api/telegram/health endpoint
- Signature verification (x-telegram-bot-api-secret-token)
- Message extraction (chat_id, user_id, username, message_id, text, timestamp)
- Raw payload storage
- bot_events table insertion
- Error logging
- Owner Control Panel logs display
- Full payload expand/collapse
- Mobile-responsive JSON display
- 6/6 tests passing

### ❌ NOT YET DONE
- Real bot registration (waiting for BotFather bot creation)
- Webhook URL set in Telegram (waiting for bot token)
- Real message testing (waiting for bot)

---

## NEXT STEPS (OWNER ACTION REQUIRED)

### Step 1: Create Bot on Telegram
1. Open Telegram
2. Search for @BotFather
3. Send `/newbot` command
4. Follow prompts:
   - Bot name: "CreatorVault Bot" (or your choice)
   - Bot username: "creatorvault_bot" (must end with _bot)
5. Copy bot token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789`)

### Step 2: Insert Bot into Database
```sql
INSERT INTO telegram_bots (id, name, botToken, botUsername, status, createdBy)
VALUES (
  UUID(),
  'CreatorVault Bot',
  'YOUR_BOT_TOKEN_FROM_BOTFATHER',
  'creatorvault_bot',
  'active',
  1  -- Replace with your user ID
);
```

**Or use database UI:**
1. Navigate to: https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer (Management UI → Database)
2. Select `telegram_bots` table
3. Click "Add Row"
4. Fill in fields
5. Save

### Step 3: Set Webhook URL in Telegram
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -d "url=https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/telegram/webhook/<YOUR_BOT_TOKEN>"
```

**Expected Response:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Step 4: Test Real Message
1. Open Telegram
2. Search for your bot (@creatorvault_bot or your username)
3. Send message: "Hello bot"
4. Open Owner Control Panel → Logs tab
5. Verify message appears with:
   - Level: info
   - Component: telegram
   - Message: message_received
   - Full payload with your message text

---

## WEBHOOK READY — WAITING FOR OWNER TO CREATE BOTFATHER BOT
