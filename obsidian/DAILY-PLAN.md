# Pianificazione automatica nella nota giornaliera

Da TEMPVS 0.5.9 è sufficiente un solo blocco per nota:

```TEMPVS
Studio +14:00-16:00 -60m
Personale +16:00-17:00 -60m
Studio +18:00-20:00 -60m
```

`-60m` è la durata lorda di ogni sessione, pause comprese. La prima riga crea due sessioni. Ogni sessione ha una fase di concentrazione e una pausa finale, calcolate automaticamente in rapporto esatto 5:1: -60m → 50 + 10, -30m → 25 + 5, -45m → 37 min 30 s + 7 min 30 s. Le impostazioni generali non cambiano questo rapporto. Le sessioni future già importate vengono corrette; quelle avviate o concluse mantengono i dati originali. Gli eventuali minuti insufficienti per un'altra sessione intera restano liberi e sono segnalati.

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

L’avanzamento misura solo la concentrazione effettivamente registrata mentre l’app è attiva. Pause, sospensione, sonno del dispositivo, sessioni saltate e semplice programmazione non contano. Cambiare la nota di una sessione attribuisce soltanto il lavoro successivo alla nuova nota: quello già registrato resta alla precedente. «Segna completata» è una decisione manuale e non conclude le sessioni in calendario.

La proiezione giornaliera considera tutto il focus ancora disponibile nelle sessioni programmate per le aree della nota nel giorno visualizzato, anche se assegnate ad altre note: è l’ipotesi «se dedicassi tutti questi slot a questa attività», non una modifica della programmazione. Non assume una giornata lavorativa di durata arbitraria. In mancanza di slot, la proiezione non viene calcolata.

Modificare il blocco aggiorna la stima conservando l’avanzamento. Rimuovere il blocco nasconde la stima ma conserva i dati; reinserirlo nello stesso file la ripristina. Rinominare o spostare la nota mentre Obsidian è aperto conserva l’identità. Le stime, le assegnazioni e i progressi sono inclusi nel backup e nella sincronizzazione Dropbox; sono visibili anche nella PWA, che non legge direttamente i file del vault. La PWA permette di assegnare le note sincronizzate alle sessioni e registrarne il lavoro.
