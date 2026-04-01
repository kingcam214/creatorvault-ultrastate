const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const creatorId = 8078;
  
  // Connect directly to the DB using the env var
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const vaultxPack = JSON.parse(fs.readFileSync('yodeiris_vaultx_pack.json', 'utf8'));
  const demoScript = fs.readFileSync('yodeiris_demo_script.md', 'utf8');
  
  const artifacts = {
    ...vaultxPack.artifacts,
    longformDemoScript: demoScript,
    teaserScripts: "Teaser scripts are integrated within the longform demo script."
  };
  
  const [rows] = await connection.execute('SELECT preferences FROM users WHERE id = ?', [creatorId]);
  
  if (rows.length === 0) {
    console.error("User not found!");
    process.exit(1);
  }
  
  let existingPreferences = {};
  try {
    if (rows[0].preferences) {
      existingPreferences = typeof rows[0].preferences === 'string' ? JSON.parse(rows[0].preferences) : rows[0].preferences;
    }
  } catch (e) {}
  
  const updatedPreferences = {
    ...existingPreferences,
    artifacts: artifacts
  };
  
  await connection.execute(
    'UPDATE users SET preferences = ? WHERE id = ?',
    [JSON.stringify(updatedPreferences), creatorId]
  );
  
  console.log(`Successfully persisted artifacts for creator ${creatorId}`);
  console.log("Storage location: users table, preferences JSON column, under the 'artifacts' key.");
  console.log("Fetch method: db.query.users.findFirst() and parsing the preferences column.");
  console.log("Identifier: creatorId = 8078");
  
  fs.writeFileSync('yodeiris_canonical_bundle.json', JSON.stringify(updatedPreferences, null, 2));
  
  await connection.end();
}

main().catch(console.error);
