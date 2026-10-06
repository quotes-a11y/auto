import pg from 'pg';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
export type DB = {query:(sql:string,params?:any[])=>Promise<any>};
export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:10000});
export let database:DB=pool;
export function setDatabase(db:DB){database=db;}
export const query=(sql:string,params:any[]=[])=>database.query(sql,params);
export async function transaction<T>(fn:(db:DB)=>Promise<T>):Promise<T>{
 const client:any=database===pool?await pool.connect():database;
 try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{if(database===pool)client.release();}
}
export async function migrate(schema?:string){
 await transaction(async db=>{await db.query('SELECT pg_advisory_xact_lock(7349201)');
 const exists=(await db.query("SELECT to_regclass('public.schema_migrations') AS table_name")).rows[0].table_name;
 if(!exists)await db.query(schema??readFileSync(new URL('../db/001_initial.sql',import.meta.url),'utf8'));
 const version=(await db.query('SELECT max(version) AS version FROM schema_migrations')).rows[0].version;
 if(Number(version)!==1)throw new Error('Unsupported database schema version');
 for(const name of ['users','sessions','customers','suppliers','products','documents','document_lines','payments','audit_logs']){
 if(!(await db.query('SELECT to_regclass($1) AS table_name',[name])).rows[0].table_name)throw new Error('Required table missing: '+name);
 }
 const bad=(await db.query("SELECT count(*) AS count FROM documents WHERE number IS NULL OR total_cents <> subtotal_cents + tax_cents")).rows[0].count;
 if(Number(bad))throw new Error('Database integrity check failed');
 });
}
export async function audit(db:DB,user:string|null,action:string,type:string,id:string|null,changes:any={}){
 await db.query('INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes) VALUES($1,$2,$3,$4,$5)',[user,action,type,id,JSON.stringify(changes)]);
}
export const uuid=randomUUID;
export class AppError extends Error{constructor(public status:number,message:string){super(message);}}
export function assert(condition:any,message:string,status=400):asserts condition{if(!condition)throw new AppError(status,message);}
