import {PROD,verifySessionAfterAuth,validateFiles,createQueue,applyOwnerMetadata} from './game-upload-core.mjs?v=legacy-games-first-cd3f47598eba';
const $=id=>document.getElementById(id);
let accessToken='',config=null,ownerVerified=false,selected=[],queue=null,busy=false;
// Callback credential is consumed once into lexical memory, then removed from the visible URL.
const fragment=new URLSearchParams(location.hash.slice(1));accessToken=fragment.get('access_token')||'';
for(const name of [...fragment.keys()])fragment.delete(name);
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
const status=text=>{$('status').textContent=text;};
function buttons(){const enabled=config?.enabled===true&&!busy;$('login').disabled=!enabled;$('check').disabled=!enabled||!accessToken;$('files').disabled=!enabled||!ownerVerified;$('window').disabled=!enabled||!accessToken;const uploadReady=config?.uploadReady===true&&Date.now()<config.expiresAt;$('pilot').disabled=!enabled||!uploadReady||!ownerVerified||selected.length!==6||!!queue?.count();$('remaining').disabled=!enabled||!uploadReady||!ownerVerified||!queue||queue.count()<1||queue.count()===6;}
async function jsonBounded(response,max=16384){const reader=response.body.getReader();let text='',bytes=0;const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max)throw Error('response');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
async function sessionCheck(){
 ownerVerified=false;if(!accessToken)throw Error('Sign in with the production owner account.');
 const r=await fetch(PROD+'/auth/v1/user',{headers:{apikey:config.publishableKey,Authorization:'Bearer '+accessToken},credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Owner session is not valid. Sign in again.');const user=await jsonBounded(r);verifySessionAfterAuth(accessToken,user);
}
async function ownerCheck(){
 ownerVerified=false;config.uploadReady=false;await sessionCheck();
 const r=await fetch(PROD+'/functions/v1/olt-games-private-upload',{headers:{apikey:config.publishableKey,Authorization:'Bearer '+accessToken},credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Signed in, but the temporary owner upload window is not available.');
 applyOwnerMetadata(config,await jsonBounded(r));ownerVerified=true;
}
async function guarded(action){if(busy)return;busy=true;buttons();try{await action();}catch(e){ownerVerified=false;status(e.message||'Operation stopped.');}finally{busy=false;buttons();}}
$('login').addEventListener('click',()=>guarded(async()=>{
 const email=$('email').value.trim();if(!$('email').checkValidity()||!email)throw Error('Enter your sign-in email.');
 const redirectTo=config.callbackURL;
 const r=await fetch(PROD+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:false}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Sign-in email could not be requested.');await r.body?.cancel();status('One production sign-in email requested. Open its newest link; then check owner access.');
}));
$('check').addEventListener('click',()=>guarded(async()=>{await sessionCheck();status('Production sign-in verified. Check the temporary upload window for owner authorization.');}));
$('forget').addEventListener('click',()=>{if(busy)return;accessToken='';ownerVerified=false;status('Session forgotten on this page.');buttons();});
$('window').addEventListener('click',()=>guarded(async()=>{await ownerCheck();status(config.uploadReady?'Owner authorized; upload window is open.':'Owner authorized; select approved files while uploads remain disabled.');}));
$('files').addEventListener('change',()=>guarded(async()=>{
 selected=[];queue=null;$('receipts').textContent='';selected=await validateFiles([...$('files').files],config.entries);
 queue=createQueue({files:selected,config,ownerCheck,post:async file=>{
  const r=await fetch(PROD+'/functions/v1/olt-games-private-upload',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+accessToken,'Content-Type':'application/octet-stream'},body:file,credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(115000)});
  const receipt=await jsonBounded(r);return {status:r.status,receipt};
 },onReceipt:r=>{const line=document.createElement('li');line.textContent=`${r.slug} ${r.format}: ${r.result} (${r.bytes} bytes)`;$('receipts').append(line);}});
 status('All six file hashes match. Run the largest-file pilot first.');
}));
$('pilot').addEventListener('click',()=>guarded(async()=>{await queue.run({pilot:true});status('Largest-file pilot verified. Review before starting the remaining five.');}));
$('remaining').addEventListener('click',()=>guarded(async()=>{const n=await queue.run();status(`${n}/6 private artifacts verified. Retire the temporary endpoint now.`);}));
window.addEventListener('pagehide',()=>{accessToken='';ownerVerified=false;});
try{
 const r=await fetch('./game-upload-config.json',{credentials:'omit',cache:'no-store',redirect:'error'});config=await jsonBounded(r,4096);config.uploadReady=false;
 if(config.enabled!==true||config.project!==PROD||location.origin!==config.allowedOrigin||!config.publishableKey||config.callbackURL!=='https://onelittleteacher.com/game-upload.html'||location.pathname!=='/game-upload.html')throw Error('This admin template is disabled until the parent approves production Auth and the exact page origin.');
 status(accessToken?'Callback received; check production owner access.':'Sign in to the production owner account to begin.');
}catch(e){config=null;accessToken='';status(e.message||'Configuration unavailable.');}finally{buttons();}

