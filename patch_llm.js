const fs = require('fs');
let code = fs.readFileSync('server/_core/llm.ts', 'utf8');
code = code.replace(
  /ENV\.forgeApiUrl && ENV\.forgeApiUrl\.trim\(\)\.length > 0\s*\?\s*`\$\{ENV\.forgeApiUrl\.replace\(\/\\\\\/\\$\/, ""\)\}\/v1\/chat\/completions`\s*:\s*"https:\/\/api\.openai\.com\/v1\/chat\/completions";/,
  'process.env.OPENAI_BASE_URL ? `${process.env.OPENAI_BASE_URL.replace(/\\\\/$/, "")}/chat/completions` : "https://api.openai.com/v1/chat/completions";'
);
fs.writeFileSync('server/_core/llm.ts', code);
