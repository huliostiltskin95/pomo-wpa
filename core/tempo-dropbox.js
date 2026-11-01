// Dropbox sync for Tempo: PKCE, app-folder storage and optimistic revision checks.
const AUTH_KEY="tempo-dropbox-auth-v1";
const META_KEY="tempo-dropbox-sync-v1";
const FILE="/tempo-backup.json";
const API="https://api.dropboxapi.com";
const CONTENT="https://content.dropboxapi.com";
const read=(k,fallback={})=>{try{return JSON.parse(localStorage.getItem(k))||fallback;}catch{return fallback;}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const redirectUri=()=>location.origin+location.pathname;
const bytesToBase64=url=>btoa(String.fromCharCode(...new Uint8Array(url))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const randomCode=()=>bytesToBase64(crypto.getRandomValues(new Uint8Array(48)));
async function shaChallenge(code){return bytesToBase64(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(code)));}
async function fail(response){if(response.ok)return response;let body="";try{body=await response.text();}catch{}const error=new Error("Dropbox HTTP "+response.status+" "+body.slice(0,250));error.status=response.status;throw error;}
export function createDropboxSync({getState,applyRemote,onStatus}){
  let auth=read(AUTH_KEY),meta=read(META_KEY,{rev:null,dirty:false,ready:false});
  let inFlight=null,delay=null;
  const status=(message)=>onStatus(message,{connected:Boolean(auth.refreshToken),dirty:meta.dirty,ready:meta.ready});
  const storeMeta=()=>write(META_KEY,meta);
  const storeAuth=()=>write(AUTH_KEY,auth);
  const snapshot=()=>({app:"Tempo Pomodoro",version:4,exportedAt:new Date().toISOString(),...getState()});
  function changed(){meta.dirty=true;storeMeta();status("Modifiche locali da caricare");clearTimeout(delay);if(meta.ready&&auth.refreshToken)delay=setTimeout(()=>{sync().catch(e=>status(e.message));},2500);}
  async function connect(appKey){
    appKey=(appKey||auth.appKey||"").trim();
    if(!/^[a-z0-9]{8,}$/i.test(appKey))throw new Error("Inserisci una App key Dropbox valida.");
    if(!crypto?.subtle)throw new Error("Questo browser non supporta OAuth PKCE.");
    const verifier=randomCode(),nonce=randomCode();
    sessionStorage.setItem("tempo-dropbox-pkce",JSON.stringify({verifier,nonce,appKey}));
    const u=new URL("https://www.dropbox.com/oauth2/authorize");
    const params={client_id:appKey,response_type:"code",token_access_type:"offline",redirect_uri:redirectUri(),code_challenge_method:"S256",code_challenge:await shaChallenge(verifier),state:nonce};
    Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
    location.assign(u.toString());
  }
  async function callback(){
    const url=new URL(location.href),code=url.searchParams.get("code"),error=url.searchParams.get("error");
    if(!code&&!error)return false;
    const stored=JSON.parse(sessionStorage.getItem("tempo-dropbox-pkce")||"null");
    if(!stored)throw new Error("Autorizzazione Dropbox scaduta. Riprova.");
    if(url.searchParams.get("state")!==stored.nonce)throw new Error("Controllo di sicurezza Dropbox non riuscito.");
    history.replaceState({},document.title,redirectUri()+location.hash);
    sessionStorage.removeItem("tempo-dropbox-pkce");
    if(error)throw new Error("Autorizzazione Dropbox annullata.");
    const form=new URLSearchParams({code,grant_type:"authorization_code",client_id:stored.appKey,code_verifier:stored.verifier,redirect_uri:redirectUri()});
    const res=await fail(await fetch(API+"/oauth2/token",{method:"POST",body:form}));
    const data=await res.json();
    if(!data.refresh_token)throw new Error("Dropbox non ha restituito un refresh token.");
    auth={appKey:stored.appKey,refreshToken:data.refresh_token,accessToken:data.access_token,expiresAt:Date.now()+data.expires_in*1000-60000};
    storeAuth();meta={rev:null,dirty:meta.dirty,ready:false};storeMeta();status("Dropbox collegato. Scegli la prima sincronizzazione.");
    return true;
  }
  async function token(){
    if(!auth.refreshToken)throw new Error("Collega prima Dropbox.");
    if(auth.accessToken&&Date.now()<auth.expiresAt)return auth.accessToken;
    const res=await fail(await fetch(API+"/oauth2/token",{method:"POST",body:new URLSearchParams({grant_type:"refresh_token",refresh_token:auth.refreshToken,client_id:auth.appKey})}));
    const data=await res.json();auth.accessToken=data.access_token;auth.expiresAt=Date.now()+data.expires_in*1000-60000;storeAuth();return auth.accessToken;
  }
  async function metadata(){
    const response=await fetch(API+"/2/files/get_metadata",{method:"POST",headers:{"Authorization":"Bearer "+await token(),"Content-Type":"application/json"},body:JSON.stringify({path:FILE})});
    if(response.status===409){const err=await response.json().catch(()=>({}));if(JSON.stringify(err).includes("not_found"))return null;}
    await fail(response);return response.json();
  }
  async function download(){
    const response=await fail(await fetch(CONTENT+"/2/files/download",{method:"POST",headers:{"Authorization":"Bearer "+await token(),"Dropbox-API-Arg":JSON.stringify({path:FILE})}}));
    const file=await response.json();
    if(!file||!Array.isArray(file.sessions)||!Array.isArray(file.tasks)||!Array.isArray(file.history))throw new Error("Il backup Dropbox non è valido.");
    const info=JSON.parse(response.headers.get("Dropbox-API-Result")||"{}");
    if(!info.rev)throw new Error("Revisione Dropbox assente.");
    return {file,rev:info.rev};
  }
  async function upload(expectedRev){
    const mode=expectedRev?{".tag":"update",update:expectedRev}:"add";
    const response=await fetch(CONTENT+"/2/files/upload",{method:"POST",headers:{"Authorization":"Bearer "+await token(),"Dropbox-API-Arg":JSON.stringify({path:FILE,mode,autorename:false,strict_conflict:true,mute:true}),"Content-Type":"application/octet-stream"},body:JSON.stringify(snapshot())});
    if(response.status===409)throw new Error("Conflitto: backup remoto modificato. Nessun dato è stato sovrascritto.");
    await fail(response);const info=await response.json();return info.rev;
  }
  async function firstSync(direction){
    if(!auth.refreshToken)throw new Error("Collega prima Dropbox.");
    if(meta.ready)throw new Error("Sincronizzazione già inizializzata.");
    const remote=await metadata();
    if(direction==="download"){
      if(!remote)throw new Error("Nessun backup presente su Dropbox.");
      const item=await download();await applyRemote(item.file);
      meta.rev=item.rev;meta.dirty=false;meta.ready=true;storeMeta();status("Archivio scaricato da Dropbox");return;
    }
    if(direction==="upload"){
      if(remote)throw new Error("Dropbox contiene già un backup. Scaricalo prima o risolvi il conflitto.");
      meta.rev=await upload(null);meta.dirty=false;meta.ready=true;storeMeta();status("Archivio iniziale caricato su Dropbox");return;
    }
    throw new Error("Operazione iniziale non riconosciuta.");
  }
  async function sync(){
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      if(!auth.refreshToken||!meta.ready)return;
      if(!navigator.onLine){status("Offline: modifiche conservate in locale");return;}
      const remote=await metadata();
      if(!remote){
        if(meta.rev)throw new Error("Backup remoto rimosso: caricamento bloccato.");
        if(!meta.dirty)return;
        const before=JSON.stringify(getState());const rev=await upload(null);
        meta.rev=rev;meta.dirty=JSON.stringify(getState())!==before;storeMeta();status("Backup Dropbox aggiornato");return;
      }
      if(meta.dirty){
        if(remote.rev!==meta.rev)throw new Error("Conflitto Dropbox: archivio remoto cambiato. Dati locali protetti.");
        const before=JSON.stringify(getState());const rev=await upload(meta.rev);
        meta.rev=rev;meta.dirty=JSON.stringify(getState())!==before;storeMeta();status(meta.dirty?"Altre modifiche da caricare":"Backup Dropbox aggiornato");
      } else if(remote.rev!==meta.rev){
        const item=await download();await applyRemote(item.file);
        meta.rev=item.rev;meta.dirty=false;storeMeta();status("Dati aggiornati da Dropbox");
      }else status("Dropbox sincronizzato");
    })().catch(e=>{status(e.message);throw e;}).finally(()=>{inFlight=null;});
    return inFlight;
  }
  async function forceDownload(allowDirty=false){
    if(!auth.refreshToken||!meta.ready)throw new Error("Inizializza prima la sincronizzazione.");
    if(meta.dirty&&!allowDirty)throw new Error("Modifiche locali non caricate: download bloccato per sicurezza.");
    const item=await download();await applyRemote(item.file);meta.rev=item.rev;meta.dirty=false;storeMeta();status("Backup scaricato");
  }
  function disconnect(){clearTimeout(delay);auth={};meta={rev:null,dirty:false,ready:false};localStorage.removeItem(AUTH_KEY);localStorage.removeItem(META_KEY);status("Dropbox scollegato. Dati locali conservati.");}
  function info(){return {connected:Boolean(auth.refreshToken),ready:meta.ready,dirty:meta.dirty};}
  async function init(){await callback();status(auth.refreshToken?(meta.ready?"Dropbox connesso":"Dropbox collegato: inizializzazione necessaria"):"Dropbox non collegato");if(meta.ready)await sync().catch(()=>{});}
  return {init,connect,firstSync,sync,changed,forceDownload,disconnect,info};
}
