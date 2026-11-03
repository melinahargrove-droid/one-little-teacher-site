'use strict';
// LOCAL RELEASE CANDIDATE: insert verified public project key and enable only after delivery gates pass.
const config = Object.freeze({url:'https://ctmqvbsjliinlddfolti.supabase.co',publishableKey:'sb_publishable_AYbs6V2u0qPo-jLTkTFlBQ_1ps7DaZC',enabled:false});
const $ = id => document.getElementById(id);
let token = '';
let sessionRevision = 0, listRevision = 0;
const fragment = new URLSearchParams(location.hash.slice(1));
const returnedToken = fragment.get('access_token');
if (location.hash || location.search) history.replaceState(null,'',location.pathname);
if (config.enabled && returnedToken) token = returnedToken;
const message = text => { $('status').textContent = text; };
async function api(path,body,accessToken) {
  const response = await fetch(config.url+path,{method:'POST',headers:{apikey:config.publishableKey,
    ...(accessToken?{Authorization:`Bearer ${accessToken}`} : {}),'Content-Type':'application/json'},body:JSON.stringify(body)});
  if (!response.ok) { const error=new Error('request_failed');error.status=response.status;throw error; }
  return response.json();
}
async function refresh() {
  if (!config.enabled || !token) return;
  const requestToken = token, session = sessionRevision, request = ++listRevision;
  const current = () => token === requestToken && sessionRevision === session && listRevision === request;
  try {
    const data = await api('/functions/v1/olt-games-access',{action:'list'},requestToken);
    if (!current()) return;
    $('signin').hidden=true;$('collection').hidden=false;$('retry-access').hidden=true;$('games').replaceChildren();
    for (const game of data.games) {
      const card=document.createElement('article'),heading=document.createElement('h3'),actions=document.createElement('div');
      heading.textContent=game.title;actions.className='actions';card.append(heading,actions);
      for (const format of ['zip','html']) {
        const button=document.createElement('button');button.textContent=`Download ${format.toUpperCase()}`;
        button.onclick=async()=>{
          button.disabled=true;
          const downloadToken=token, downloadSession=sessionRevision;
          try {
            const download=await api('/functions/v1/olt-games-access',{action:'download',game:game.slug,format},downloadToken);
            if (!downloadToken || token!==downloadToken || sessionRevision!==downloadSession) return;
            const url=new URL(download.url);
            if(url.origin!==config.url || !url.pathname.startsWith('/storage/v1/object/sign/olt-paid-games/')) throw Error('download');
            const link=document.createElement('a');link.href=url.href;link.rel='noreferrer';link.download='';link.click();
            message('Your download is ready. Save it to your device for offline play.');
          }catch{if(token===downloadToken && sessionRevision===downloadSession) message('We couldn’t prepare that download. Please try again, or sign in again.');}
          finally{button.disabled=false;}
        };
        actions.append(button);
      }
      $('games').append(card);
    }
    message(data.games.length ? 'Your purchased games are ready.' : 'No games are ready for this email yet. If you just paid, wait a moment and refresh. Delayed payments must finish before downloads appear.');
  }catch(error){
    if (!current()) return;
    if(error.status===401){message('Your sign-in has expired. Please request a new link.');token='';$('signin').hidden=false;$('collection').hidden=true;$('retry-access').hidden=true;}
    else{message('We could not load your games yet. Your sign-in is kept on this page; try again.');$('retry-access').hidden=false;}
  }
}
$('email-form').onsubmit=async event=>{
  event.preventDefault();if(!config.enabled){message('Purchase access is not enabled in this preview.');return;}
  const button=event.submitter;button.disabled=true;
  try {
    await api(`/auth/v1/otp?redirect_to=${encodeURIComponent(location.origin+location.pathname)}`,{email:$('email').value.trim(),create_user:true});
    message('Check your inbox for a sign-in link. Open it on this device to download your games.');
  }catch{message('We couldn’t send a sign-in link. Please wait a moment and try again.');}
  finally{button.disabled=false;}
};
$('refresh').onclick=refresh;
$('retry-access').onclick=refresh;
$('signout').onclick=async()=>{
  const oldToken=token;token='';sessionRevision++;listRevision++;$('games').replaceChildren();$('collection').hidden=true;$('signin').hidden=false;$('retry-access').hidden=true;message('You are signed out on this page.');
  if(oldToken) await fetch(config.url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:config.publishableKey,Authorization:`Bearer ${oldToken}`}}).catch(()=>{});
};
refresh();
