// Dropbox sync for TEMPVS: PKCE, revision-safe writes, three-way merge and recovery.
import { mergeSnapshots } from "./tempo-merge.js";
const AUTH_KEY="tempo-dropbox-auth-v1";
const META_KEY="tempo-dropbox-sync-v1";
const BASE_KEY="tempo-dropbox-common-base-v1";
const RECOVERY_KEY="tempo-dropbox-recovery-v1";
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
export function createDropboxSync({getState,applyRemote,normalizeRemote,onStatus,resolveConflicts}){
  let auth=read(AUTH_KEY),meta=read(META_KEY,{rev:null,dirty:false,ready:false});
  let inFlight=null,delay=null,overridePending=false;
  const syncState=data=>({
    sessions:data?.sessions||[],tasks:data?.tasks||[],history:data?.history||[],
    defaults:data?.defaults||{},appearance:data?.appearance||{},
    syncDeleted:{
      tasks:data?.syncDeleted?.tasks||[],sessions:data?.syncDeleted?.sessions||[]
    }
  });
  const stateJSON=data=>JSON.stringify(syncState(data));
  // Immutable point-in-time copy: UI mutations must not rewrite an in-flight snapshot.
  const current=()=>JSON.parse(JSON.stringify(syncState(getState())));
  const baseline=()=>read(BASE_KEY,null);
  const saveBase=data=>write(BASE_KEY,syncState(data));
  const recovery=()=>read(RECOVERY_KEY,null);
  const backupBeforeReplacement=next=>{
    const local=current();
    if(stateJSON(local)!==stateJSON(next))write(RECOVERY_KEY,{
      savedAt:new Date().toISOString(),data:{app:"TEMPVS",version:5,...local}
    });
  };
  const status=(message,phase="idle")=>onStatus(message,{connected:Boolean(auth.refreshToken),dirty:meta.dirty,ready:meta.ready,phase,busy:["checking","uploading","downloading","merging"].includes(phase)});
  const storeMeta=()=>write(META_KEY,meta);
  const storeAuth=()=>write(AUTH_KEY,auth);
  const snapshot=(data=current())=>({app:"Tempo Pomodoro",version:5,
    exportedAt:new Date().toISOString(),...syncState(data)});
  function changed(){meta.dirty=true;storeMeta();status("Modifiche locali in attesa di caricamento","pending");clearTimeout(delay);if(meta.ready&&auth.refreshToken)delay=setTimeout(()=>{sync().catch(e=>status(e.message));},2500);}
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
    storeAuth();meta={rev:null,dirty:meta.dirty,ready:false};localStorage.removeItem(BASE_KEY);storeMeta();status("Dropbox collegato. Scegli la prima sincronizzazione.");
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
    return {file:normalizeRemote?normalizeRemote(file):syncState(file),rev:info.rev};
  }
  async function upload(expectedRev,data=current()){
    const mode=expectedRev?{".tag":"update",update:expectedRev}:"add";
    const response=await fetch(CONTENT+"/2/files/upload",{method:"POST",headers:{
      "Authorization":"Bearer "+await token(),
      "Dropbox-API-Arg":JSON.stringify({path:FILE,mode,autorename:false,strict_conflict:true,mute:true}),
      "Content-Type":"application/octet-stream"
    },body:JSON.stringify(snapshot(data))});
    if(response.status===409)throw new Error("Dropbox è cambiato durante la sincronizzazione. Riprova l'unione; nessun archivio locale è stato sostituito.");
    await fail(response);
    const info=await response.json();
    if(!info.rev)throw new Error("Dropbox non ha restituito una revisione del backup.");
    return info.rev;
  }
  function synced(data,rev){
    saveBase(data);
    meta.rev=rev;meta.ready=true;
    meta.dirty=stateJSON(current())!==stateJSON(data);
    storeMeta();
    status(meta.dirty?"Altre modifiche locali da sincronizzare":"Dropbox sincronizzato",
      meta.dirty?"pending":"idle");
    if(meta.dirty){
      clearTimeout(delay);
      delay=setTimeout(()=>sync().catch(e=>status(e.message,"error")),2500);
    }
  }
  async function adopt(data,rev,original=current()){
    if(stateJSON(current())!==stateJSON(original))
      throw new Error("Dati locali cambiati durante il download. Riprova la sincronizzazione.");
    backupBeforeReplacement(data);
    await applyRemote(data);
    synced(data,rev);
  }
  async function applyMerged(item,{manual=false}={}){
    const local=current(),base=baseline();
    let decisions={},result=mergeSnapshots(base,local,item.file,decisions);
    if(result.conflicts.length && !manual){
      meta.dirty=true;storeMeta();
      status(result.conflicts.length+" conflitti da risolvere: usa «Unisci e sincronizza».","error");
      return false;
    }
    let rounds=0;
    while(result.conflicts.length){
      if(!resolveConflicts)throw new Error("Risoluzione dei conflitti non disponibile.");
      if(++rounds>6)throw new Error("Troppi conflitti consecutivi: esporta un backup e riprova.");
      status("Scelta delle modifiche da conservare…","merging");
      const selected=await resolveConflicts(result.conflicts);
      if(!selected){status("Unione annullata: nessun dato sovrascritto.","pending");return false;}
      decisions={...decisions,...selected};
      result=mergeSnapshots(base,local,item.file,decisions);
    }
    const merged=normalizeRemote?normalizeRemote(result.merged):result.merged;
    if(stateJSON(current())!==stateJSON(local))
      throw new Error("I dati locali sono cambiati durante la scelta. Riprova l'unione.");
    // Save the pre-merge version before any remote/local write.
    backupBeforeReplacement(merged);
    if(stateJSON(merged)===stateJSON(item.file)){
      await adopt(merged,item.rev,local);
      status("Unione completata: dati Dropbox acquisiti.");
      return true;
    }
    status("Caricamento dell'archivio unificato su Dropbox…","uploading");
    const revision=await upload(item.rev,merged);
    if(stateJSON(current())!==stateJSON(local)){
      // Another edit happened mid-upload. Keep the old common base and
      // revision, so the next pass merges that edit with the uploaded data.
      // Updating the base here would let the next sync silently delete
      // remote-only items that have not reached the local copy yet.
      meta.ready=true;meta.dirty=true;storeMeta();
      status("Backup unificato caricato, ma i dati locali sono cambiati: nuova unione necessaria.","pending");
      return true;
    }
    // The upload succeeded: now update the local copy and the common base.
    await applyRemote(merged);
    synced(merged,revision);
    status(meta.dirty
      ?"Unione salvata su Dropbox; nuove modifiche locali ancora da inviare."
      :"Archivi uniti e sincronizzati.",meta.dirty?"pending":"idle");
    return true;
  }
  async function firstSync(direction){
    if(!auth.refreshToken)throw new Error("Collega prima Dropbox.");
    if(meta.ready)throw new Error("Sincronizzazione già inizializzata.");
    if(!navigator.onLine)throw new Error("Connessione assente.");
    if(direction==="merge")return mergeNow();
    status("Verifica del backup Dropbox in corso…","checking");
    const remote=await metadata();
    if(direction==="download"){
      if(!remote)throw new Error("Nessun backup presente su Dropbox.");
      status("Scaricamento del backup Dropbox…","downloading");
      const before=current();
      const item=await download();
      if(stateJSON(current())!==stateJSON(before))
        throw new Error("I dati locali sono cambiati durante il download. Riprova.");
      backupBeforeReplacement(item.file);
      await applyRemote(item.file);
      synced(item.file,item.rev);
      return;
    }
    if(direction==="upload"){
      if(remote)throw new Error("Dropbox contiene già un backup. Usa «Unisci gli archivi».");
      const local=current();
      status("Caricamento del primo backup Dropbox…","uploading");
      const rev=await upload(null,local);
      synced(local,rev);
      return;
    }
    throw new Error("Operazione iniziale non riconosciuta.");
  }
  async function sync(){
    if(overridePending)return;
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      if(!auth.refreshToken||!meta.ready)return;
      if(!navigator.onLine){status("Offline: modifiche conservate in locale","pending");return;}
      const base=baseline();
      if(base && stateJSON(current())!==stateJSON(base) && !meta.dirty){
        meta.dirty=true;storeMeta();
      }
      status("Verifica delle modifiche su Dropbox…","checking");
      const remote=await metadata();
      if(!remote){
        if(meta.rev)throw new Error("Backup remoto rimosso: evita una nuova copia senza conferma.");
        if(!meta.dirty)return;
        const local=current();
        const rev=await upload(null,local);
        synced(local,rev);
        return;
      }
      if(remote.rev===meta.rev && base){
        if(!meta.dirty){status("Dropbox sincronizzato");return;}
        status("Caricamento delle modifiche su Dropbox…","uploading");
        const local=current();
        const rev=await upload(meta.rev,local);
        synced(local,rev);
        return;
      }
      // Remote revision changed, or this device lacks a common ancestor.
      status("Confronto dell'archivio remoto e di quello locale…","downloading");
      const item=await download();
      if(item.rev!==remote.rev)
        throw new Error("Dropbox è cambiato durante il download. Riprova.");
      if(base&&!meta.dirty&&stateJSON(current())===stateJSON(base)){
        await adopt(item.file,item.rev);
        status("Dati aggiornati da Dropbox.");
        return;
      }
      if(!base && !meta.dirty && stateJSON(current())===stateJSON(item.file)){
        synced(item.file,item.rev);return;
      }
      await applyMerged(item);
    })().catch(e=>{status(e.message,"error");throw e;})
      .finally(()=>{inFlight=null;});
    return inFlight;
  }
  async function mergeNow(){
    if(!auth.refreshToken)throw new Error("Collega prima Dropbox.");
    if(overridePending)throw new Error("Un'altra operazione manuale è in corso.");
    overridePending=true;
    clearTimeout(delay);
    try{
      if(inFlight)await inFlight.catch(()=>{});
      if(!navigator.onLine)throw new Error("Connessione assente: unione rinviata.");
      status("Lettura della versione più recente su Dropbox…","checking");
      const remote=await metadata();
      if(!remote){
        if(meta.rev)throw new Error("Il backup Dropbox è stato eliminato. Usa la sovrascrittura esplicita per ricrearlo.");
        const local=current(),rev=await upload(null,local);
        synced(local,rev);
        return;
      }
      const item=await download();
      if(item.rev!==remote.rev)throw new Error("Dropbox è cambiato durante il download: riprova.");
      await applyMerged(item,{manual:true});
    }catch(e){status(e.message,"error");throw e;}
    finally{
      overridePending=false;
      if(meta.dirty&&meta.ready){
        clearTimeout(delay);
        delay=setTimeout(()=>sync().catch(e=>status(e.message,"error")),2500);
      }
    }
  }
  async function forceUpload(){
    if(!auth.refreshToken)throw new Error("Collega prima Dropbox.");
    if(overridePending)throw new Error("Un'altra operazione manuale è in corso.");
    overridePending=true;clearTimeout(delay);
    try{
      if(inFlight)await inFlight.catch(()=>{});
      if(!navigator.onLine)throw new Error("Connessione assente.");
      status("Controllo della revisione Dropbox…","checking");
      const remote=await metadata(),local=current();
      status("Sovrascrittura esplicita del backup Dropbox…","uploading");
      const rev=await upload(remote?.rev||null,local);
      synced(local,rev);
      status(meta.dirty?"Modifiche successive da inviare":"Dropbox sovrascritto con i dati locali",
        meta.dirty?"pending":"idle");
    }catch(e){status(e.message,"error");throw e;}
    finally{overridePending=false;}
  }
  async function forceDownload(allowDirty=false){
    if(!auth.refreshToken||!meta.ready)throw new Error("Inizializza prima la sincronizzazione.");
    if(meta.dirty&&!allowDirty)throw new Error("Modifiche locali da conservare: download bloccato.");
    if(overridePending)throw new Error("Un'altra operazione manuale è in corso.");
    overridePending=true;clearTimeout(delay);
    try{
      if(inFlight)await inFlight.catch(()=>{});
      const before=current();
      const item=await download();
      if(stateJSON(current())!==stateJSON(before))
        throw new Error("I dati locali sono cambiati durante il download. Riprova.");
      backupBeforeReplacement(item.file);
      await applyRemote(item.file);
      synced(item.file,item.rev);
      status("Archivio Dropbox scaricato.");
    }finally{overridePending=false;}
  }
  function disconnect(){
    clearTimeout(delay);
    auth={};meta={rev:null,dirty:false,ready:false};
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(BASE_KEY);
    status("Dropbox scollegato. Dati locali conservati.");
  }
  function info(){return {connected:Boolean(auth.refreshToken),ready:meta.ready,dirty:meta.dirty};}
  async function init(){
    await callback();
    status(auth.refreshToken?(meta.ready?"Dropbox connesso":"Dropbox collegato: inizializzazione necessaria"):"Dropbox non collegato");
    if(meta.ready)await sync().catch(()=>{});
  }
  return {init,connect,firstSync,sync,changed,mergeNow,forceUpload,forceDownload,disconnect,info,recovery};

}
