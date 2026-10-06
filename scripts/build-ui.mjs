import {readFileSync,writeFileSync} from 'node:fs';
const names=['core','catalog','documents','administration','boot'];
writeFileSync('public/app.js',names.map(name=>readFileSync('src/ui/'+name+'.js','utf8')).join('\n'));
console.log('Built application UI from five source modules.');
