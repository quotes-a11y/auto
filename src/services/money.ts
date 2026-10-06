import {z} from 'zod';
export const cents=z.number().int().min(0).max(100000000000);
export const taxSchema=z.array(z.object({name:z.string().min(1).max(30),rate_bps:z.number().int().min(0).max(10000)})).max(10);
export function calculateLine(quantity:number,price:number,cost:number,discount:number,taxes:{name:string;rate_bps:number}[]){
 const q=BigInt(Math.round(quantity*1000));
 const round=(n:bigint,d:bigint)=>Number((n+d/2n)/d);
 const total=round(q*BigInt(price)*BigInt(10000-discount),10000000n);
 const tax=taxes.reduce((sum,t)=>sum+round(BigInt(total)*BigInt(t.rate_bps),10000n),0);
 return{line_total_cents:total,tax_cents:tax,cost_cents:round(q*BigInt(cost),1000n)};
}
export function currency(cents:any,code='CAD'){return new Intl.NumberFormat('en-CA',{style:'currency',currency:code}).format(Number(cents)/100);}
