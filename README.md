# Tempo — Pomodoro

PWA installabile e utilizzabile offline per programmare finestre di concentrazione.

## Funzioni

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

Il file `.ics` contiene le sessioni programmate come eventi di calendario. Può essere importato in un'app calendario compatibile. TickTick può mostrare calendari locali su iOS/macOS e sottoscrivere calendari esterni tramite URL; l'esportazione locale da Tempo non crea da sola una sincronizzazione automatica o bidirezionale con TickTick. L'importazione non crea registrazioni native del timer Pomodoro di TickTick.

## Installazione su GitHub Pages

1. Carica tutti i file nella root del repository.
2. In GitHub apri **Settings → Pages**.
3. Seleziona il branch principale e la cartella `/ (root)`.
4. Apri l'indirizzo Pages in HTTPS e installa la PWA dal browser.

## Aggiornamento dopo una modifica

Il service worker usa la cache `tempo-pomodoro-v3`. Quando pubblichi una nuova versione, incrementa il numero della cache in `sw.js` (ad esempio `v4`) per forzare il rinnovo dei file memorizzati.

## Limiti

- Una PWA statica non può garantire timer, notifiche o avvio di sessioni con l'app completamente chiusa o il dispositivo in sospensione.
- La riproduzione audio richiede un'interazione iniziale dell'utente e può essere sospesa dal sistema operativo in background.
- I dati sono memorizzati localmente nel browser: usa periodicamente il backup JSON per conservarli o trasferirli su un altro dispositivo.

## Architettura condivisa

La logica indipendente dalla piattaforma è in `core/tempo-core.js`: validazione e normalizzazione delle sessioni, calcolo delle pause, individuazione delle sessioni attive/prossime e calcolo della fase Pomodoro. La PWA importa direttamente questo modulo ES; il service worker include il modulo nella cache offline.

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

Questa è la prima integrazione funzionante, non ancora una parità completa con la PWA: backup JSON, esportazione iCalendar, notifiche native, suoni ambientali, modalità focus e modifica delle sessioni non sono ancora implementati nel plugin.
