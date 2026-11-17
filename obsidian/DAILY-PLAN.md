## 0.5.15 · note collegate alle sessioni

Nel blocco TEMPVS della nota quotidiana aggiungi uno o più wikilink dopo gli orari:

```TEMPVS
Studio +11:15-12:15 -30m [[Appunti|Lettura]] [[personal-management#Serie TV|Serie TV]]
```

Le note collegate non richiedono un blocco TEMPVS né una stima. Ogni sessione generata dalla riga conserva tutti i link, alias e riferimenti a sezioni o blocchi. Nel pannello laterale i titoli sono cliccabili; Ctrl/Cmd-clic apre in una nuova scheda. Aggiungere o rimuovere soltanto link conserva il tempo già misurato. I collegamenti sono risorse: non assegnano automaticamente credito alle stime delle note.

## 0.5.14 · la nota quotidiana guida l’agenda

Il blocco della daily note è il riferimento per la pianificazione di quella giornata. Al salvataggio, all’avvio e dopo un ripristino Dropbox il plugin riconcilia gli intervalli della nota con l’archivio: le vecchie prenotazioni della stessa giornata non possono bloccare un blocco valido con il messaggio «Le righe si sovrappongono a una sessione della giornata».

Le prenotazioni future non presenti nel blocco vengono rimosse con i normali identificativi di cancellazione. I vecchi intervalli avviati o conclusi vengono ritirati dall’agenda e non possono continuare ad azionare il timer o essere riscritti nel codice. I dati precedenti restano nella sessione archiviata (`dailyOriginal`); se un vecchio intervallo viene sostituito da un nuovo intervallo sovrapposto, il suo credito viene azzerato per evitare il doppio conteggio. Il lavoro passato non sovrapposto continua a essere conservato nello storico. Le altre giornate non vengono alterate; un intervallo effettivamente collegato a un’altra daily note non viene sovrascritto silenziosamente.

Sono sempre rifiutate le sovrapposizioni tra le righe della nota stessa. Un testo incompleto o non valido non modifica l’archivio. I file con il blocco corretto vengono riconciliati anche dopo l’aggiornamento del plugin, senza dover riscrivere le righe. Le aggiunte intenzionali dal pannello conservano l’aggiornamento bidirezionale già presente; gli archivi ricevuti da Dropbox vengono invece adattati alle note locali, senza reinserire vecchi slot nel testo.

L’agenda mostra anche gli intervalli conclusi della giornata selezionata. Il timer segue la sessione in corso; in attesa mostra area, focus previsto e inizio della prossima sessione. Un intervallo concluso esteso esplicitamente fino all’ora corrente torna operativo secondo gli orari corretti; lasciare il blocco invariato non riapre sessioni concluse manualmente.

Il caso dello screenshot è verificato con:

```TEMPVS
date: 2026-11-15
Personale +01:26-01:56 -30m
Studio +15:00-16:00 -60m
Svago +18:30-21:00 -120m
Studio +21:00-23:00 -60m
```

Risultato: cinque sessioni. La fascia Svago riserva 18:30–20:30 (100 minuti di focus e 20 di pausa) e lascia 30 minuti liberi, secondo la politica delle sessioni intere. Alle 20:25 il timer indica Pausa, Svago, 05:00; seguono Studio 21:00–22:00 e 22:00–23:00. I test includono vecchie sessioni sovrapposte, migrazione di collegamenti invariati, ripristino remoto, assenza di doppio credito, lettura del buffer non ancora salvato e UI del bundle con API Obsidian simulate. Non è un collaudo su un dispositivo iPad reale.

---

## 0.5.13 · correzione del tempo effettivo

Gli intervalli dei blocchi giornalieri si possono inserire e correggere anche dopo l'orario indicato. Le nuove righe trascorse e le righe trascorse modificate vengono registrate come lavoro svolto: il totale effettivo comprende solo il focus, al netto delle pause della sessione. Per esempio, `Studio +10:00-12:00 -30m` interamente trascorso registra 100 minuti di concentrazione con il rapporto 5:1.

Una fascia già presente e lasciata invariata conserva il tempo registrato dal timer: riaprire una nota non completa automaticamente tutta la pianificazione passata. Le righe future restano programmazione, con zero lavoro attribuito automaticamente. Per intervalli ancora in corso viene registrata solo la parte già trascorsa; il timer prosegue dal nuovo orario e una sospensione esistente resta attiva.

Le correzioni delle righe semplici conservano gli ID tramite il confronto con l'ultima versione del blocco. Se una fascia viene accorciata o cambia il numero di sessioni, gli slot sostituiti non sommano altro lavoro al totale: restano nell'archivio con credito azzerato e copia dei dati precedenti (`manualOriginal`). Le correzioni sono riconoscibili da `actualSource: manual` e dalla data `manualRecordedAt`; i campi sono preservati nei backup e in Dropbox. Eliminare del tutto una riga storica continua invece a nasconderla dal pianificatore, conservandone il lavoro registrato.

Lo storico associato viene aggiornato senza duplicare il credito. Se la sessione aveva lavoro assegnato a più note, i crediti vengono ridimensionati proporzionalmente mantenendo la quota non assegnata; se non aveva crediti e ha una nota assegnata, la correzione viene attribuita a quella nota. Il completamento delle note resta manuale. Le sovrapposizioni con altre prenotazioni o con lavoro registrato sono rifiutate, senza modificare l'archivio.

La sincronizzazione mantiene il comportamento automatico delle versioni recenti: modifica le righe nel codice Markdown e attendi il salvataggio. Il riquadro mostra i minuti effettivi degli intervalli con correzioni manuali. Le sintassi delle stime `@Studio 20 -30m` restano separate e non creano registrazioni di lavoro soltanto modificando una stima.

Verifiche: test unitari per correzioni retroattive, intervalli in corso, pause, mezzanotte, riduzione/estensione delle fasce, ID, storico, progresso delle note, duplicati e importazione invariata; test del controller automatico e del bundle UI con API Obsidian simulate. Il collaudo su un'installazione Obsidian/iPad reale resta da fare.

---

# Pianificazione automatica nella nota giornaliera

Da TEMPVS 0.5.9 è sufficiente un solo blocco per nota:

```TEMPVS
Studio +14:00-16:00 -60m
Personale +16:00-17:00 -60m
Studio +18:00-20:00 -60m
```

`-60m` è la durata lorda di ogni sessione, pause comprese. La prima riga crea due sessioni. Ogni sessione ha una fase di concentrazione e una pausa finale, calcolate automaticamente in rapporto esatto 5:1: -60m → 50 + 10, -30m → 25 + 5, -45m → 37 min 30 s + 7 min 30 s. Le impostazioni generali non cambiano questo rapporto. Le sessioni future già importate vengono corrette; quelle avviate o concluse lasciate invariate mantengono i dati originali. Una correzione esplicita aggiorna il tempo effettivo (0.5.13). Gli eventuali minuti insufficienti per un'altra sessione intera restano liberi e sono segnalati.

Modifica direttamente il blocco nell'editor della nota. Dopo circa 350 ms di quiete, anche prima del salvataggio automatico, le sessioni vengono aggiornate senza anteprima o conferma. Aggiunte, rimozioni e modifiche dal pannello del plugin si riflettono nello stesso blocco. Le fasce contigue equivalenti sono raggruppate. Il resto della nota non viene modificato.

La visualizzazione del blocco contiene soltanto testo e stato della sincronizzazione. Non vengono inseriti commenti identificativi o date automatiche nel testo. La data è ricavata dal nome della daily note, dal frontmatter `date` o dal formato configurato in Daily Notes. La direttiva facoltativa `date: YYYY-MM-DD` resta compatibile. Anche i vecchi commenti identificativi vengono letti e rimossi alla prima sincronizzazione.

Le righe incomplete o errate restano nella nota; l'archivio precedente viene conservato e l'errore viene mostrato sotto il blocco. Le modifiche non ancora salvate nell'editor vengono lette direttamente e non vengono sovrascritte. Il pannello segue la data della nota attiva quando aggiorni il blocco; gli errori compaiono anche nel pannello. Le sessioni iniziate o concluse restano conservate nello storico anche quando rimuovi le relative righe dal blocco; non impediscono la nuova programmazione. Un blocco svuotato rimuove le sessioni future collegate; rimuovere l'intero blocco non cancella l'archivio.

La sincronizzazione funziona anche con la nota chiusa, mentre Obsidian è aperto. All'avvio vengono lette le note Markdown con blocchi TEMPVS. Il comando di scollegamento sospende la sincronizzazione della nota per la sessione corrente e conserva le sessioni; per non ricollegarla al successivo avvio, togli l'etichetta TEMPVS dal blocco.

Aggiornamento: usa BRAT sul repository `huliostiltskin95/pomo-wpa`.

Da 0.5.10 è accettata anche l’etichetta TEMPUS (o tempus).

## Stime nelle note di lavoro

In una nota ordinaria (senza data), un blocco `TEMPVS` o `tempus` può contenere:

```TEMPVS
@Studio 20 -30m
@Studio 10 -60m
```

Ogni riga aggiunge un numero di sessioni della durata lorda indicata. Le due righe si sommano: 30 sessioni, 20 ore lorde, 16 ore e 40 minuti di concentrazione. Il rapporto lavoro/pausa è sempre 5:1. Si possono usare più aree, purché esistano nelle impostazioni. Un solo blocco per nota; stime e orari giornalieri vanno in note separate.

La nota e il pannello «Note e stime» mostrano il lavoro registrato, il residuo netto e lordo e le sessioni equivalenti ancora necessarie. Le equivalenze da 30 o 60 minuti sono alternative sullo stesso residuo, non quantità da sommare. L’ultima sessione equivalente può servire solo parzialmente.

Per attribuire il lavoro, scegli la nota nel menu della sessione giornaliera, usa «Assegna alle sessioni libere del giorno» nel pannello (giorno selezionato), oppure avvia una sessione dalla stima. L’assegnazione giornaliera interessa solo sessioni future, libere e della stessa area; non sostituisce assegnazioni ad altre note. Il numero stimato non crea automaticamente prenotazioni in calendario.

L’avanzamento comprende la concentrazione registrata dal timer e, da 0.5.13, le correzioni manuali degli intervalli con lavoro assegnato alla nota. Pause, sospensione, sonno del dispositivo, sessioni saltate e semplice programmazione non contano. Cambiare la nota di una sessione attribuisce soltanto il lavoro successivo alla nuova nota: quello già registrato resta alla precedente. «Segna completata» è una decisione manuale e non conclude le sessioni in calendario.

La proiezione giornaliera considera tutto il focus ancora disponibile nelle sessioni programmate per le aree della nota nel giorno visualizzato, anche se assegnate ad altre note: è l’ipotesi «se dedicassi tutti questi slot a questa attività», non una modifica della programmazione. Non assume una giornata lavorativa di durata arbitraria. In mancanza di slot, la proiezione non viene calcolata.

Modificare il blocco aggiorna la stima conservando l’avanzamento. Rimuovere il blocco nasconde la stima ma conserva i dati; reinserirlo nello stesso file la ripristina. Rinominare o spostare la nota mentre Obsidian è aperto conserva l’identità. Le stime, le assegnazioni e i progressi sono inclusi nel backup e nella sincronizzazione Dropbox; sono visibili anche nella PWA, che non legge direttamente i file del vault. La PWA permette di assegnare le note sincronizzate alle sessioni e registrarne il lavoro.
