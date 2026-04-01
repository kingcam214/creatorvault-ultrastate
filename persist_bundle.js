const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const connection = await mysql.createConnection("mysql://creatorvault:KingCam214CreatorVault@localhost:3306/creatorvault");
  
  const userId = 8078;
  console.log(`Found Johanny with ID: ${userId}`);

  const strategy = fs.readFileSync('/root/yodeiris_platformStrategy.md', 'utf8');
  const calendar = fs.readFileSync('/root/yodeiris_contentCalendar.md', 'utf8');
  const roadmap = fs.readFileSync('/root/yodeiris_monetizationRoadmap.md', 'utf8');
  const demoScript = fs.readFileSync('/root/yodeiris_demo_script.md', 'utf8');
  
  const bundle = {
    platformStrategy: strategy,
    contentCalendar: calendar,
    monetizationRoadmap: roadmap,
    longFormDemoScript: demoScript,
    teasers: [] 
  };
  
  const [result] = await connection.execute(
    'INSERT INTO content (user_id, title, description, file_url, file_key, content_type, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      'Johanny Strategy Bundle',
      'Canonical strategy bundle for VAULTX_ADULT_PREMIUM and LONGFORM_DEMOS_TOURS',
      'internal://db',
      'bundle_yodeiris_001',
      'strategy_bundle',
      JSON.stringify(bundle)
    ]
  );
  
  console.log(`Successfully persisted strategy bundle. Insert ID: ${result.insertId}`);
  
  const [savedContent] = await connection.execute(
    'SELECT * FROM content WHERE user_id = ? AND content_type = ? ORDER BY created_at DESC LIMIT 1',
    [userId, 'strategy_bundle']
  );
  
  console.log("Verification fetch successful.");
  console.log("Storage location: `content` table, `metadata` column (JSON)");
  console.log("Fetch function: `db.select().from(content).where(and(eq(content.userId, creatorId), eq(content.contentType, 'strategy_bundle')))`");
  
  await connection.end();
}

run().catch(console.error);
