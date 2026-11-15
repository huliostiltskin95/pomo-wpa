# Dropbox: sincronizzazione Tempo PWA

La sincronizzazione è facoltativa. La PWA salva subito nel browser e funziona offline. Dropbox conserva un solo `/tempo-backup.json` nell'App folder, con aree, sessioni, task, storico, impostazioni e cancellazioni.

## Configurazione

1. Su https://www.dropbox.com/developers/apps crea una app con **Scoped access → App folder**.
2. Abilita **files.content.read**, **files.content.write**, **files.metadata.read** e salva.
3. Registra la Redirect URI identica all'indirizzo aperto, compresa la slash finale; normalmente `https://huliostiltskin95.github.io/pomo-wpa/`.
4. Nella PWA apri **Impostazioni → Backup locale e sincronizzazione Dropbox** e inserisci la **App key**, mai l'App secret. Collega e autorizza Dropbox.
5. Esporta una copia JSON prima della prima sincronizzazione.
6. Sul dispositivo con i dati principali scegli **Carica primo backup**. Se il file esiste già, l'upload iniziale viene bloccato: usa **Unisci archivi** oppure **Ripristina da Dropbox** dopo aver conservato una copia locale.

Il collegamento usa OAuth PKCE e refresh token, conservati nel browser. Il rinnovo viene effettuato alla scadenza; credenziali incomplete o risposte non valide vengono rifiutate.

## Uso quotidiano e conflitti

Le modifiche vengono inviate quando l'app è aperta, dopo una breve attesa. La revisione remota viene controllata all'avvio, al ritorno in primo piano e al ripristino della rete. La chiusura dell'app, soprattutto su iOS, non garantisce che una richiesta asincrona termini: riaprila per completare gli invii rimasti in attesa.

Ogni upload è atomico e vincolato alla revisione precedente (`rev`): non sovrascrive un'altra revisione. La base comune permette il merge di modifiche indipendenti. Le modifiche incompatibili, le sovrapposizioni e gli elementi aggiunti a un'area nel frattempo eliminata richiedono una scelta tramite **Unisci archivi**. La risoluzione può richiedere più passaggi. L'elenco ordinato delle aree è confrontato nel suo insieme; non viene fuso automaticamente per singola area.

Le eliminazioni sono conservate come tombstone di sessioni, task e, quando necessario, storico. Un elemento eliminato non viene recuperato automaticamente da una versione obsoleta; una modifica concorrente richiede una scelta. La cancellazione di una singola sessione conserva il focus misurato; la cancellazione esplicita di un'area con tutti i dati elimina anche lo storico associato.

Prima di una sostituzione viene mantenuta una copia in `tempo-dropbox-recovery-v1`, scaricabile con **Scarica copia di recupero locale**. I backup JSON precedenti rimangono importabili, anche se privi di task o storico. Se un download trova un archivio non valido o modifiche locali avvenute durante l'attesa, non sostituisce i dati.

## Stato e ripresa dagli errori

L'interfaccia distingue sincronizzato, modifiche in attesa, operazione in corso, conflitto ed errore. L'ultima sincronizzazione viene aggiornata soltanto dopo conferma di revisione/operazione riuscita. L'avanzamento è indeterminato: non vengono inventate percentuali.

Errori di rete, HTTP 409 durante upload, 429 e 5xx vengono ritentati con attesa crescente (5–120 secondi), rispettando un eventuale `Retry-After` maggiore. Errori permanenti o backup malformati richiedono un intervento e non vengono ritentati senza fine. Le modifiche locali restano conservate.

## Collaudo

Esistono test con API Dropbox simulate per revisioni, token scaduti, risposte incomplete, errori di rete, retry/backoff, conflitti, cancellazioni e modifiche durante upload/download. Non sostituiscono un test con account e dispositivi reali: esporta un backup, carica da A, scarica da B, modifica su B, ritorna su A e verifica anche rinomina aree, storico, cancellazioni e uso offline.

Il timer non è condiviso in tempo reale tra dispositivi. I moduli di sincronizzazione sono condivisi con Obsidian, ma questo intervento riguarda la PWA e non pubblica un aggiornamento del plugin. Dettagli tecnici e limiti: [consolidamento PWA](docs/PWA_CONSOLIDAMENTO.md).
