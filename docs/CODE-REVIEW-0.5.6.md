# Revisione TEMPVS 0.5.6

Analisi mirata del core condiviso, persistenza PWA/Obsidian, pianificazione, ciclo di vita Dropbox, audio e build. Le correzioni preservano dati e sintassi esistenti.

## Criticità corrette

1. **Build Obsidian incoerenti (alta)** — `cd obsidian && npm run build` compilava il vecchio `main.ts` sopra il sorgente attuale `main.js`. Ora tutti gli entry point usano un’unica configurazione, producono `obsidian/dist/` e conservano il sorgente. La directory di lavoro esplicita rende identico il bundle dalla radice e dalla sottocartella. Il workflow di validazione carica il pacchetto compilato corretto.
2. **Archivio non caricabile dopo la modifica di una pausa (alta)** — passando da un pomodoro lordo a una pausa finale nella PWA, rimanevano insieme `cycleMinutes` e `customBreakMinutes`, una combinazione rifiutata dal validatore. La conversione elimina il ciclo precedente; il test browser verifica modifica e riapertura dell’archivio.
3. **Disallineamento fra memoria e archivio salvato (alta)** — gli errori successivi al salvataggio locale, come l’impossibilità di salvare i metadati Dropbox, annullavano la modifica soltanto in memoria. Ora il rollback riguarda il salvataggio locale fallito. Gli errori cloud successivi conservano i dati e vengono segnalati. Il plugin rifiuta inoltre mutazioni sovrapposte durante un salvataggio, evitando rollback incrociati.
4. **Risposte Dropbox dopo scollegamento o unload (alta)** — una richiesta già partita poteva ancora applicare il download. Le risposte e la lettura dei loro corpi sono ora associate alla generazione del client; scollegamento e distruzione invalidano le risposte tardive. L’unload cancella anche il timer di sincronizzazione senza cancellare le credenziali salvate. Lo scollegamento elimina l’autorizzazione PKCE pendente.
5. **Conferma audio errata (media)** — la PWA trattava la Promise di riproduzione come un esito positivo; ora attende il risultato. Inoltre il cooldown del segnale si azzera quando viene creato un nuovo AudioContext.
6. **Richieste di pianificazione non validate dal core (media)** — valori non finiti, frazionari, fuori intervallo, aree vuote e orari malformati potevano raggiungere lo scheduler tramite chiamate dirette. Ora vengono rifiutati prima dell’allocazione, anche senza fasce disponibili.

## Ridondanze rimosse

- Configurazioni di build divergenti e dipendenze TypeScript non usate nella build attuale.
- Test `.test.js` esclusi dal normale `npm test`, poi ripetuti separatamente in alcuni workflow: il comando standard include entrambi i formati.
- Import inutilizzato e ramo di anteprima relativo a un modulo non più esistente.
- Messaggio «Area aggiornata» mostrato anche quando il salvataggio falliva.

## Verifica

Test automatici del core, simulazione API Obsidian, build da entrambi i percorsi e compatibilità dell’entry point precedente. Test Chromium dei flussi Obsidian e PWA, inclusi modifica della pausa con ricaricamento e simulazione di quota esaurita per i soli metadati cloud.

I test Dropbox usano risposte controllate, senza accesso all’account reale. La simulazione Obsidian non sostituisce una prova su desktop/iPad. I vecchi moduli PWA e `main.ts` sono conservati come riferimento storico; nessuna build corrente li usa come entry point.
