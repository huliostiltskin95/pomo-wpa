/**
 * Platform-neutral local TEMPVS archive.
 * Accepts browser localStorage or an Obsidian-compatible key/value adapter.
 * Loading retains the legacy archive and never overwrites malformed data.
 */
export function createArchiveStore({storage,key="tempo-pomodoro-v2",legacyKey="tempo-pomodoro-v1",copyKey="tempo-before-simple-v1",normalize}){
  if(!storage || typeof storage.getItem!=="function" || typeof storage.setItem!=="function")throw Error("Archivio locale non disponibile.");
  if(typeof normalize!=="function")throw Error("Normalizzazione archivio obbligatoria.");
  return {
    load(){
      const raw=storage.getItem(key)||storage.getItem(legacyKey);
      const state=normalize(raw?JSON.parse(raw):{sessions:[]});
      if(raw && !storage.getItem(copyKey))storage.setItem(copyKey,raw);
      storage.setItem(key,JSON.stringify(state));
      return state;
    },
    save(state){storage.setItem(key,JSON.stringify(state));},
    getLegacyCopy(){return storage.getItem(copyKey);}
  };
}
