export const PROD='https://ctmqvbsjliinlddfolti.supabase.co';
export async function digest(b){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');}
export function verifySessionAfterAuth(token,user,now=Date.now()){
 const p=token.split('.');if(p.length!==3)throw Error('owner');const b=p[1].replace(/-/g,'+').replace(/_/g,'/');const c=JSON.parse(atob(b.padEnd(Math.ceil(b.length/4)*4,'=')));
 if(c.iss!==PROD+'/auth/v1'||c.sub!==user.id||c.aud!=='authenticated'||c.role!=='authenticated'||!Number.isFinite(c.exp)||c.exp<=now/1000||!user.email_confirmed_at||user.is_anonymous)throw Error('owner');
}
export async function validateFiles(files,entries){
 if(files.length!==12||entries.length!==12)throw Error('Select exactly the six customer ZIPs and six extracted game HTML files.');
 const selected=new Map();
 for(const file of files){if(file.size>12941428||file.size<1)throw Error('A selected file has an unexpected size.');const h=await digest(await file.arrayBuffer());const e=entries.find(e=>e.sha256===h&&e.bytes===file.size);if(!e||selected.has(h))throw Error('A selected file is not an exact approved artifact, or is duplicated.');selected.set(h,{file,entry:e});}
 if(selected.size!==12)throw Error('The approved file set is incomplete.');return [...selected.values()].sort((a,b)=>b.entry.bytes-a.entry.bytes);
}
export function checkUploadReceipt(status,r,c,e){if(status!==200||!['verified_uploaded','verified_existing'].includes(r.result)||r.manifestID!==c.manifestID||r.deploymentID!==c.deploymentID||r.sha256!==e.sha256||r.bytes!==e.bytes)throw Error('Upload was not verified. Stop and reconcile the private object before retrying.');}
export function createQueue({files,config,ownerCheck,post,onReceipt=()=>{},now=Date.now}){
 const done=new Set();let busy=false;
 return {async run({pilot=false}={}){
  if(busy)throw Error('An upload is already running.');busy=true;
  try{const remaining=files.filter(x=>!done.has(x.entry.sha256));const targets=pilot?remaining.slice(0,1):remaining;
   for(const item of targets){if(now()>=config.expiresAt)throw Error('Upload window expired.');const expectedDeployment=config.deploymentID;await ownerCheck();if(config.deploymentID!==expectedDeployment)throw Error('Upload revision changed. Stop and reconcile before continuing.');const {status,receipt}=await post(item.file);checkUploadReceipt(status,receipt,config,item.entry);done.add(item.entry.sha256);onReceipt({sha256:item.entry.sha256,bytes:item.entry.bytes,slug:item.entry.slug,format:item.entry.format,result:receipt.result,manifestID:config.manifestID,deploymentID:config.deploymentID});}
   return done.size;
  }finally{busy=false;}
 },count:()=>done.size};
}

export function applyUploadTarget(config,target,now=Date.now()){
 config.uploadReady=false;
 if(target.ready!==true||target.project!==PROD||target.allowedOrigin!==config.allowedOrigin||target.manifestID!==config.manifestID||!/^[a-f0-9]{64}$/.test(target.deploymentID||'')||!Number.isFinite(target.expiresAt)||target.expiresAt<=now||target.expiresAt>now+900000)throw Error('The approved upload window is not ready or has expired.');
 config.deploymentID=target.deploymentID;config.expiresAt=target.expiresAt;config.uploadReady=true;
}

export function applyOwnerMetadata(config,target,now=Date.now()){
 config.uploadReady=false;
 if(!Array.isArray(target.entries)||target.entries.length!==12||!/^[a-f0-9]{64}$/.test(target.manifestID||''))throw Error('Owner metadata is invalid.');
 const seen=new Set();for(const e of target.entries){if(!/^[a-f0-9]{64}$/.test(e.sha256||'')||!Number.isSafeInteger(e.bytes)||e.bytes<1||e.bytes>12941428||!['html','zip'].includes(e.format)||typeof e.slug!=='string'||seen.has(e.sha256))throw Error('Owner metadata is invalid.');seen.add(e.sha256);}
 if(config.manifestID&&config.manifestID!==target.manifestID)throw Error('Approved inventory changed. Reload and sign in again.');
 if(target.project!==PROD||target.allowedOrigin!==config.allowedOrigin||!Number.isFinite(target.expiresAt)||target.expiresAt<=now)throw Error('Owner metadata expired or invalid.');
 config.manifestID=target.manifestID;if(target.ready===true)applyUploadTarget(config,target,now);else if(target.ready!==false)throw Error('Invalid upload gate.');config.entries=target.entries;
}

