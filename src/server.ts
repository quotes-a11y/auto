import 'dotenv/config';
import {createApp} from './app.js';
import {verifyDatabase} from './services/verify.js';
import {migrate,pool} from './db.js';
await migrate();await verifyDatabase();const server=createApp().listen(Number(process.env.PORT??3000),'0.0.0.0',()=>console.log('Elevated Operations listening'));
process.on('SIGTERM',()=>server.close(async()=>{await pool.end();process.exit(0);}));
