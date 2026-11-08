# TEMPVS — Fase 4: release coordinate PWA + plugin Obsidian

## Principio
Un solo repository, un solo tag di versione, due artefatti derivati dallo **stesso commit**:
- PWA statica, pubblicata tramite GitHub Pages;
- plugin Obsidian per BRAT con `main.js`, `manifest.json`, `styles.css`, `versions.json` nella GitHub Release.

Un semplice push su `main` **non crea una release**. Il workflow controlla codice e build; le versioni vengono distribuite insieme solo con un tag `vX.Y.Z` che corrisponde al `manifest.json` del plugin e appartiene alla cronologia di `main`.

## Pipeline
`.github/workflows/coordinated-release.yml`:
1. Test Node e build PWA e plugin.
2. Verifica identità e versioni tra `manifest.json`, `obsidian/manifest.json` e `versions.json`.
3. Prepara due artefatti di prova per ogni PR.
4. Per un tag validato, pubblica prima la PWA con Pages.
5. Solo dopo il successo della pubblicazione Pages, crea la GitHub Release con gli asset destinati a BRAT.

È un processo sequenziale, non una transazione atomica: se la release BRAT fallisce dopo il deploy Pages, correggere e ripetere il job, senza taggare un altro commit diverso.

## Prerequisiti dell'amministratore GitHub
- **Settings → Pages → Build and deployment → Source: GitHub Actions**. Questa opzione può differire dalla pubblicazione attuale della PWA: verificare prima di cambiare.
- GitHub Actions abilitato, con permessi `pages: write`, `id-token: write` e `contents: write` (solo nel job release).
- Il repository deve poter creare GitHub Releases tramite `GITHUB_TOKEN`.
- BRAT deve puntare al repository `huliostiltskin95/pomo-wpa` e continuare a utilizzare l'identificatore stabile `tempo-pomodoro`.

## Procedura controllata di pubblicazione
1. Integrare e collaudare **prima** le fasi 1, 2 e 3; in particolare risolvere il controllo browser fallito della fase 1 e provare Dropbox sui dispositivi.
2. Fare merge della fase 4 in `main` soltanto dopo le verifiche precedenti.
3. Aggiornare in modo identico le versioni in entrambi i manifest e aggiungere la voce a `versions.json`.
4. Creare un tag annotato `v0.3.0` **solo quando il commit di release è su main e pronto**:
   `git tag -a v0.3.0 -m "TEMPVS 0.3.0"`
   `git push origin v0.3.0`
5. Verificare job di build, deploy Pages e release GitHub. BRAT rileverà la versione secondo i propri controlli di aggiornamento; non è garantito che l'installazione su ogni dispositivo sia immediata.

## Protezione della versione funzionante
- Nessun tag, release o pubblicazione viene creato da questa PR.
- La sincronizzazione Dropbox resta sul medesimo archivio remoto; il workflow non tocca i dati dell'utente.
- Evitare release automatiche da ogni commit: produrrebbero aggiornamenti del plugin non verificati, specialmente su iPad e Android.
- Eseguire sempre una copia JSON dei dati TEMPVS prima del primo passaggio dalla PWA al plugin integrato.

## Controlli da completare
- Installazione con BRAT su desktop, iPad e Android.
- Verifica sessioni, statistiche, pausa, risveglio da sospensione e sincronizzazione Dropbox con conflitti.
- Controllo che l'indirizzo GitHub Pages esistente rimanga invariato e che il nuovo deploy non interferisca con un eventuale workflow preesistente.

## Test browser di rilascio
Il job `browser-smoke` prova la PWA preparata in `dist/pwa`, non la cartella sorgente. Apre la navigazione attuale, il pannello di inserimento rapido e il timer; un errore blocca sia GitHub Pages sia il pacchetto BRAT. Il test viene eseguito anche nei controlli pre-release.
