# TEMPVS — Fase 5: integrazione Obsidian

La versione di anteprima `0.4.0` introduce le risorse del vault nelle aree TEMPVS, senza convertire le note Obsidian in task e senza creare file aggiuntivi.

## Comandi
- **Apri timer TEMPVS:** apre la vista integrata.
- **Pausa o riprendi TEMPVS:** controlla la sessione in corso.
- **Concludi sessione TEMPVS:** termina la sessione.
- **Collega nota attiva all'area della sessione:** aggiunge `[[percorso/nota]]` alla descrizione Markdown dell'area; se non è attiva una sessione, apre il pannello per una selezione esplicita.
- **Espandi o compatta il pannello TEMPVS:** alterna mini-timer e vista completa; preferenza salvata localmente.

## Risorse
Nel pannello espanso scegli un'area e premi **Collega nota attiva all'area**. TEMPVS aggiunge il collegamento solo se non è già presente. La lista sottostante apre i riferimenti Markdown `[[nota]]`, `[etichetta](percorso.md)` e `obsidian://open?...file=...` tramite l'API di navigazione di Obsidian. I collegamenti esterni non vengono aperti attraverso questa lista.

Le descrizioni Markdown restano archiviate nel formato delle aree della PWA e quindi fanno parte delle sincronizzazioni Dropbox esistenti.

## Mobile
Per impostazione predefinita il pannello è compatto: countdown e controlli essenziali, senza overlay, duplicazione di timer o polling aggiuntivi. Per accedere a pianificazione, note, statistiche e Dropbox si usa **Espandi**. Su desktop resta presente il timer nella barra di stato.

## Limitazioni
La fase 5 non cambia il motore Pomodoro, i file PWA e il formato del backup. L'aggiornamento sarà distribuito soltanto dopo integrazione e collaudo delle precedenti PR. La prima autorizzazione Dropbox, il comportamento in background e le scorciatoie richiedono ancora verifica fisica sui dispositivi.
