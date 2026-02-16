const fs = require('fs');
const path = require('path');

const envTemplate = path.join(__dirname, '../src/environments/environment.template.ts');
const envProd = path.join(__dirname, '../src/environments/environment.prod.ts');

let content = fs.readFileSync(envTemplate, 'utf-8');

console.log("API_URL:", process.env.API_URL);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);

content = content
  .replace(/__API_URL__/g, process.env.API_URL || '')
  .replace(/__SUPABASE_URL__/g, process.env.SUPABASE_URL || '')
  .replace(/__SUPABASE_ANON_KEY__/g, process.env.SUPABASE_ANON_KEY || '');

fs.writeFileSync(envProd, content);
console.log('✅ environment.production.ts gerado com sucesso!');
