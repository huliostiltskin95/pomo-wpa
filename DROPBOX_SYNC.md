# Dropbox: configurazione sincronizzazione Tempo PWA

La sincronizzazione e' **facoltativa**. La PWA continua a funzionare offline anche senza Dropbox. Il codice resta su GitHub Pages; i dati (task, descrizioni Markdown, checklist, sessioni, storico, preferenze) sono salvati in un solo JSON in Dropbox, nell'App folder.

## Prima configurazione

1. Apri https://www.dropbox.com/developers/apps e crea una nuova app con **Scoped access** e **App folder**.
2. Nella sezione **Permissions** abilita **files.content.read**, **files.content.write** e **files.metadata.read**, quindi salva.
3. Nelle impostazioni della app registra la **Redirect URI** identica all'indirizzo pubblico della PWA: `https://huliostiltskin95.github.io/pomo-wpa/` (verifica l'URL effettivo aperto nel browser, compresa la slash finale).
4. Copia la **App key** (NON la App secret) nel campo Dropbox di Tempo e premi **Collega Dropbox**.
5. Consenti l'accesso e torna alla PWA. Prima di tutto **esporta un backup JSON locale**.
6. Sul dispositivo contenente l'archivio principale scegli **Carica archivio locale**; su quelli successivi scegli **Scarica archivio Dropbox**.

## Funzionamento e conflitti

- Dopo ogni modifica persistente, Tempo salva immediatamente nel browser e carica su Dropbox dopo una breve attesa. All'apertura, al ritorno in primo piano e al ripristino della rete confronta le revisioni.
- Una scrittura in Dropbox utilizza la revisione `rev` precedente: se qualcun altro l'ha modificata, la scrittura non sovrascrive il file.
- In presenza di modifiche locali e remote concorrenti, la sincronizzazione si interrompe. Per conservare Dropbox usa **Risolvi conflitto: conserva Dropbox**; Tempo esporta prima un backup locale JSON. Per conservare i dati locali, esportali e poi esegui un ripristino controllato; non c'e' una fusione automatica dei record.
- Se la prima sincronizzazione trova un file remoto gia' esistente, l'upload iniziale viene bloccato.
- Il collegamento usa OAuth 2 PKCE e refresh token. Non inserire mai l'App secret nel codice o nella PWA. Token e preferenze del collegamento rimangono nell'archivio locale del browser: evita l'utilizzo su dispositivi non attendibili.
- I dati vengono sincronizzati quando Tempo e' aperto e online; non c'e' un servizio in background con la PWA chiusa.
- In caso di problematiche, il backup JSON manuale rimane indipendente da Dropbox.

## Ambito

Questa implementazione riguarda **solo la PWA**, non il plugin Obsidian. Il timer continua a basarsi sull'orario locale e sulla programmazione, non e' un timer live condiviso.

## Verifiche consigliate

1. Esporta un backup manuale prima del primo collegamento.
2. Su dispositivo A collega Dropbox e carica l'archivio principale.
3. Su dispositivo B connetti la stessa app Dropbox e scarica il backup.
4. Aggiungi una task su B, attendi la conferma, riapri A e verifica che compaia.
5. Verifica anche checklist Markdown, stati, sessioni e funzionamento offline.
