# Tempo — PWA Pomodoro

Una piccola app web progressiva, in italiano, per programmare sessioni di concentrazione con cicli lavoro/pausa personalizzati. Usa solo HTML, CSS e JavaScript: non richiede server, account, framework o dipendenze.

## Funzioni

- Sessioni su date future o sul giorno corrente, con titolo, orario di inizio/fine e durata lavoro/pausa personalizzate.
- Avvio automatico quando l'orario previsto arriva e la pagina è aperta.
- Alternanza automatica tra lavoro e pausa, fino all'orario di fine.
- Nessuna sovrapposizione tra sessioni dello stesso giorno.
- Preferenze predefinite modificabili.
- Salvataggio locale nel browser.
- Esportazione e importazione di backup JSON.
- Interfaccia adattiva per desktop e dispositivi mobili.
- Service worker per il caricamento offline dopo la prima visita.
- Installazione come PWA, dove supportata dal browser.

## Pubblicazione su GitHub Pages

1. Crea un repository GitHub, ad esempio `tempo-pomodoro`.
2. Scarica ed estrai l'archivio del progetto.
3. Carica **tutti i file e le cartelle del progetto** nella radice del repository: `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `icon.svg` e `README.md`.
4. In GitHub apri **Settings → Pages**.
5. In **Build and deployment**, scegli **Deploy from a branch**.
6. Seleziona il branch `main` e la cartella `/ (root)`, poi salva.
7. Attendi la pubblicazione. L'indirizzo sarà simile a `https://TUO-USERNAME.github.io/tempo-pomodoro/`.

GitHub Pages può impiegare qualche minuto ad aggiornare il sito. Se il repository ha un nome diverso, il percorso finale cambia di conseguenza. Il progetto usa percorsi relativi (`./`) per funzionare anche in un sottopercorso GitHub Pages.

### Aggiornamenti

Quando modifichi i file e li carichi nel repository, il browser può continuare a usare temporaneamente la versione in cache. Per verificare una nuova versione:
- ricarica la pagina;
- se necessario, chiudi e riapri la PWA;
- in caso di cache persistente, cancella i dati del sito dal browser.

Se pubblichi una nuova versione importante, aumenta `CACHE_NAME` in `sw.js`, ad esempio da `tempo-pomodoro-v1` a `tempo-pomodoro-v2`.

## Uso

1. Apri la pagina e scegli **Nuova sessione**.
2. Inserisci un titolo, la data, l'ora d'inizio e l'ora di fine.
3. Imposta i minuti di lavoro e pausa. I valori predefiniti si possono cambiare in **Impostazioni predefinite**.
4. Salva. La sessione apparirà nell'agenda del giorno selezionato.
5. Lascia la pagina aperta: quando arriva l'ora d'inizio, il timer entra automaticamente nel ciclo corretto.

Le sessioni vengono salvate nel browser del dispositivo. Esporta regolarmente un backup JSON per trasferire i dati o conservarli.

## Limiti tecnici da conoscere

- **Pagina aperta richiesta per l'avvio automatico:** una PWA statica non può garantire l'avvio di un timer con l'app completamente chiusa su tutti i sistemi operativi.
- **Sospensione e risparmio energetico:** se il browser sospende la pagina o il computer/telefono entra in stop, il timer visivo può non aggiornarsi in tempo reale. Al ritorno in primo piano viene ricalcolato in base all'orario reale, quindi non perde il conto del tempo trascorso.
- **Notifiche e suoni:** questa versione non si affida a notifiche push o a processi in background. Gli avvisi interni compaiono mentre la pagina è visibile; la disponibilità delle notifiche di sistema varia tra browser e sistemi operativi.
- **Dati locali:** i dati non si sincronizzano tra dispositivi. I dati del browser possono essere cancellati manualmente o dalle impostazioni di pulizia; usa il backup JSON.
- **Installazione:** l'esperienza PWA varia tra browser. GitHub Pages fornisce HTTPS, requisito necessario per il service worker; su alcuni browser l'installazione può essere disponibile dal menu del browser invece che tramite un pulsante interno.
- **Icona:** il progetto include un'icona SVG. Alcune combinazioni di browser/sistema operativo possono preferire icone PNG di dimensioni dedicate per una migliore installazione; l'app resta utilizzabile anche senza.
- **Orari:** le sessioni sono pensate per iniziare e terminare nella stessa giornata locale. Non è possibile programmare una sessione che attraversi la mezzanotte.
- **Precisione:** la pagina aggiorna l'interfaccia ogni secondo quando il browser la esegue. Il conto alla rovescia deriva da orari reali e si riallinea dopo sospensioni, ma non è un timer di sistema con garanzia al millisecondo.

## Dati e privacy

L'app non contiene analytics, pubblicità, account, chiamate a servizi esterni o dipendenze remote. Le sessioni e le preferenze sono salvate in `localStorage` del browser. Il backup JSON contiene titoli, date, orari, durate e preferenze: conservalo in un luogo appropriato.

## Test locale

Per testare il service worker, servi i file con un server locale (non aprire `index.html` direttamente dal file system). Se hai Python installato:

```bash
python -m http.server 8000
```

Poi visita `http://localhost:8000/`. Per testare l'installazione PWA nel modo più fedele possibile, pubblica su GitHub Pages via HTTPS.

## Licenza

Puoi riutilizzare e modificare il progetto. Se desideri distribuirlo pubblicamente con una licenza formale, aggiungi un file `LICENSE` con la licenza scelta.
