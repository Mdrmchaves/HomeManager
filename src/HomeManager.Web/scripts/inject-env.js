const fs = require('fs');
const path = require('path');

const envTemplate = path.join(__dirname, '../src/environments/environment.template.ts');
const envProd = path.join(__dirname, '../src/environments/environment.prod.ts');

let content = fs.readFileSync(envTemplate, 'utf-8');

console.log(process.env.SUPABASE_ANON_KEY || '');

content = content.replace('__API_URL__', process.env.API_URL || '')
                 .replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '')
                 .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '');

fs.writeFileSync(envProd, content);
console.log('✅ environment.production.ts gerado com sucesso!');
