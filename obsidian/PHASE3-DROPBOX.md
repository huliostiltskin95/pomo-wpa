# TEMPVS — Fase 3: Dropbox in Obsidian

## Modello dati
Il plugin usa lo stesso archivio `/tempo-backup.json` della PWA e le medesime routine di revisione, fusione a tre vie e recupero. Le sessioni mantengono gli stessi identificatori; non viene creato un secondo archivio Dropbox.

## Collegamento Dropbox (desktop/iPad/Android)
1. In **TEMPVS → Dropbox**, inserisci la stessa **App key** che usi nella PWA (o una app Dropbox con accesso al medesimo file autorizzato).
2. Premi **1. Autorizza su Dropbox**, poi **Apri autorizzazione Dropbox**.
3. Dopo il consenso, Dropbox mostra un **codice**: copialo in Obsidian.
4. Premi **2. Completa collegamento**.
5. Premi **Prima unione** per confrontare i dati locali con quelli Dropbox. In caso di differenze non risolvibili automaticamente, scegli esplicitamente quale versione conservare.

Dropbox supporta PKCE senza redirect URI: non serve un callback su un server. Il codice autorizzazione è monouso e non va condiviso.

## Sincronizzazione
- All'avvio del plugin, se già collegato e inizializzato, viene verificata la versione remota.
- Dopo modifiche locali avviene un salvataggio nell'archivio di Obsidian e una sincronizzazione differita, quando il dispositivo resta attivo e connesso.
- **Sincronizza** forza la verifica, **Unisci** avvia il confronto manuale e la risoluzione dei conflitti.
- **Sovrascrivi Dropbox** è separato e richiede conferma.
- **Scarica prima copia** sostituisce i dati locali solo dopo conferma e una copia di recupero; usalo solo se sai che i dati del plugin possono essere sostituiti.
- Non esiste sincronizzazione garantita alla chiusura o in background su iOS.

## Persistenza e sicurezza
OAuth e metadati di sincronizzazione vengono conservati nel `data.json` del plugin mediante Obsidian. Il refresh token non è cifrato dal plugin: proteggi il dispositivo e non pubblicare/condividere `data.json`. Evita di sincronizzare la cartella del plugin con Syncthing **in aggiunta** a Dropbox, perché le copie locali di token e metadati possono divergere.

## Limiti prima della pubblicazione
- Richiesto collaudo reale di autorizzazione, download, upload, conflitti e riavvio su macOS, iPadOS e Android.
- La fase 2/3 rimane su branch separati. La PWA su `main` non viene modificata.
- Il recupero pre-sostituzione è conservato nella chiave locale `tempo-dropbox-recovery-v1`; va esposto meglio in UI prima di una release stabile.
