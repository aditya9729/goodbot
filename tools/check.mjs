import { readdirSync } from 'node:fs';import { execFileSync } from 'node:child_process';
let count=0;for(const dir of ['public/src','server','tools'])for(const file of readdirSync(dir))if(/\.(mjs|js)$/.test(file)){execFileSync(process.execPath,['--check',dir+'/'+file]);count++;}console.log(`${count} JavaScript modules: syntax OK.`);
