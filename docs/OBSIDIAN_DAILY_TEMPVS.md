# TEMPVS nelle daily note — plugin 0.5.8

## Utilizzo

Aggiorna il plugin con **BRAT: Check for updates to all beta plugins and UPDATE** e ricaricalo. Nella daily note inserisci:

````markdown
```TEMPVS
Studio +10:00-12:00 -30m
```
````

In lettura e Live Preview il blocco mostra le sessioni della giornata, i loro orari e le pause. **Prepara modifiche** mostra la proposta; **Applica alla nota e al plugin** salva la pianificazione in entrambi. L'esempio genera quattro sessioni lorde di 30 minuti (con impostazioni 25/5, ognuna contiene 25 minuti di focus e 5 di pausa). Il blocco salvato si espande in una riga per sessione.

Per modificare le righe usa **Modifica righe**, poi prepara e conferma nuovamente. Puoi anche modificare il codice direttamente nell'editor Markdown e confermarlo dal blocco renderizzato. Una riga incompleta o non valida non modifica le sessioni. La preview indica gli eventuali minuti finali lasciati liberi: non vengono create sessioni accorciate.

Se hai già pianificato dal pannello del plugin, **Includi sessioni del giorno** prepara il testo corrispondente e lo collega alla nota dopo la conferma. Le sessioni identiche già esistenti vengono riconosciute e conservano il loro ID; non vengono duplicate.

Dopo il primo collegamento, nuove sessioni, eliminazioni di sessioni future e modifiche delle aree fatte nel plugin aggiornano le righe della nota. I dati ricevuti da Dropbox vengono riconciliati allo stesso modo. Il testo viene aggiornato solo quando coincide ancora con l'ultima versione confermata: una bozza scritta nella nota resta intatta e richiede una nuova preview. Il campo di modifica delle righe rimane anch'esso intatto durante gli aggiornamenti del pannello.

Le sessioni già avviate, concluse o con tempo registrato sono mostrate ma non riprogrammabili né eliminabili tramite il blocco. Non vengono alterati il focus effettivamente misurato, lo storico o lo stato delle task.

## Data e sintassi

La data è ricavata, in ordine, da:

1. Una riga esplicita `date: YYYY-MM-DD` nel blocco.
2. Il titolo della nota in formato `YYYY-MM-DD`.
3. La proprietà YAML `date` della nota.
4. Il formato delle daily note configurato nel plugin integrato **Daily notes** di Obsidian.

Se la data non è riconoscibile, il blocco mostra come indicarla:

````markdown
```TEMPVS
date: 2026-11-16
Studio +10:00-12:00 -30m
Lavoro +14:00-17:00 -1,5h
Personale +23:50-01:00 -30m
```
````

L'ultima istruzione genera due sessioni intere da 30 minuti, associate correttamente ai due giorni, lasciando 10 minuti liberi. Una data canonica resta scritta nel blocco dopo la conferma, così rinominare il file non sposta implicitamente la pianificazione.

Sono supportate la grammatica per fasce della PWA e la precedente `Studio @1h +14:00`, compresi i modificatori storici di focus/ciclo/pausa. Le pause automatiche seguono le impostazioni; la durata resta lorda. Per sessioni esistenti la forma breve per fasce conserva le impostazioni di pausa della sessione. Nuove sessioni nel passato, righe sovrapposte, identificativi duplicati e riferimenti a sessioni eliminate vengono rifiutati.

## Collegamenti e protezione dei dati

Il blocco canonico contiene commenti generati `tempvs-block` e `tempvs-session`: mantengono stabile il collegamento anche cambiando area, nome o orario. Questi commenti sono nascosti nel riquadro e nel suo editor di righe; restano visibili nel codice Markdown. Non copiarli in altre note e non modificarli manualmente. Le righe che iniziano il giorno successivo riportano il suffisso visibile `+1d`, conservato anche nell'editor delle righe. Puoi usarlo per aggiungere una nuova sessione dopo mezzanotte.

È previsto un solo blocco collegato per data. Un secondo blocco può mostrare le sessioni, ma non acquisire quelle già possedute da un altro blocco. Il comando **Inserisci blocco TEMPVS nella nota** aggiunge il blocco vuoto nell'editor attivo. **Scollega TEMPVS dalla nota attiva (conserva sessioni)** rimuove l'associazione locale senza eliminare né le sessioni né il testo: è utile anche dopo aver rimosso il blocco dalla nota.

I collegamenti sessione/blocco sono conservati nell'archivio condiviso; il percorso locale del file e il testo dell'ultima versione confermata sono salvati separatamente nei dati del plugin, senza inviarli a Dropbox. Su un altro dispositivo Obsidian occorre confermare il blocco una prima volta per collegarlo a quel vault. Il plugin usa poi gli stessi ID, senza ricreare le sessioni.

Le sostituzioni usano `Vault.process` con confronto del testo atteso. Una modifica concorrente alla nota o alla pianificazione invalida la preview. Il salvataggio della nota precede quello delle sessioni; se quest'ultimo fallisce, il testo precedente viene ripristinato solo se il file non è stato modificato nel frattempo. In caso contrario viene mostrato un errore e non viene sovrascritta la modifica più recente. Le scritture del controller sono serializzate.

Rimuovere righe future da un blocco collegato richiede una preview e crea i tombstone di cancellazione già utilizzati da Dropbox. Eliminare l'intero blocco/file non elimina automaticamente sessioni o storico. I file e gli altri blocchi della nota vengono preservati; sono supportati recinti Markdown di backtick o tilde, linguaggio `TEMPVS`/`tempvs` e terminatori LF/CRLF. Esempi annidati dentro un altro recinto di codice non vengono interpretati. I blocchi devono essere al livello principale della nota, fuori da citazioni o liste indentate.

## Verifica

- `tests/obsidian-daily.test.mjs`: date, recinti, CRLF, parser, durata lorda, mezzanotte, ID, adozione di sessioni esistenti, cancellazioni, pause e protezione delle sessioni avviate.
- `tests/obsidian-runtime.smoke.mjs`: bundle reale con adattatore Obsidian/vault simulato; conferme ripetute, riavvio, aggiornamento bidirezionale, bozza preservata, preview concorrenti, errori su file/archivio, ripristino e scollegamento.
- `tests/obsidian-ui.e2e.mjs`: bundle reale in Chromium con shim delle API/DOM Obsidian; codice `TEMPVS` maiuscolo, modifica delle righe, ID nascosti, sincronizzazione pannello/nota e layout da 280 a 768 px.

Queste verifiche non equivalgono a un collaudo dentro una vera installazione Obsidian su desktop o iPad: il comportamento delle API è simulato. Non sono stati modificati il timer PWA o il suo service worker per questa funzione.
