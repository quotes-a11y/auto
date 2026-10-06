import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {ZodError} from 'zod';
import {query,AppError} from './db.js';
import {authRouter,authentication,requireUser} from './auth.js';
import {catalog} from './routes/catalog.js';
import {documents} from './routes/documents.js';
import {operations} from './routes/operations.js';
export function createApp(assets?:Record<string,string>){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],fontSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));app.use(express.json({limit:'1mb'}));
 app.use('/api',rateLimit({windowMs:60000,limit:240,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)){const origin=req.headers.origin;if(origin){let expected=process.env.APP_URL??process.env.RENDER_EXTERNAL_URL;if(!expected)expected=req.protocol+'://'+req.get('host');if(origin!==expected)return next(new AppError(403,'Request origin is not allowed'));}if(!req.is('application/json'))return next(new AppError(415,'Use application/json'));}next();});
 app.get('/health',async(req,res)=>{try{await query('SELECT 1');res.json({status:'ok',database:'connected',schema:1});}catch{res.status(503).json({status:'unavailable'});}});
 app.use('/api',authentication);app.use('/api/auth',authRouter);app.use('/api',requireUser,catalog,documents,operations);
 app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found'}));
 if(assets){app.get('/app.js',(req,res)=>res.type('application/javascript').send(assets.js));app.get('/style.css',(req,res)=>res.type('text/css').send(assets.css));app.get('/',(req,res)=>res.type('html').send(assets.html));}else app.use(express.static(new URL('../public',import.meta.url).pathname));
 app.use((error:any,req:express.Request,res:express.Response,next:express.NextFunction)=>{if(error instanceof ZodError)return res.status(400).json({error:error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')});if(error instanceof AppError)return res.status(error.status).json({error:error.message});if(error.code==='23505')return res.status(409).json({error:'This number, SKU, email or record already exists'});if(['23503','22P02','22007','23514'].includes(error.code))return res.status(400).json({error:'Invalid record, date or value'});console.error(JSON.stringify({level:'error',path:req.path,message:error.message}));res.status(500).json({error:'The action could not be completed. Please try again.'});});
 return app;
}
