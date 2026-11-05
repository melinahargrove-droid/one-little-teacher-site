// Exact approved batch; server remains authoritative.
const approvedManifestID="cd3f47598eba6946b4f21dca682f1059cb4c6c87004a0958b0083a25513f16e8";
const approvedEntries=[{"slug": "vegetable-soup", "format": "html", "sha256": "118aa2a899e9ad4353a623037e1ec8ce7f88545faa94d0de9ff0efcfba532f1e", "bytes": 12768850}, {"slug": "vegetable-soup", "format": "zip", "sha256": "0fa88248f8c01ff5609e6516e2a32dfa7aa5823559596acbf27e011a3c23a2db", "bytes": 9613770}, {"slug": "playdough-color-lab", "format": "html", "sha256": "55144bf2c372c41290b610ca72995b28d86b1c2e7bb00d9889c318dd00fd5e4d", "bytes": 11851481}, {"slug": "playdough-color-lab", "format": "zip", "sha256": "17221c12732ad0a812df63e62f1101035ba4c7ebe39a689e451f91ce1899fd70", "bytes": 8904358}, {"slug": "nature-arrangement-studio", "format": "html", "sha256": "b5e7e94a3780c58bcc00150582098a1511fd2b369cdcb3d8bb306a79edad038e", "bytes": 4979894}, {"slug": "nature-arrangement-studio", "format": "zip", "sha256": "44ff20ca710791024f558d5208738e7dbf0dcff40c2417fa342f777053362f4d", "bytes": 3724787}];
export const PROD='https://ctmqvbsjliinlddfolti.supabase.co';
export async function digest(b){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');}
export function verifySessionAfterAuth(token,user,now=Date.now()){
 const p=token.split('.');if(p.length!==3)throw Error('owner');const b=p[1].replace(/-/g,'+').replace(/_/g,'/');const c=JSON.parse(atob(b.padEnd(Math.ceil(b.length/4)*4,'=')));
 if(c.iss!==PROD+'/auth/v1'||c.sub!==user.id||c.aud!=='authenticated'||c.role!=='authenticated'||!Number.isFinite(c.exp)||c.exp<=now/1000||!user.email_confirmed_at||user.is_anonymous)throw Error('owner');
}
export async function validateFiles(files,entries){
 if(files.length!==6||entries.length!==6)throw Error('Select exactly the three customer ZIPs and three extracted game HTML files.');
 const selected=new Map();
 for(const file of files){if(file.size>12768850||file.size<1)throw Error('A selected file has an unexpected size.');const h=await digest(await file.arrayBuffer());const e=entries.find(e=>e.sha256===h&&e.bytes===file.size);if(!e||selected.has(h))throw Error('A selected file is not an exact approved artifact, or is duplicated.');selected.set(h,{file,entry:e});}
 if(selected.size!==6)throw Error('The approved file set is incomplete.');return [...selected.values()].sort((a,b)=>b.entry.bytes-a.entry.bytes);
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
 if(target.manifestID!==approvedManifestID||!Array.isArray(target.entries)||target.entries.length!==approvedEntries.length||target.entries.some((e,i)=>Object.keys(approvedEntries[i]).some(k=>e[k]!==approvedEntries[i][k])))throw Error('This page is for a different approved batch.');
 if(!Array.isArray(target.entries)||target.entries.length!==6||!/^[a-f0-9]{64}$/.test(target.manifestID||''))throw Error('Owner metadata is invalid.');
 const seen=new Set();for(const e of target.entries){if(!/^[a-f0-9]{64}$/.test(e.sha256||'')||!Number.isSafeInteger(e.bytes)||e.bytes<1||e.bytes>12768850||!['html','zip'].includes(e.format)||typeof e.slug!=='string'||seen.has(e.sha256))throw Error('Owner metadata is invalid.');seen.add(e.sha256);}
 if(config.manifestID&&config.manifestID!==target.manifestID)throw Error('Approved inventory changed. Reload and sign in again.');
 if(target.project!==PROD||target.allowedOrigin!==config.allowedOrigin||!Number.isFinite(target.expiresAt)||target.expiresAt<=now)throw Error('Owner metadata expired or invalid.');
 config.manifestID=target.manifestID;if(target.ready===true)applyUploadTarget(config,target,now);else if(target.ready!==false)throw Error('Invalid upload gate.');config.entries=target.entries;
}

