import {transaction,uuid,query} from '../db.js';
import {createDocument,nextNumber} from './documents.js';
import {generatePDF} from './pdf.js';
export async function verifyDatabase(){
 const marker=new Error('VERIFICATION_ROLLBACK');let verified=false;
 try{await transaction(async db=>{const user=uuid(),customer=uuid(),supplier=uuid(),product=uuid();
 await db.query('INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',[user,'Verification','verification-'+user+'@example.invalid','NO_LOGIN','Owner']);
 await db.query('INSERT INTO customers(id,company) VALUES($1,$2)',[customer,'Verification']);await db.query('INSERT INTO suppliers(id,name) VALUES($1,$2)',[supplier,'Verification']);await db.query('INSERT INTO products(id,sku,name,description,cost_cents,list_price_cents) VALUES($1,$2,$3,$4,$5,$6)',[product,'VERIFY-'+product,'Verification','Verification line',6500,10000]);
 for(const kind of ['estimate','invoice','purchase_order','sales_order']){const d=await createDocument(db,{kind,customer_id:customer,supplier_id:supplier,issue_date:'2026-10-06',lines:[{product_id:product,quantity:2,unit_price_cents:10000,taxes:[{name:'Test Tax',rate_bps:500}]}]},user);if(Number(d.total_cents)!==21000)throw new Error('Database calculation verification failed');const pdf=await generatePDF(d);if(pdf.subarray(0,4).toString()!=='%PDF')throw new Error('PDF verification failed');}
 const n1=await nextNumber(db,'invoice',2026),n2=await nextNumber(db,'invoice',2026);if(n1===n2)throw new Error('Document numbering verification failed');verified=true;throw marker;
 });}catch(error){if(error!==marker)throw error;}
 if(!verified)throw new Error('Verification did not complete');console.log('PostgreSQL transaction, numbering, document totals and four PDF formats verified; verification data rolled back.');
}
