const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const connection = await mysql.createConnection("mysql://creatorvault:KingCam214CreatorVault@localhost:3306/creatorvault");
  
  const userId = 8078;
  const bundleContent = fs.readFileSync('/root/yodeiris_vaultspace_bundle_001.json', 'utf8');
  
  const [result] = await connection.execute(
    'INSERT INTO content (user_id, title, description, file_url, file_key, content_type, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      'VaultSpace Bundle 001',
      'Canonical VaultSpace Premium Bundle for Yodeiris',
      'internal://db',
      'vaultspace_bundle_yodeiris_001',
      'vaultspace_bundle',
      bundleContent
    ]
  );
  
  console.log(`Successfully persisted VaultSpace bundle. Insert ID: ${result.insertId}`);
  
  await connection.end();
}

run().catch(console.error);
