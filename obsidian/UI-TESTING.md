# TEMPVS — interfaccia Obsidian

Il timer mostra fase, avanzamento e orario finale. I controlli Pausa/Riprendi sospendono il conteggio del focus, mentre gli orari della sessione continuano a scorrere, come nel core esistente.

- **Nuova sessione**: scegli area, durata totale e un preset da 15, 30 o 60 minuti. Focus e pausa finale personalizzata sono nelle opzioni avanzate.
- **Pianifica**: scegli giorno, area, ora e durata. Il giorno iniziale segue la data selezionata nell’agenda. Per inserire più sessioni, espandi l’inserimento testuale: le righe compilate sostituiscono i campi guidati.
- **Pomodoro lordo**: nella pianificazione inserisci ad esempio 60 per cicli 50/10. Equivalente testuale: `Studio @2h +14:00 -60m`. La durata totale resta di due ore; il ciclo esplicito include la pausa.
- **Suoni / Risorse**: aprono un pannello con stato visibile sul comando. Chiudi con × oppure Escape. I campi restano compilati durante gli aggiornamenti del timer e passando tra pannelli.

## Build e installazione

Dalla radice del repository:

```sh
npm install
npm run build:obsidian
```

Copia i tre file in `obsidian/dist/` (`main.js`, `styles.css`, `manifest.json`) nella cartella `<vault>/.obsidian/plugins/tempo-pomodoro/`, quindi ricarica il plugin. Mantieni l’eventuale `data.json` già presente, che contiene i tuoi dati.

## Verifiche riproducibili

```sh
npm test
node --test tests/obsidian-runtime.smoke.mjs
npm install --no-save --no-package-lock playwright
npx playwright install chromium
node tests/obsidian-ui.e2e.mjs
```

Il test browser esegue il bundle reale con una simulazione DOM/API di Obsidian: verifica avvio, pausa/ripresa, conclusione, pianificazione guidata e testuale, note vuote, volume, Escape, conservazione dei campi e assenza di overflow a 280/390/768 px. Le schermate generate in `/tmp/tempvs-ui-*.png` usano variabili di tema di esempio e icone segnaposto.

Prima della distribuzione, verificare anche in Obsidian desktop/iPad con il proprio tema e con gli avvisi audio attivi. La simulazione non certifica il rendering nativo né le autorizzazioni audio del dispositivo.
