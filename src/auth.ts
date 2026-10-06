import {Router,type Request,type Response,type NextFunction} from 'express';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import {query,transaction,audit,uuid,assert,AppError} from './db.js';
export type Role='Owner'|'Administrator'|'Sales'|'Accounting'|'Purchasing'|'Read Only';
declare global{namespace Express{interface Request{user?:{id:string;name:string;email:string;role:Role};csrf?:string}}}
export const permissions:Record<Role,string[]>={Owner:['*'],Administrator:['*'],Sales:['dashboard','customers','products','estimates','sales_orders','projects'],Accounting:['dashboard','customers','invoices','payments','reports'],Purchasing:['dashboard','products','suppliers','purchase_orders','inventory'], 'Read Only':['dashboard','customers','products','estimates','invoices','sales_orders','purchase_orders','suppliers','projects','reports']};
export function permitted(role:Role,resource:string,write=false){return (permissions[role].includes('*')||permissions[role].includes(resource))&&!(write&&role==='Read Only');}
export const privateCosts=(role:Role)=>['Owner','Administrator','Accounting','Purchasing'].includes(role);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const sessionCookie='elevated_session';
const secure=()=>process.env.NODE_ENV==='production';
export async function authentication(req:Request,res:Response,next:NextFunction){
 const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1);
 if(cookie){const result=await query('SELECT u.id,u.name,u.email,u.role,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',[hash(cookie)]);if(result.rows[0]){req.user=result.rows[0];req.csrf=result.rows[0].csrf;}}
 next();
}
export function requireUser(req:Request,res:Response,next:NextFunction){if(!req.user)return next(new AppError(401,'Please sign in'));if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers['x-csrf-token']!==req.csrf)return next(new AppError(403,'Security token expired. Reload and try again.'));next();}
export function allow(resource:string,write=false){return(req:Request,res:Response,next:NextFunction)=>{if(!req.user||!permitted(req.user.role,resource,write))return next(new AppError(403,'Your role cannot perform this action'));next();};}
async function loginSession(user:any,res:Response){const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');await query('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval \'12 hours\')',[hash(token),user.id,csrf]);res.cookie(sessionCookie,token,{httpOnly:true,secure:secure(),sameSite:'strict',maxAge:43200000,path:'/'});return {user:{id:user.id,name:user.name,email:user.email,role:user.role},csrf};}
export const authRouter=Router();
const limiter=rateLimit({windowMs:900000,limit:15,standardHeaders:'draft-8',legacyHeaders:false});
authRouter.get('/status',async(req,res)=>res.json({configured:Number((await query('SELECT count(*) AS count FROM users')).rows[0].count)>0}));
authRouter.post('/setup',limiter,async(req,res)=>{
 const data=z.object({name:z.string().min(2).max(100),email:z.string().email().max(254),password:z.string().min(12).max(72),token:z.string().min(32)}).parse(req.body);
 const expected=process.env.SETUP_TOKEN??'';
 assert(expected.length>=32&&Buffer.byteLength(data.token)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(data.token),Buffer.from(expected)),'Invalid setup link',403);
 const user=await transaction(async db=>{await db.query('LOCK TABLE users IN EXCLUSIVE MODE');assert(Number((await db.query('SELECT count(*) AS count FROM users')).rows[0].count)===0,'Owner account is already configured',409);const user={id:uuid(),name:data.name,email:data.email.toLowerCase(),role:'Owner'};await db.query('INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',[user.id,user.name,user.email,await bcrypt.hash(data.password,12),user.role]);await audit(db,user.id,'owner_setup','users',user.id);return user;});res.status(201).json(await loginSession(user,res));
});
authRouter.post('/login',limiter,async(req,res)=>{const data=z.object({email:z.string().email(),password:z.string().max(72)}).parse(req.body);const user=(await query('SELECT * FROM users WHERE email=$1 AND active=true',[data.email.toLowerCase()])).rows[0];const valid=await bcrypt.compare(data.password,user?.password_hash??'$2b$12$0wiBdIgEFyNdBljEGUE8Z.pLPHrJgUrOVU5rKdlVuTFjBKHP8lW1K');assert(user&&valid,'Email or password is incorrect',401);await audit({query},user.id,'login','users',user.id);res.json(await loginSession(user,res));});
authRouter.get('/me',requireUser,(req,res)=>res.json({user:req.user,csrf:req.csrf,permissions:permissions[req.user!.role],private_costs:privateCosts(req.user!.role)}));
authRouter.post('/logout',requireUser,async(req,res)=>{await query('DELETE FROM sessions WHERE user_id=$1 AND csrf=$2',[req.user!.id,req.csrf]);res.clearCookie(sessionCookie,{httpOnly:true,secure:secure(),sameSite:'strict',path:'/'});res.json({ok:true});});
