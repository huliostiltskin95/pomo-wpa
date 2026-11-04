# TEMPVS 3.0 — Collaudo dopo le fasi 1–3

Questa checklist è pensata per una prova distribuita su due giornate. Le task non vengono mai completate automaticamente: lo stato cambia soltanto quando lo decidi tu.

> **Prima di iniziare:** esporta un backup JSON dalla pagina Impostazioni. Se usi Dropbox, lascia completare la sincronizzazione prima di passare a un altro dispositivo. Evita di modificare gli stessi dati contemporaneamente su più dispositivi.

## 1. Uso quotidiano (desktop)

- [ ] Apri **Oggi**: compaiono il timer, il programma e le attività pertinenti alla giornata.
- [ ] Apri **+ Nuova task**, crea un'attività con `!1 ^Lavoro @30m *domani` e verifica la presenza in Agenda.
- [ ] Controlla che la task non sia automaticamente completata e che senza `+orario` non nasca una sessione.
- [ ] Prova **N** fuori dai campi di testo, `Esc` nella finestra e frecce nel menu `+`.
- [ ] Apri **Agenda** e alterna Lista, Calendario, Kanban, Timeline ed Eisenhower.
- [ ] Apri la task e modifica una checklist Markdown, senza perdere la descrizione.
- [ ] Apri **Sessioni**, seleziona un giorno nel selettore settimanale e usa le frecce giorno precedente/successivo.
- [ ] Tocca un orario libero nella timeline per proporre una sessione; modifica poi il blocco creato.
- [ ] Programma una sessione **23:00–01:00**: verifica che sia visibile su entrambi i giorni ma resti un'unica sessione.
- [ ] Apri **Pianificazione automatica delle task** nella pagina Sessioni e verifica che l'Inbox non abbia perso l'inserimento rapido.
- [ ] Verifica che, alla fine di una sessione, la task associata rimanga aperta fino al completamento manuale.

## 2. Grafica, accessibilità e dispositivi

- [ ] Prova i temi Chiaro, Scuro e Automatico, anche nelle finestre di dialogo.
- [ ] Prova le densità Compatta e Comoda; verifica che i testi restino leggibili.
- [ ] Naviga con **Tab**, Invio, frecce e **Esc**: il focus deve essere visibile.
- [ ] Su iPad o smartphone verifica che pulsanti `+`, menu, giorni della settimana e blocchi orari siano selezionabili con precisione.
- [ ] Sul dispositivo meno potente verifica fluidità di scorrimento e risposta all'apertura di Agenda e Sessioni.
- [ ] Metti il dispositivo offline, riapri l'app e verifica che task e calendario siano ancora consultabili.
- [ ] Torna online; attendi il completamento della sincronizzazione Dropbox e controllane l'esito.
- [ ] Passa a un secondo dispositivo solo dopo la sincronizzazione; verifica attività, stati, descrizioni e sessioni.

## 3. Segnalazione di eventuali problemi

Per ogni anomalia, annota:

- **Dispositivo e browser** (es. Mac / Safari, iPad / Safari, Note 3 / Chromium).
- **Schermata** (Oggi, Agenda, Sessioni, ecc.).
- **Passi per riprodurre** il problema.
- **Comportamento atteso** e **comportamento osservato**.
- **Se l'app era online o offline** e lo stato di Dropbox.

Non condividere token Dropbox, backup integrali o dati personali se non strettamente necessario. Per un problema grafico è sufficiente uno screenshot senza dati sensibili.

**Versione di riferimento:** TEMPVS 3.0, cache PWA `tempo-pomodoro-v39`. Se vedi ancora l'interfaccia precedente, chiudi tutte le finestre della PWA e riaprila dopo il completamento della pubblicazione su GitHub Pages.
