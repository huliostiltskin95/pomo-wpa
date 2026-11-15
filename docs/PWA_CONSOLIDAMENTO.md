# Consolidamento Tempo / TEMPVS PWA

## Audit del punto di partenza

Repository `huliostiltskin95/pomo-wpa`; branch predefinito verificato con `git ls-remote --symref`: `main`, commit iniziale `dc79be7`. Nessun `AGENTS.md` presente.

La PWA effettivamente caricata è `index.html` → `simple.js`, con `planner-table.js`, `ui-refine.js`, `timer-pip.js` e moduli `core/`. Non usa un framework o un backend. Gli altri file storici di task management restano nel repository, ma non sono la UI attiva: non sono stati ripristinati. La sola dipendenza di sviluppo dichiarata è esbuild, usata per il bundle Obsidian.

- **Persistenza:** `core/tempo-archive-store.js` legge `tempo-pomodoro-v2` o il precedente `tempo-pomodoro-v1`; mantiene la copia originale in `tempo-before-simple-v1`. Le scritture locali sono immediate. Dati malformati non vengono sovrascritti al caricamento.
- **Timer e pause:** `core/tempo-core.js` calcola le fasi da orari assoluti; i timer immediati conservano anche i secondi. Le pause automatiche già esistenti sono proporzionali al focus (5:1, arrotondato); la pausa personalizzata è un budget finale interno alla durata lorda. Non risultano impostazioni attive per pause lunghe/cicli separati: non sono state inventate.
- **Statistiche:** il focus osservato viene misurato da `measuredFocus`; intervalli di sospensione superiori a 15 secondi non sono conteggiati. Lo storico precedente non verificato è conservato separatamente dai totali misurati. La conclusione di una sessione non completa le task.
- **Offline:** service worker con app shell in cache e fallback di navigazione. Il nuovo modulo delle aree è incluso; cache aggiornata a `tempo-pomodoro-v61`.
- **Dropbox:** OAuth PKCE e refresh token, unico file `/tempo-backup.json`, upload atomico con `add` o `update` vincolato alla revisione, base comune per merge a tre vie, copie di recupero, sincronizzazione su modifica/avvio/ritorno in primo piano/rete ristabilita erano già implementati.

Cronologia recente: `97f9b8a` (0.5.5) ha introdotto i cicli lordi nella sintassi precedente; `ca51512` (0.5.6) ha corretto persistenza e lifecycle Dropbox; `3a81eb6` (0.5.7) ha introdotto fasce, riordino/rinomina/trasferimento aree e retry Dropbox; `dc79be7` contiene il bundle Obsidian generato. L'intervento attuale completa e corregge queste funzioni, senza rifare l'app.

Problemi verificati nel codice iniziale: fasce limitate ai minuti, ultima sessione accorciata implicitamente, riferimenti alle aree per nome, sola eliminazione con trasferimento, nessuna cancellazione sincronizzata dello storico misurato, risposta OAuth/metadati insufficientemente validata, errori permanenti ritentati come errori di rete. Il primo `npm test` aveva una sola failure ambientale (esbuild non installato); dopo installazione delle dipendenze la baseline era eseguibile.

## Grammatica della pianificazione

```text
Studio +14:00-16:00 -30m
Lavoro +09:00-12:00 -45m
Personale +21:00-00:00 -1h
Studio approfondito +14:00-17:00 -1,5h
```

`+inizio-fine` è la finestra disponibile. `-durata` è la durata **lorda di ogni sessione**, non una pausa né la durata complessiva della finestra. Sono accettati `m` e `h`, virgola o punto decimale, maiuscole/minuscole e spazi superflui; la durata convertita deve corrispondere a minuti interi (1–1439). I nomi delle aree possono contenere spazi.

Le sessioni sono adiacenti, con pause **interne**, senza aggiungere intervalli esterni. Si mantengono le pause automatiche configurate, comprese quelle disabilitate; la tabella permette le altre modalità già disponibili. Con impostazioni 25/5, una sessione lorda da 30 minuti contiene 25 minuti di focus e 5 di pausa. La pausa personalizzata da 5 minuti in una sessione da 45 minuti lascia 40 minuti di focus.

**Politica del residuo:** solo sessioni intere; gli eventuali minuti finali restano liberi e sono indicati nel riepilogo della riga e nella proposta. `Studio +14:00-15:40 -30m` propone 14:00–14:30, 14:30–15:00 e 15:00–15:30, con 10 minuti liberi. Una fascia più corta di una sessione è un errore. Non vengono salvate sessioni parziali né superata la fine della finestra.

Una fine antecedente all'inizio indica il giorno successivo; inizio e fine uguali sono rifiutati come ambigui. `+23:50-01:00 -30m` produce 23:50–00:20 e 00:20–00:50 del giorno successivo, lasciando 10 minuti liberi. La data di partenza si sceglie nella PWA.

Ogni riga è indipendente. L'intero testo viene analizzato prima di cambiare la tabella: un errore riporta il numero di riga e non importa una parte del gruppo. Le sovrapposizioni, anche oltre mezzanotte, sono verificate prima della proposta e nuovamente alla conferma. Importando un gruppo si sostituisce solo la riga iniziale mai modificata, evitando una sessione aggiuntiva implicita; le altre righe esistenti restano.

La sintassi precedente resta distinta e valida:

```text
Lavoro @1,5h +08:30
Studio @2h +14:00 -60m
Studio @45m +09:00 !5m
```

Qui `@` è la durata complessiva; `-60m` conserva il significato storico di ciclo Pomodoro lordo (50/10), `~40m` indica il focus per ciclo e `!5m` la pausa finale. Non combinare `-ciclo` con `~focus` o `!pausa`.

## Aree e compatibilità dei dati

Il comando **Aree** apre direttamente la gestione: creazione, rinomina, colore, descrizione Markdown, frecce di riordino, trasferimento selettivo di sessioni/task/storico. Lo storico di una sessione selezionata viene trasferito insieme alla sessione. I nomi delle task non vengono sostituiti dal nome dell'area.

Ogni area ha `id`, ogni record collegato ha `areaId`; `area` resta come nome leggibile per la compatibilità. Per i backup precedenti gli ID sono deterministici (`area:` seguito dal nome normalizzato e codificato), così due dispositivi migrano allo stesso identificativo. Le nuove aree ricevono un ID nuovo. Rinomina e riordino non cambiano l'ID. La normalizzazione è ripetibile e conserva i campi esistenti, descrizioni e stato manuale delle task. I trasferimenti espliciti per nome effettuati da client precedenti sono riconciliati quando esiste ancora un'area di destinazione valida.

Prima di eliminare un'area viene mostrato il numero di sessioni, task e voci di storico. È necessario scegliere un trasferimento o l'eliminazione dei dati; quest'ultima richiede conferma e salva una copia di recupero scaricabile dalle impostazioni di backup. Rimane almeno un'area. Le cancellazioni dei record sono conservate in `syncDeleted`; per lo storico è aggiunta la collezione opzionale `history`.

I totali delle statistiche distinguono la concentrazione effettivamente registrata dal programmato lordo settimanale. Lo storico di sessioni eliminate singolarmente continua a essere conservato; l'eliminazione esplicita di un'area **con tutti i dati** elimina anche il relativo storico.

## Dropbox

Vedi anche [DROPBOX_SYNC.md](../DROPBOX_SYNC.md).

- L'upload usa la revisione Dropbox attesa: nessuna sovrascrittura automatica di una revisione diversa. Una risposta di successo senza revisione valida non viene considerata completamento.
- OAuth e rinnovo devono restituire credenziali e scadenza valide; metadati e archivio remoto sono validati prima dell'importazione. Restano validi anche backup senza le collezioni opzionali `tasks`/`history`.
- Errori di trasporto, HTTP 409 di upload, 429 e 5xx mantengono le modifiche locali e attivano retry a 5, 10, 20, 40, 80 e poi massimo 120 secondi. `Retry-After` può imporre un'attesa maggiore. Dati non validi ed errori permanenti non provocano un ciclo di retry automatico.
- La sincronizzazione confronta gli snapshot con una base comune, unisce modifiche indipendenti e chiede una scelta per modifiche incompatibili o sovrapposizioni. Le preferenze e l'elenco ordinato delle aree mantengono il comportamento di merge esistente: l'elenco è atomico e modifiche concorrenti possono richiedere una scelta dell'intero elenco.
- Se un dispositivo elimina un'area mentre un altro aggiunge elementi collegati, viene richiesta una scelta esplicita tra ripristinare l'area e cancellare gli elementi interessati.
- Le cancellazioni dello storico sono propagate tramite tombstone: uno storico eliminato esplicitamente non ricompare automaticamente da un backup precedente. Una modifica concorrente richiede una decisione.
- Le prime operazioni manuali sono serializzate. Se i dati locali cambiano durante un download di sostituzione, l'importazione viene bloccata. Se cambiano durante un upload, restano in attesa e vengono inviati al passaggio successivo. Anche un merge modificato durante l'upload programma un nuovo passaggio.
- Prima di sostituire dati differenti viene conservato `tempo-dropbox-recovery-v1`, con data e snapshot. La copia locale della migrazione resta disponibile separatamente. La UI mostra conflitto, errore, attesa, operazione in corso e ultima conferma riuscita; l'indicatore di avanzamento è indeterminato, senza percentuali simulate.

## Audio, PiP e limiti verificabili

Il motore audio genera i quattro suoni localmente con Web Audio. Non dipende da file remoti. Il test Chromium misura un segnale non nullo per rumore bianco, marrone, pioggia e camino; verifica anche preview, avvio durante una sessione, pausa/ripresa, volume e dissolvenza. Non è stata riprodotta una failure del motore in Chromium, quindi non viene dichiarato corretto il problema audio su iPad. Safari richiede un gesto dell'utente; la sessione audio ambientale già prevista può essere silenziata dalle impostazioni del dispositivo.

Il PiP usa Document PiP dove disponibile o video/canvas con verifica delle API WebKit. Se non è supportato o l'apertura viene rifiutata, apre la vista Focus dello stesso timer. Il comando di chiusura resta visibile anche dopo la fine della sessione quando il PiP è ancora aperto (correzione di una regressione UI preesistente).

**Limiti del collaudo:** nessun account Dropbox reale è stato collegato; le API sono simulate con controlli di revisione, token, guasti e concorrenza. Safari su iPad e vecchi Android richiedono un collaudo su hardware reale. WebKit è stato scaricato, ma non avviato: nell'ambiente mancano librerie native e l'installazione delle dipendenze è fallita per mancanza di privilegi. Non viene dichiarata verificata la compatibilità su quei dispositivi. Il comportamento nei cambi d'ora legale non è stato oggetto di questo intervento; la pianificazione continua a usare gli orari locali del core esistente.

## Verifica e file

- `npm test`: test unitari e regressioni (parser, aree, backup, merge, timer, pause, task, audio e packaging).
- `node tests/simple.e2e.mjs`: flusso PWA esistente.
- `node tests/pwa-consolidation.e2e.mjs`: desktop 1280 px e mobile 390 px, batch, residuo, aree/associazioni, rinomina, eliminazione, persistenza, errore su una riga, assenza di overflow, ricarica offline e timer, fallback PiP. Screenshot in `dist/test-artifacts/`.
- `node tests/ambient.e2e.mjs`: misura audio Chromium.
- `node tests/timer-pip.e2e.mjs`: Document PiP Chromium, controlli condivisi, chiusura dopo fine sessione e colori delle pause.
- `npm run build:pwa` e `npm run check:release`: pacchetto PWA e coerenza dei metadati; nessuna pubblicazione.

Per i test browser installare Playwright (`npm install --no-save --no-package-lock playwright`, `npx playwright install chromium`) e servire l'app sulla porta 8123 con `python3 -m http.server 8123 --bind 127.0.0.1`. I due workflow di rilascio eseguono anche i nuovi test di consolidamento e PiP contro il pacchetto PWA preparato.

File principali: nuovo `core/tempo-areas.js`; modifiche a `core/tempo-simple.js`, `core/tempo-dropbox.js`, `core/tempo-merge.js`, `planner-table.js`, `simple.js`, `index.html`, `timer-pip.js`, `ui-refine.css`, `sw.js`. Test aggiunti in `tests/pwa-consolidation.test.mjs`, `tests/dropbox-integrity.test.mjs`, `tests/pwa-consolidation.e2e.mjs`; aggiornati i test esistenti interessati. Nessun sorgente o manifest Obsidian modificato. I moduli core sono condivisi con il plugin: una futura ricompilazione ne acquisirà le correzioni, ma il bundle distribuito esistente e la sua versione restano invariati.

### Esito del collaudo in questo ambiente

| Verifica | Esito |
| --- | --- |
| Suite `npm test` | 136 superati, 0 falliti |
| Parser/pianificazione/aree con `TZ=Europe/Rome` | 45 superati, 0 falliti |
| Smoke runtime dei moduli condivisi con Obsidian | 5 superati, desktop e mobile simulati |
| PWA esistente, consolidamento desktop/mobile e PiP sul pacchetto generato | Superati in Chromium |
| Ricarica offline e recupero dati | Superati in Chromium |
| Quattro suoni ambientali e controllo del segnale | Superati in Chromium |
| Build PWA e validazione metadati release 0.5.7 | Superate |
| WebKit / iPad reale / vecchi Android | Non verificati, limiti descritti sopra |
| Account Dropbox reale | Non collegato; test su API simulate |

Il consolidamento è stato preparato sul branch `fix/pwa-planning-sync-consolidation`, derivato da `main`. La PWA usa il sito GitHub Pages esistente, configurato per pubblicare direttamente `main`. I workflow CI controllano build e test sul medesimo commit; in questa configurazione il deploy Pages è indipendente dal loro completamento. La versione pubblicata del plugin rimane invariata.
