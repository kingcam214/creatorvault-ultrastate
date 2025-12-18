# Owner Control Panel Documentation

## CONTROL GAP DIRECTIVE — FULFILLED

This document explains how to access and use the centralized Owner Control Panel.

---

## Access

**URL:** `/owner-control`

**Authentication:** Owner (king) or Admin role required

**Login Flow:**
1. Navigate to the CreatorVault platform
2. Click "🛡️ Owner Control" button on the home page
3. If not authenticated, you will be redirected to login
4. After login, you will have full access to the control panel

---

## Features

### 1. Overview Dashboard

**Purpose:** High-level system health and statistics

**Displays:**
- Total deployments (active/paused/error)
- Total bots (active/paused/error)
- Total channels (active/paused/error)
- Total links and access counts
- Database health status
- Bot types breakdown (Telegram, WhatsApp, AI, Live)

**Actions:**
- View real-time stats
- Monitor database health
- Check last health check timestamps

---

### 2. Bot Management

**Purpose:** Enable/disable bots and broadcasts

**Displays:**
- All registered bots (Telegram, WhatsApp, AI Assistant, Live)
- Bot status (active/paused/error)
- Message counts
- Last activity timestamps

**Actions:**
- **Enable/Disable Bot:** Toggle switch to activate or pause bot operations
- **Enable/Disable Broadcast:** Toggle switch to allow or block broadcast messages
- View bot metadata (tokens, webhook URLs, phone numbers)

**How to Enable/Disable a Bot:**
1. Navigate to "Bots" tab
2. Find the bot you want to control
3. Toggle the "Bot Enabled" switch
4. System will update bot status in database
5. Toast notification confirms action

**How to Enable/Disable Broadcasts:**
1. Navigate to "Bots" tab
2. Find the bot you want to control
3. Toggle the "Broadcast Enabled" switch
4. System logs broadcast toggle event
5. Toast notification confirms action

---

### 3. Deployments

**Purpose:** Track all active deployments

**Displays:**
- Deployment name
- Deployment URL (manus.space links)
- Status (active/paused/error)
- Owner
- Deployment timestamp
- Last health check

**Actions:**
- Visit deployment (opens in new tab)
- View deployment metadata (version, features)

**Current Deployments:**
- **CreatorVault ULTRASTATE**
  - URL: https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer
  - Owner: KINGCAM
  - Features: server, db, user
  - Version: 7e5c1532

---

### 4. Channels & Platforms

**Purpose:** Monitor all active channels

**Displays:**
- Channel name
- Platform
- Status (active/paused/error)
- Subscriber counts (if available)

**Current Channels:**
- Marketplace (`/marketplace`)
- University (`/university`)
- Services (`/services`)
- AI Bot (`/ai-bot`)
- Command Hub (`/command-hub`)

---

### 5. Link Registry

**Purpose:** Track all generated manus.space links with traceability

**Displays:**
- Full URL
- Link type (deployment/bot/channel/feature)
- Destination
- Created by (user)
- Creation timestamp
- Access count
- Last accessed timestamp

**Why This Matters:**
- **NO ORPHANED LINKS:** Every generated link is registered
- **TRACEABILITY:** You can see WHO created a link and WHEN
- **ANALYTICS:** Track how many times each link is accessed
- **GOVERNANCE:** All links route back to this control panel

---

### 6. System Logs

**Purpose:** Real-time execution logs and error surfacing

**Displays:**
- Log level (info/warn/error/critical)
- Component (which system generated the log)
- Message
- Timestamp
- Metadata (additional context)

**Log Sources:**
- Bot events (all bot interactions)
- Command executions
- System errors
- Broadcast toggles

**How to Monitor Errors:**
1. Navigate to "Logs" tab
2. Errors are highlighted in RED
3. Warnings are highlighted in YELLOW
4. Info logs are highlighted in BLUE
5. Click on a log to see full metadata

---

### 7. Role Governance

**Purpose:** Manage user roles and permissions

**Displays:**
- Total users
- Users by role (Owner/Admin/Creator/User)
- Users by status (Active/Pending/Suspended)

**Role Hierarchy:**
1. **Owner (King):** Full system access, can manage all users and bots
2. **Admin:** Can access control panel, manage bots and channels
3. **Creator:** Can create content, products, courses, services
4. **User:** Standard user access

**How to Manage Roles:**
- Navigate to `/king/users` for full user management
- Update user roles via King Dashboard
- Role changes are enforced immediately

---

## Role-Based Access Control

**Owner/Admin Only:**
- All Owner Control Panel features
- Bot enable/disable
- Broadcast enable/disable
- System logs access
- Deployment management

**Creator:**
- Command Hub access
- AI Bot access
- Marketplace/University/Services access
- Cannot access Owner Control Panel

**User:**
- Marketplace/University/Services access (read-only)
- Cannot create content
- Cannot access Owner Control Panel

---

## Database Health Monitoring

**What is Monitored:**
- Total users
- Total bot events
- Total Telegram bots
- Total WhatsApp providers

**Health Status:**
- **Healthy:** All database queries successful
- **Error:** Database connection or query failed

**How to Check Database Health:**
1. Navigate to "Overview" tab
2. View "Database Health" card
3. Check status badge (green = healthy, red = error)
4. View table counts
5. Check last health check timestamp

---

## System Architecture

**Backend Services:**
- `systemRegistry.ts` — Centralized registry for all system components
- `ownerControl.ts` — tRPC router for Owner Control Panel

**Database Tables:**
- `users` — All user accounts with roles
- `telegram_bots` — Telegram bot configurations
- `whatsapp_providers` — WhatsApp provider configurations
- `bot_events` — All bot interactions and system logs

**Frontend:**
- `/owner-control` — Owner Control Panel UI
- Real-time queries via tRPC
- Automatic refetch after mutations

---

## Security

**Authentication:**
- Owner Control Panel requires Owner (king) or Admin role
- Role-based middleware enforces permissions
- Unauthorized access returns 403 FORBIDDEN

**Bot Tokens:**
- Telegram bot tokens are masked as "***" in UI
- WhatsApp credentials are encrypted in database
- No sensitive data exposed in frontend

---

## Operational Guidelines

### How to Control Everything

1. **Access Control Panel:** Navigate to `/owner-control`
2. **Monitor System Health:** Check Overview tab for real-time stats
3. **Manage Bots:** Use Bots tab to enable/disable bots and broadcasts
4. **Track Deployments:** Use Deployments tab to see all active sites
5. **Monitor Logs:** Use Logs tab to surface errors and execution history
6. **Govern Roles:** Use Roles tab to see user distribution

### Where to Log In

**Primary Access:** https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/owner-control

**Fallback Access:** Navigate to home page and click "🛡️ Owner Control" button

### How Ambassadors and Creators are Governed

**Ambassadors:**
- Assigned "creator" role in database
- Can access Command Hub, AI Bot, Creator Dashboard
- Cannot access Owner Control Panel
- All actions logged to bot_events table

**Creators:**
- Assigned "creator" role in database
- Can create products, courses, services
- Can use AI Assistant for role-specific guidance
- Cannot enable/disable bots
- Cannot access system logs

**Governance Enforcement:**
- Role-based middleware in tRPC routers
- Frontend route guards (coming soon)
- Database-level permissions

---

## Troubleshooting

**Issue:** Cannot access Owner Control Panel

**Solution:**
1. Check your user role in database (must be "king" or "admin")
2. Clear browser cache and cookies
3. Log out and log back in
4. Contact system administrator to update your role

**Issue:** Bot toggle not working

**Solution:**
1. Check bot status in database
2. Verify bot ID is correct
3. Check system logs for errors
4. Ensure database connection is healthy

**Issue:** Logs not displaying

**Solution:**
1. Check database health in Overview tab
2. Verify bot_events table has records
3. Increase log limit in query
4. Check browser console for errors

---

## Future Enhancements

**Planned Features:**
- Real-time WebSocket updates for logs
- Bot performance metrics (response time, error rate)
- Link analytics dashboard (click-through rates)
- Automated health checks with alerts
- Role assignment UI (currently requires database access)
- Feature toggle system (enable/disable entire features)
- Deployment rollback controls

---

## Contact

**System Owner:** KINGCAM

**Support:** For issues or feature requests, contact the system administrator.

---

## Changelog

**2024-12-18:** Initial release of Owner Control Panel
- Centralized system registry
- Bot management with enable/disable controls
- Deployment tracking
- Link registry with traceability
- Real-time logs
- Role governance dashboard
