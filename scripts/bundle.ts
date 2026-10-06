import {build} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const schema=readFileSync('db/001_initial.sql','utf8');
const assets={html:readFileSync('public/index.html','utf8'),css:readFileSync('public/style.css','utf8'),js:readFileSync('public/app.js','utf8')};
const packed=gzipSync(Buffer.from(JSON.stringify({schema,assets}))).toString('base64');
const entry=`import { createApp } from './src/app.js'; import {migrate} from './src/db.js'; import {verifyDatabase} from './src/services/verify.js'; import {gunzipSync} from 'node:zlib'; const content=JSON.parse(gunzipSync(Buffer.from(${JSON.stringify(packed)},'base64')).toString()); await migrate(content.schema); await verifyDatabase(); createApp(content.assets).listen(Number(process.env.PORT ?? 3000),'0.0.0.0');`;
const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'railway-entry.ts',loader:'ts'},bundle:true,packages:'external',platform:'node',format:'esm',target:'es2022',minify:true,write:false});
let code=bundle.outputFiles[0].text;
const deps=JSON.parse(readFileSync('package.json','utf8')).dependencies;
for(const name of Object.keys(deps)){const pkg=JSON.parse(readFileSync('node_modules/'+name+'/package.json','utf8'));code=code.replaceAll('from"'+name+'"','from"'+name+'@'+pkg.version+'"').replaceAll('from "'+name+'"','from "'+name+'@'+pkg.version+'"');}
mkdirSync('dist',{recursive:true});writeFileSync('dist/railway-function.ts',code);console.log('Bundled modular application for Railway ('+code.length+' characters)');
