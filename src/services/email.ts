import {query,uuid,audit,AppError,transaction} from '../db.js';
import {generatePDF} from './pdf.js';
import {currency} from './money.js';
export async function emailDocument(d:any,recipient:string,user:string){
 const settings=(await query('SELECT value FROM settings WHERE id=1')).rows[0].value;
 const template=settings.email_templates[d.kind];const values:Record<string,string>={number:d.number,customer:d.party_snapshot.name,project:d.reference,total:currency(d.total_cents,d.currency)};
 const expand=(text:string)=>text.replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]??'');
 const subject=expand(template?.subject??d.number),body=expand(template?.body??'Please find the attached document.');const id=uuid();
 await query('INSERT INTO email_logs(id,document_id,revision,recipient,subject,status,attempted_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,d.id,d.revision,recipient,subject,'Pending',user]);
 try{
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw new Error('Email delivery is not configured. Add a verified sender and email provider key.');
 const bytes=await generatePDF(d);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[recipient],subject,text:body,attachments:[{filename:d.number+'.pdf',content:bytes.toString('base64')}] }),signal:AbortSignal.timeout(20000)});
 const result:any=await response.json();if(!response.ok)throw new Error(result.message??'Email provider rejected delivery');
 await transaction(async db=>{await db.query("UPDATE email_logs SET status='Sent',provider_id=$2,sent_at=now() WHERE id=$1",[id,result.id]);if(d.status==='Draft')await db.query("UPDATE documents SET status='Sent',updated_at=now() WHERE id=$1 AND status='Draft'",[d.id]);await audit(db,user,'email_sent','documents',d.id,{recipient,email_log_id:id});});return{id,status:'Sent'};
 }catch(error:any){const reason=error.message??'Email delivery failed';await query("UPDATE email_logs SET status='Failed',failure_reason=$2 WHERE id=$1",[id,reason]);await audit({query},user,'email_failed','documents',d.id,{recipient,email_log_id:id,reason});throw new AppError(503,reason);}
}
