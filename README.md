## Segnale acustico di fine focus (novembre 2026)

- Alla fine di ogni fase di concentrazione viene emesso un breve segnale a due note, anche se i rumori ambientali sono disattivati; funziona sia per pause automatiche che per pause personalizzate e all'eventuale termine della sessione.
- La preferenza «Segnale acustico alla fine del focus» è nelle Impostazioni → Timer e pause; è attiva per impostazione predefinita e può essere provata con «Prova segnale».
- Il segnale è generato localmente tramite Web Audio, senza file esterni. Il contesto audio viene predisposto con un'interazione dell'utente per favorire la compatibilità con le politiche autoplay.
- Nessun segnale arretrato se il browser viene riattivato diversi secondi dopo un passaggio di fase: questo evita avvisi fuori tempo.
- La preferenza viene salvata con i dati dell'app, quindi è inclusa in backup e sincronizzazione. Il PiP resta invariato.
- Cache offline `tempo-pomodoro-v56`. Safari/iPadOS può sospendere l'audio in background: il segnale non è garantito con app chiusa o sospesa.

## Fase 4 — Statistiche, impostazioni e Dropbox (novembre 2026)

- Statistiche dedicate alla concentrazione realmente registrata: oggi, settimana corrente (da lunedì) e totale, con distribuzione settimanale per area e storico. I record storici non verificati restano visibili nello storico ma non contribuiscono ai totali.
- Impostazioni suddivise in tre pannelli espandibili: Timer e pause, Aree e risorse Markdown, Backup locale e sincronizzazione Dropbox.
- Stato sintetico di Dropbox nell'intestazione: account non collegato, configurazione iniziale, modifiche in attesa, sincronizzazione in corso, sincronizzato o errore. Toccando l'indicatore si aprono le impostazioni di backup.
- Tutte le operazioni preesistenti sono conservate: esportazione JSON, importazione con copia preventiva, copia precedente alla semplificazione, connessione Dropbox, sincronizzazione, unione, caricamento iniziale, ripristino e disconnessione.
- Modulo Dropbox, schema dei dati, core Pomodoro, timer PiP e logica delle sessioni invariati.
- Cache offline `tempo-pomodoro-v55`. Verifiche statiche di sintassi e integrazioni completate; il collaudo in Safari/iPadOS e su Galaxy Note 3 resta da eseguire.

## Fase 5 — Ottimizzazione mobile, accessibilità e prestazioni (novembre 2026)

- Aggiornamento del timer e della relativa vista PiP ogni secondo anche quando il documento non è visibile, finché il browser consente l'esecuzione dei timer. Resta il limite imposto dal sistema operativo alle PWA in background.
- Aggiornamento delle liste e delle statistiche una volta per minuto quando la pagina pertinente è visibile, oltre agli aggiornamenti immediati sui cambiamenti dei dati. Persistenza del tempo effettivamente misurato circa ogni 15 secondi, invariata.
- Ricostruzione delle opzioni delle aree e del Markdown delle risorse soltanto quando i relativi dati cambiano.
- Navigazione tramite hash coerente anche con i comandi avanti/indietro del browser, relazioni accessibili fra navigazione e sezioni, frecce/Home/End da tastiera, collegamento «Vai al contenuto».
- Miglioramenti touch: bersagli di almeno 44 px per i principali controlli, campi mobile a 16 px, spazi di sicurezza iOS, focus visibile, contrasti elevati e rispetto della preferenza di ridurre il movimento.
- Nessuna modifica al formato dei dati, al core Pomodoro, al modulo `timer-pip.js` o ai flussi Dropbox.
- Service worker `tempo-pomodoro-v54`. Controlli statici di sintassi e integrazione superati; il collaudo sul dispositivo reale, specialmente del PiP su iPadOS, resta necessario.

## Fase 3 — Modifica e riprogrammazione (novembre 2026)

- Spostamento delle sessioni con pannello dedicato: data e ora validate prima della conferma; durata lorda preservata e sovrapposizioni rifiutate.
- Pause personalizzate con controllo automatico/manuale e validazione nell'intervallo consentito, sempre all'interno della durata lorda.
- Riaprire il pannello è necessario se la sessione è stata cambiata, avviata, completata o eliminata durante la modifica.
- Risoluzione dei conflitti Dropbox con confronto esplicito dei dati locali/remoti, opzioni radio e nessuna scelta preimpostata.
- Corretto il controllo data nella navigazione giornaliera introdotta in fase 2.
- Cache offline `tempo-pomodoro-v53`; logica del timer e modulo PiP invariati.
- Controlli statici della sintassi e delle integrazioni superati; la verifica end-to-end su Safari/iPadOS e altri dispositivi rimane necessaria.

# TEMPVS

## Fase 2 — Pianificazione giornaliera (novembre 2026)

- La pagina Pianifica apre l'elenco del giorno, con pulsanti giorno precedente/successivo, Oggi e selettore data.
- Il riepilogo giornaliero mostra numero delle sessioni, tempo lordo occupato e durata delle fasce disponibili; le sessioni oltre mezzanotte contribuiscono a entrambi i giorni solo per la porzione di tempo effettivamente occupata.
- Inserimento rapido testuale immediatamente accessibile dal pulsante dedicato. Sintassi invariata (`Studio @1h +13:45`, `Lavoro @45m !5m`); importazione nella tabella, anteprima e conferma esplicita rimangono obbligatorie.
- La tabella completa e la gestione delle fasce sono sezioni secondarie espandibili. Le date della pianificazione rapida si sincronizzano quando si naviga tra i giorni.
- Nessuna modifica allo schema dei dati, al timer, alla logica delle pause o al modulo PiP.
- Cache offline `tempo-pomodoro-v52`. Verificati i collegamenti e la sintassi JavaScript; resta da effettuare un collaudo browser sui dispositivi di destinazione.

## Interfaccia compatta — novembre 2026

- La Home privilegia l'avvio rapido: il ciclo di concentrazione e le pause personalizzate sono in un pannello espandibile, ma restano disponibili senza modificare il modello dei dati.
- In Pianifica vengono mostrate prima le sessioni del giorno; il modulo per le fasce disponibili e la tabella di pianificazione sono contestuali. La sintassi testuale rapida è conservata.
- Modifica dell'orario e delle pause tramite finestre accessibili in pagina, anziché prompt nativi; dialoghi dedicati anche ai conflitti Dropbox.
- Backup JSON e Dropbox sono in Impostazioni; Statistiche mostra principalmente i dati registrati.
- Navigazione inferiore sui dispositivi mobili. Meno rendering delle statistiche quando la pagina non è visibile.
- Il mini timer PiP continua a utilizzare `timer-pip.js` e il timer reale. Il supporto effettivo dipende dalle API del browser e richiede collaudo specifico su Safari/iPadOS.
- File aggiunti: `ui-refine.js` e `ui-refine.css`, inclusi nella cache offline `tempo-pomodoro-v50`.

## Timer semplice — versione attuale

La PWA carica soltanto `simple.js` e `simple.css`: Timer, Sessioni e Statistiche. I moduli della precedente Agenda restano nel repository per la cronologia del progetto, ma non vengono caricati dalla PWA. Il plugin Obsidian non è stato ridisegnato.

- Avvio immediato per area e durata lorda; pause Pomodoro 5:1 opzionali. La pausa manuale sospende il conteggio, senza spostare la fine programmata.
- Fasce per singola data, anche oltre mezzanotte. Inserimento `Studio @2h` o `Lavoro @45m`, una riga per sessione. Con `Lavoro @1,5h +08:30` l’inizio è fisso nel giorno scelto e non richiede fasce; gli orari passati o sovrapposti vengono rifiutati. Le righe senza orario usano le fasce e rispettano gli orari già fissati. La proposta usa i primi spazi liberi, divide tra fasce e richiede conferma; se manca spazio non salva parzialmente.
- Aree personalizzate con descrizioni Markdown (titoli, grassetto, corsivo, codice, citazioni, link e checkbox). Link Obsidian consentiti; HTML utente non eseguito.
- Statistiche del focus effettivamente osservato, esclusi pausa e intervalli di sospensione superiori a 15 secondi. Non è una verifica della presenza: se il timer gira, il tempo viene registrato. App chiusa o sospesa non registra il tempo mancante.
- Backup JSON e Dropbox includono sessioni, statistiche, aree e fasce. Aree/fasce sono in `defaults.simple`, compatibile con il merge Dropbox esistente.
- Alla prima apertura una copia integrale locale è salvata in `tempo-before-simple-v1`, esportabile da Statistiche. Task e vecchio storico rimangono nei backup; lo storico precedente viene segnalato come non verificato. Dati malformati non vengono azzerati.
- Le sessioni concluse anticipatamente liberano la disponibilità. Eliminare una sessione conserva il suo tempo misurato, anche dopo un merge Dropbox.

Verifica locale: `node --test tests/*.test.js tests/*.test.mjs`. La pipeline browser esegue `tests/simple.e2e.mjs`; i precedenti test e2e Agenda documentano la vecchia UI.

Le sezioni seguenti descrivono le versioni precedenti.

## Interfaccia TEMPVS 3.0 — fase 3 (rifinitura e collaudo)

- **Coerenza grafica:** uno stile uniforme per Oggi, Agenda e Sessioni, con superfici semplici, testi più leggibili, gerarchia visiva e contrasto nel tema scuro.
- **Accessibilità:** menu globale e menu Altro utilizzabili da tastiera, navigazione settimanale tramite frecce/Home/End, focus visibile e pulsante accessibile per creare una sessione dalla timeline.
- **Touch e dispositivi meno potenti:** target più grandi su smartphone/tablet, animazioni disattivabili con Preferisci movimento ridotto, niente nuovi framework, font remoti o effetti GPU non necessari.
- **Rendering efficiente:** Oggi e la timeline vengono ricalcolati soltanto quando è visibile la rispettiva sezione e cambiano dati, giorno oppure minuto; il timer Pomodoro resta indipendente.
- **Cache offline:** risorse di fase 3 precache nella versione `tempo-pomodoro-v39`; struttura dati, backup Dropbox e plugin Obsidian invariati.
- **Collaudo dell'utente:** vedi [COLLAUDO_TEMPVS_3.md](./COLLAUDO_TEMPVS_3.md) per una checklist di verifica tra più dispositivi.

## Interfaccia TEMPVS 3.0 — fase 2

- **Oggi operativa:** timer Pomodoro originale affiancato alle task pertinenti alla giornata (in scadenza/scadute, assegnate al giorno o associate a sessioni odierne). Il riepilogo mostra ore lorde programmate, blocchi giornalieri e attività aperte; le task da riprogrammare vengono segnalate senza cambiarne lo stato.
- **Azioni contestuali:** da Oggi puoi aprire i dettagli della task oppure il modulo esistente per programmarne una quota; il pulsante Pianifica la giornata apre Sessioni sulla data odierna.
- **Settimana navigabile:** sette giorni selezionabili con carico lordo calcolato per ciascuna data; frecce per il giorno precedente e successivo, calendario e comando Oggi sincronizzati con il filtro originale.
- **Sessioni come time blocking:** timeline oraria con blocchi colorati per area. Tocca un blocco per modificarlo tramite il modulo originale, oppure uno spazio libero per aprire una nuova sessione con data e ora precompilate. Il salvataggio continua a validare gli intervalli e a vietare sovrapposizioni.
- **Oltre mezzanotte:** i blocchi vengono suddivisi visivamente fra la giornata iniziale e quella seguente; una sessione di 23:00–01:00 è visibile su entrambi i giorni, ma resta un'unica sessione nei dati.
- **Dettagli conservati:** l'elenco con checkbox delle task associate e comandi di assegnazione/modifica/eliminazione rimane disponibile sotto la timeline in un pannello espandibile.
- **Pianificazione automatica trasferita:** il pannello di distribuzione delle task, già presente nell’Inbox, è ora nella pagina Sessioni come sezione espandibile, mantenendo i comandi e i controlli di programmazione originali.
- **Compatibilità:** nessuna modifica ai formati persistenti, alla sincronizzazione Dropbox, ai calcoli del Pomodoro e al plugin Obsidian. Nuovi asset `tempo-phase2.js` e `tempo-phase2.css` inclusi nella cache offline `tempo-pomodoro-v39`.
- **Test:** smoke test in Chromium per dashboard Oggi, avvio del planning contestuale, sessioni oltre mezzanotte, navigazione, mobile e offline.

## Interfaccia TEMPVS 3.0 — fase 1

- **Inserimento rapido ovunque:** il pulsante **+ Nuova task** nell'intestazione apre l'inserimento con sintassi completa; scorciatoia **N** quando non stai scrivendo in un campo. L'anteprima, la validazione e la creazione di eventuali sessioni sono quelle originali.
- **Un menu per aggiungere:** la freccia accanto al pulsante + offre scheda attività completa, inserimento multiplo, nuova sessione e gestione dei tag. I moduli di origine restano intatti e utilizzano gli stessi handler.
- **Navigazione semplificata:** Oggi, Inbox, Agenda e Sessioni sono le destinazioni principali. Statistiche e Impostazioni sono nel menu **Altro**, raggiungibili anche da mobile.
- **Agenda più leggibile:** liste intelligenti e filtri per area a sinistra (scorrimento orizzontale su schermi piccoli); viste Lista e Calendario in evidenza. Kanban, Timeline ed Eisenhower rimangono in **Altre viste**. Raggruppamento, ordinamento e strumenti di pianificazione sono disponibili dai menu contestuali.
- **Ricerca istantanea:** l'elenco reagisce durante la digitazione mantenendo il cursore nel campo.
- **Compatibilità:** nessuna modifica allo schema dei dati, al timer, al completamento manuale delle task, ai backup JSON/Dropbox o al plugin Obsidian. Nuovi asset `tempo-phase1.css` e `tempo-phase1.js`, inclusi nella cache offline versione 37.
- **Verifica:** il test browser include ora il nuovo inserimento rapido, tutte e cinque le viste, i dettagli, il backup, l'interfaccia mobile e la ricarica offline.

PWA installabile e utilizzabile offline per organizzare task, aree e sessioni Pomodoro.

## Aspetto — Quiet Focus

- Tema **Automatico**, **Chiaro** o **Scuro** e densità degli elenchi **Compatta**, **Normale**, **Confortevole**.
- Colori delle aree modificabili da **Impostazioni → Aspetto e colori**. Predefiniti: **Studio rosso**, **Lavoro verde**, **Personale giallo**.
- Colori delle priorità in stile semaforo: **Alta rossa**, **Media gialla**, **Bassa verde**, **Nessuna senza evidenziazione**.
- Navigazione laterale su desktop e inferiore su schermi stretti; pannello dettagli delle attività e indicatori di sincronizzazione.
- Le preferenze estetiche sono incluse nello stato salvato, nel backup JSON e nel backup Dropbox. I backup più vecchi mantengono la compatibilità e utilizzano i colori predefiniti.

## Agenda 2.0 (PWA)

- **Cinque viste integrate:** Lista compatta, Calendario (giorno/settimana/mese), Kanban, Timeline, matrice Eisenhower.
- **Liste intelligenti:** Oggi (task in scadenza, scadute e task collegate a sessioni odierne), Domani, Prossimi 7 giorni, Scadute, Senza data, Da riprogrammare, Tutte e Completate.
- Il Calendario distingue **scadenze delle task** e **sessioni Pomodoro** come livelli indipendenti. Permette di aprire/modificare le sessioni e spostarle di data con controlli sulle sovrapposizioni. Lo spostamento di una task cambia soltanto la sua scadenza.
- **Kanban:** passaggio manuale fra gli stati; **Eisenhower:** importanza e urgenza sono campi indipendenti dalle priorità !1–!4.
- **Sottotask strutturate:** indipendenti dalle checklist Markdown. Completare le sottotask non completa la task.
- **Dettagli:** pannello laterale desktop e layout adattato al mobile; colori delle aree conservati.
- Preferenze delle viste salvate localmente al dispositivo. Campi delle task e sottotask salvati nei backup JSON e Dropbox tramite il modello esistente.
- Questa branch non modifica il plugin Obsidian. Prima del merge in main occorre il collaudo funzionale completo nei browser target.

## Funzioni

- **Agenda attività (solo PWA):** task con area (Personale, Lavoro, Studio), priorità, descrizione, durata stimata in ore lorde e tag gerarchici (per esempio `Studio/Greco/Morfologia`). Stati manuali `Da fare`, `In corso`, `Completata`; filtri per area, stato, tag e ricerca.
- **Completamento esclusivamente manuale:** nessuna sessione, anche terminata o oltre la stima, può cambiare lo stato della task. Se un'attività viene completata mentre ha sessioni non terminate, l'utente sceglie esplicitamente se conservarle o eliminarle.
- **Avvisi di Agenda:** attività senza sessioni contrassegnate `Da pianificare`; attività ancora aperte senza blocchi futuri dopo almeno una sessione contrassegnate `Da riprogrammare`. Pannello di avviso e filtro dedicato; notifica di fine ultimo blocco se già autorizzata. Gli avvisi non modificano task o programmazione.
- Durante la creazione della task si può scegliere `Salva e programma` per passare direttamente alla prima sessione, mantenendo gli oggetti task e sessione separati.
- **Pianificazione dalle task:** ogni attività può generare uno o più blocchi collegati alle normali sessioni Pomodoro; l’utente sceglie data, ora, durata lorda in ore, intervalli di focus e pause facoltative. Il termine viene calcolato automaticamente; si impediscono le sovrapposizioni, mentre gli intervalli oltre mezzanotte sono supportati. Il pulsante **Avvia ora** inserisce subito un blocco di focus, salvo conflitti.
- Pianificazione di sessioni per data e intervallo orario, con riepilogo delle altre sessioni già presenti nella giornata.
- Cicli di concentrazione e pausa con rapporto automatico 5:1 (ad esempio 25 + 5 minuti).
- Possibilità di disattivare completamente le pause per ogni sessione o come preferenza predefinita.
- Timer che si riallinea all'orario reale quando la pagina torna attiva. Per l'avvio automatico la PWA deve restare aperta e il dispositivo deve essere attivo.
- Modalità focus a tutto schermo (richiede un'azione dell'utente).
- Notifiche di cambio fase, se il browser le supporta e l'utente concede il permesso.
- Suoni ambientali generati localmente tramite Web Audio API: rumore bianco, rumore marrone, pioggia e caminetto. Non richiedono servizi esterni e non sono veri file audio registrati.
- Salvataggio locale, backup/ripristino JSON ed esportazione delle sessioni in formato iCalendar `.ics`.

## Rapporto lavoro/pausa

La pausa viene calcolata come `round(durata_concentrazione / 5)`, con una durata minima di un minuto. Per esempio, 25 minuti di concentrazione generano 5 minuti di pausa. Disattivando le pause, l'intera finestra programmata è trattata come un unico intervallo di concentrazione.

## TickTick e calendari

Il file `.ics` contiene anche i blocchi di attività programmati come normali sessioni. Non esporta task non programmate. Il file `.ics` contiene le sessioni programmate come eventi di calendario. Può essere importato in un'app calendario compatibile. TickTick può mostrare calendari locali su iOS/macOS e sottoscrivere calendari esterni tramite URL; l'esportazione locale da TEMPVS non crea da sola una sincronizzazione automatica o bidirezionale con TickTick. L'importazione non crea registrazioni native del timer Pomodoro di TickTick.

## Installazione su GitHub Pages

1. Carica tutti i file nella root del repository.
2. In GitHub apri **Settings → Pages**.
3. Seleziona il branch principale e la cartella `/ (root)`.
4. Apri l'indirizzo Pages in HTTPS e installa la PWA dal browser.

## Aggiornamento dopo una modifica

Il service worker usa una cache versionata (attualmente `tempo-pomodoro-v38`). Ad ogni rilascio occorre incrementare il numero della cache in `sw.js` per rinnovare anche i file CSS e JavaScript.

## Limiti

- Una PWA statica non può garantire timer, notifiche o avvio di sessioni con l'app completamente chiusa o il dispositivo in sospensione.
- La riproduzione audio richiede un'interazione iniziale dell'utente e può essere sospesa dal sistema operativo in background.
- I dati sono memorizzati localmente nel browser: usa periodicamente il backup JSON per conservarli o trasferirli su un altro dispositivo. Il backup versione 3 include task e sessioni e può leggere i vecchi backup versione 2 (senza task).
- **Durata stimata = tempo lordo**: pianificare 2 ore occupa 2 ore di calendario, pause comprese. Il tempo netto di concentrazione è distinto.
- Quando contrassegni manualmente una task come completata, puoi scegliere se conservare o annullare i blocchi non ancora terminati. Eliminare una task rimuove i blocchi futuri e scollega quelli passati.

## Architettura condivisa

### Assegnazione dei Pomodori alle task

Nella pagina Sessioni, **＋ Task** e **Riempi le sessioni del giorno** propongono una distribuzione delle task dell'area. Le task selezionate condividono equamente i Pomodori disponibili; una stima residua breve limita i Pomodori assegnati a quella task, lasciando gli altri alle attività più lunghe. Le stime sono lorde, comprese le pause.

L'unità minima è **un intero periodo di concentrazione** configurato per la sessione (con la pausa prevista, se presente), non un intervallo arbitrario di 15 minuti. L'eventuale periodo di concentrazione finale troppo breve rimane non assegnato. L'anteprima consente di personalizzare singolarmente ogni Pomodoro prima di confermare. Le assegnazioni non completano automaticamente le task e non modificano il timer né l'orario della sessione.

La gestione delle attività PWA è in `agenda.js` e `core/tempo-tasks.js`; **non è integrata nel plugin Obsidian**. La logica indipendente dalla piattaforma è in `core/tempo-core.js`: validazione e normalizzazione delle sessioni, calcolo delle pause, individuazione delle sessioni attive/prossime e calcolo della fase Pomodoro. La PWA importa direttamente questo modulo ES; il service worker include il modulo nella cache offline.

La cartella `obsidian/` contiene l'integrazione iniziale per Obsidian. Il plugin usa lo stesso core, ma salva i propri dati tramite l'API di persistenza di Obsidian (`data.json` del plugin). I dati PWA in `localStorage` e quelli Obsidian sono separati: non c'è sincronizzazione automatica tra i due ambienti.

### Installazione con BRAT

In Obsidian apri **BRAT → Add Beta plugin** e inserisci `huliostiltskin95/pomo-wpa` (oppure l’URL del repository), quindi aggiungi e abilita **Tempo — Pomodoro**.

La release **0.5.6** include la nuova interfaccia TEMPVS: avanzamento del timer, durate rapide, pianificazione guidata, pomodori lordi con `-60m` e pannelli interattivi. Se il plugin è già installato, esegui **BRAT: Check for updates to all beta plugins and UPDATE** e ricaricalo se richiesto.

### Build del plugin Obsidian

Requisiti: Node.js e npm. Esegui dalla radice del repository:

```bash
npm install
npm run build:obsidian
```

La build genera `main.js`, `manifest.json` e `styles.css` in `obsidian/dist/`. Per installare manualmente, copia i tre file in `.obsidian/plugins/tempo-pomodoro/` nel vault, mantenendo l’eventuale `data.json`. Poi abilita **Tempo — Pomodoro** da **Impostazioni → Plugin comunitari**.

Sorgente attuale: `obsidian/main.js`. Il vecchio entry point TypeScript non è usato per le release BRAT. Istruzioni e verifiche dell’interfaccia: [obsidian/UI-TESTING.md](obsidian/UI-TESTING.md).

### Funzioni attualmente disponibili nel plugin

- Pannello laterale Tempo con timer aggiornato ogni secondo e indicazione della sessione attiva o della prossima.
- Creazione di sessioni con data, orari, durata di concentrazione e pause automatiche 5:1 facoltative.
- Controllo delle sovrapposizioni e validazione dei dati.
- Elenco delle sessioni future e possibilità di eliminarle.
- Preferenze predefinite persistenti e comandi Obsidian per aprire il pannello o creare una sessione.

La nuova Agenda task è una funzione esclusiva della PWA. L’integrazione Obsidian non viene modificata in questa fase.


## Test automatici

Il core condiviso è coperto da test Node.js per validazione di date e orari, rilevamento delle sovrapposizioni (incluse quelle annidate), rapporto lavoro/pausa e calcolo delle fasi Pomodoro. I test vengono eseguiti da GitHub Actions insieme al controllo sintattico della PWA e alla build del plugin Obsidian.


## Stato delle attività e avvisi

La durata stimata non determina la conclusione: l'attività può essere completata prima, dopo, oppure richiedere ulteriori sessioni. Anche la fine delle sessioni non marca mai la task come Completata o In corso: **lo stato cambia solo se lo imposti tu**. L'Agenda distingue le attività senza sessioni da quelle da riprogrammare perché l'ultima sessione è già terminata; non manda notifiche ripetute per i vecchi impegni. Se il browser dispone già del permesso, può segnalare con notifica la conclusione dell'ultimo blocco senza alterare alcun dato. Le notifiche, come i timer, non funzionano a PWA completamente chiusa.


## Timer semplice — Focus, colori e cicli personalizzati

Nella PWA semplificata (pagina **Timer**):

- **Schermo intero**: durante una sessione usa **Schermo intero** per mostrare timer, fase e comandi essenziali. **Esci da schermo intero** o `Esc` per tornare all'app. Il layout immersivo funziona anche dove l'API Fullscreen non è disponibile (ad esempio su alcuni browser iOS).
- **Colori delle aree**: da **Impostazioni → Aree e risorse** scegli un'area e imposta il suo colore. Il colore accompagna il timer e l'elenco delle sessioni ed è conservato nei backup JSON e nella sincronizzazione Dropbox.
- **Durata flessibile**: scegli i minuti di **focus per ciclo** (da 1 a 240, anche valori non standard). La pausa automatica è calcolata come circa un quinto del focus, arrotondata ai minuti (es. 40+8; 50+10; 90+18). L'opzione per disattivare le pause resta nelle impostazioni.
- **Durata lorda distinta**: il numero `@` indica sempre quanto spazio occupa la sessione nel calendario, **pause comprese**; la durata di concentrazione di ogni ciclo è indipendente e non sposta gli orari programmati.

Inserimento rapido (il suffisso `~40m` è facoltativo e può precedere o seguire `+HH:MM`):

```text
Lavoro @1,5h +08:30 ~40m
Studio @1h +13:45
Studio @2h +17:30 ~50m
```

Il campo **Focus predefinito** nella pagina Sessioni si applica alle righe senza `~`; le preferenze globali si applicano alle nuove sessioni, senza modificare quelle esistenti. Le pause sono interne alla durata lorda e vengono registrati soltanto i minuti effettivamente osservati in fase di concentrazione.

### Pausa personalizzata nelle sessioni

Nel timer immediato e nell’inserimento rapido scegli **Pausa → Personalizzata** e indica i minuti. La pausa finale è sottratta dal tempo lordo: **45 minuti con 5 di pausa = 40 di concentrazione + 5 di pausa**, senza modificare la fine programmata. Con 0 minuti non ci sono pause; la modalità automatica mantiene i cicli esistenti.

La sintassi rapida accetta `Studio @45m +09:00 !5m`; `!5m` prevale sulla scelta del modulo per quella riga. Se la richiesta è divisa fra più fasce, i 5 minuti restano un unico totale, distribuito a partire dalla fine dell’ultimo frammento. Il pulsante **Pausa** nella lista consente di modificare le sessioni prima dell’inizio: inserisci minuti oppure `auto`. Le preferenze della sessione sono conservate nel backup e nella sincronizzazione Dropbox.

### Pianificazione veloce a tabella

La pianificazione ora usa una riga per sessione: area, minuti lordi, collocazione nelle fasce o orario fisso, pausa automatica/personalizzata/nessuna e riepilogo immediato. In modalità automatica, **Ciclo** consente di modificare il focus della singola riga rispetto al valore comune. Le sovrapposizioni, le pause non valide e la disponibilità insufficiente sono segnalate durante la compilazione. Ogni modifica invalida la proposta precedente: scegli **Prepara programma**, controlla gli orari e poi **Conferma programma**.

**Incolla più sessioni** conserva la sintassi rapida e aggiunge le righe alla tabella senza salvarle nel calendario. Un errore nel testo non importa righe parziali. Sugli schermi stretti la tabella diventa una serie di schede con gli stessi campi. Le sessioni già salvate restano invariate.

### Pomodori con durata lorda (0.5.5)

`Studio @2h +14:00 -60m` riserva due ore totali e imposta cicli di 60 minuti, pausa compresa: **50 focus + 10 pausa, 50 focus + 10 pausa**, dalle 14:00 alle 16:00. `@` indica la durata totale della sessione; `-` quella di ogni pomodoro. Nel plugin Obsidian puoi usare anche il campo **Pomodoro lordo · minuti** della pianificazione guidata.

Il rapporto focus/pausa è 5:1, arrotondato ai minuti interi mantenendo esatta la durata lorda (es. `-45m` → 38/7). Sono accettati da 2 a 288 minuti; se il totale della sessione non contiene cicli interi, l’ultimo termina all’orario finale. Un ciclo lordo esplicito include sempre la pausa e non si combina con `~focus` o `!pausa finale`. Le righe precedenti senza `-` mantengono il comportamento esistente. Il parser condiviso e la tabella PWA conservano lo stesso ciclo nelle importazioni.

### Correzioni di affidabilità (0.5.6)

Build Obsidian unificata, correzione della conversione fra pomodoro lordo e pausa finale, protezione dei dati già salvati dagli errori cloud e annullamento delle risposte Dropbox dopo scollegamento/unload. Dettagli e verifiche: [revisione del codice](docs/CODE-REVIEW-0.5.6.md). `npm test` esegue ora tutti i test del core (`.mjs` e `.js`).
