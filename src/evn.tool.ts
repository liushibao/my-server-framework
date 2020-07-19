import fs from 'fs';
import  path from 'path';
import  cons from 'consolidate';

let src = path.resolve(process.cwd(), '.env.sample');
let dest = path.resolve(process.cwd(), 'dist/.env');
let evnText = fs.readFileSync(src, 'utf8');
evnText = evnText.replace(/# NO_DEFAULT /gu, '');
fs.writeFileSync(dest, evnText);
console.log(`env file copied from ${src} to ${dest}`);