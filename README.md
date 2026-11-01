# TEMPVS

PWA installabile e utilizzabile offline per programmare finestre di concentrazione.

## Funzioni

- **Agenda attività (solo PWA):** task con area (Personale, Lavoro, Studio), priorità, descrizione, durata stimata in ore nette di focus e tag gerarchici (per esempio `Studio/Greco/Morfologia`). Stati manuali `Da fare`, `In corso`, `Completata`; filtri per area, stato, tag e ricerca.
- **Completamento esclusivamente manuale:** nessuna sessione, anche terminata o oltre la stima, può cambiare lo stato della task. Se un'attività viene completata mentre ha sessioni non terminate, l'utente sceglie esplicitamente se conservarle o eliminarle.
- **Avvisi di Agenda:** attività senza sessioni contrassegnate `Da pianificare`; attività ancora aperte senza blocchi futuri dopo almeno una sessione contrassegnate `Da riprogrammare`. Pannello di avviso e filtro dedicato; notifica di fine ultimo blocco se già autorizzata. Gli avvisi non modificano task o programmazione.
- Durante la creazione della task si può scegliere `Salva e programma` per passare direttamente alla prima sessione, mantenendo gli oggetti task e sessione separati.
- **Pianificazione dalle task:** ogni attività può generare uno o più blocchi collegati alle normali sessioni Pomodoro; l’utente sceglie data, ora, durata netta in ore, intervalli di focus e pause facoltative. Il termine viene calcolato automaticamente; si impediscono sovrapposizioni e intervalli oltre mezzanotte. Il pulsante **Avvia ora** inserisce subito un blocco di focus, salvo conflitti.
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

Il service worker usa la cache `tempo-pomodoro-v9`. Quando pubblichi una nuova versione, incrementa il numero della cache in `sw.js` (ad esempio `v10`) per forzare il rinnovo dei file memorizzati.

## Limiti

- Una PWA statica non può garantire timer, notifiche o avvio di sessioni con l'app completamente chiusa o il dispositivo in sospensione.
- La riproduzione audio richiede un'interazione iniziale dell'utente e può essere sospesa dal sistema operativo in background.
- I dati sono memorizzati localmente nel browser: usa periodicamente il backup JSON per conservarli o trasferirli su un altro dispositivo. Il backup versione 3 include task e sessioni e può leggere i vecchi backup versione 2 (senza task).
- **Durata stimata = tempo netto di concentrazione**: pianificare 2 ore con focus 25 minuti e pause 5 minuti occupa 2 ore e 20 minuti sul calendario (4 pause tra 5 intervalli di focus).
- Quando contrassegni manualmente una task come completata, puoi scegliere se conservare o annullare i blocchi non ancora terminati. Eliminare una task rimuove i blocchi futuri e scollega quelli passati.

## Architettura condivisa

La gestione delle attività PWA è in `agenda.js` e `core/tempo-tasks.js`; **non è integrata nel plugin Obsidian**. La logica indipendente dalla piattaforma è in `core/tempo-core.js`: validazione e normalizzazione delle sessioni, calcolo delle pause, individuazione delle sessioni attive/prossime e calcolo della fase Pomodoro. La PWA importa direttamente questo modulo ES; il service worker include il modulo nella cache offline.

La cartella `obsidian/` contiene l'integrazione iniziale per Obsidian. Il plugin usa lo stesso core, ma salva i propri dati tramite l'API di persistenza di Obsidian (`data.json` del plugin). I dati PWA in `localStorage` e quelli Obsidian sono separati: non c'è sincronizzazione automatica tra i due ambienti.

### Build del plugin Obsidian

Requisiti: Node.js e npm.

```bash
cd obsidian
npm install
npm run build
```

La build genera `obsidian/main.js`. Per installare manualmente nel vault, crea la cartella `.obsidian/plugins/tempo-pomodoro/` e copia al suo interno:
- `obsidian/main.js` (generato dalla build)
- `obsidian/manifest.json`
- `obsidian/styles.css`

Poi abilita **Tempo — Pomodoro** da **Impostazioni → Plugin comunitari**. Per lo sviluppo, esegui `npm run dev` dalla cartella `obsidian/` e lascia attivo il processo di watch.

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
