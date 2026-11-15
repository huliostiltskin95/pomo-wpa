# Pianificazione automatica nella nota giornaliera

Da TEMPVS 0.5.9 è sufficiente un solo blocco per nota:

```TEMPVS
Studio +14:00-16:00 -60m
Personale +16:00-17:00 -60m
Studio +18:00-20:00 -60m
```

`-60m` è la durata lorda di ogni sessione, pause comprese. La prima riga crea due sessioni. Le impostazioni delle pause restano quelle del plugin; per le sessioni già riconosciute vengono conservate. Gli eventuali minuti insufficienti per un'altra sessione intera restano liberi e sono segnalati.

Modifica direttamente il blocco nell'editor della nota. Dopo circa 350 ms di quiete, anche prima del salvataggio automatico, le sessioni vengono aggiornate senza anteprima o conferma. Aggiunte, rimozioni e modifiche dal pannello del plugin si riflettono nello stesso blocco. Le fasce contigue equivalenti sono raggruppate. Il resto della nota non viene modificato.

La visualizzazione del blocco contiene soltanto testo e stato della sincronizzazione. Non vengono inseriti commenti identificativi o date automatiche nel testo. La data è ricavata dal nome della daily note, dal frontmatter `date` o dal formato configurato in Daily Notes. La direttiva facoltativa `date: YYYY-MM-DD` resta compatibile. Anche i vecchi commenti identificativi vengono letti e rimossi alla prima sincronizzazione.

Le righe incomplete o errate restano nella nota; l'archivio precedente viene conservato e l'errore viene mostrato sotto il blocco. Le modifiche non ancora salvate nell'editor vengono lette direttamente e non vengono sovrascritte. Il pannello segue la data della nota attiva quando aggiorni il blocco; gli errori compaiono anche nel pannello. Le sessioni iniziate o concluse restano conservate nello storico anche quando rimuovi le relative righe dal blocco; non impediscono la nuova programmazione. Un blocco svuotato rimuove le sessioni future collegate; rimuovere l'intero blocco non cancella l'archivio.

La sincronizzazione funziona anche con la nota chiusa, mentre Obsidian è aperto. All'avvio vengono lette le note Markdown con blocchi TEMPVS. Il comando di scollegamento sospende la sincronizzazione della nota per la sessione corrente e conserva le sessioni; per non ricollegarla al successivo avvio, togli l'etichetta TEMPVS dal blocco.

Aggiornamento: usa BRAT sul repository `huliostiltskin95/pomo-wpa`.

Da 0.5.10 è accettata anche l’etichetta TEMPUS (o tempus).
