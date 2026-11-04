/* TEMPVS 3.0 · UI phase 1. Presentation only: existing task/session handlers stay authoritative. */
(() => {
  "use strict";

  const ready = () => {
    const topActions = document.querySelector(".top-actions");
    const quickForm = document.getElementById("quick-task-form");
    const quickInput = document.getElementById("quick-task-input");
    const quickError = document.getElementById("quick-task-error");
    if (!topActions || !quickForm || document.getElementById("tempo-global-create")) return;

    const create = document.createElement("div");
    create.id = "tempo-global-create";
    create.className = "tempo-global-create";
    create.innerHTML =
      '<button type="button" class="tempo-create-primary" id="tempo-create-primary" aria-haspopup="dialog" aria-keyshortcuts="N" title="Aggiungi una task (N)">' +
        '<span class="tempo-create-plus" aria-hidden="true">+</span><span class="tempo-create-label">Nuova task</span>' +
      '</button>' +
      '<button type="button" class="tempo-create-chevron" id="tempo-create-menu-button" aria-label="Altre azioni di inserimento" aria-haspopup="menu" aria-expanded="false" aria-controls="tempo-create-menu">▾</button>' +
      '<div class="tempo-create-menu" id="tempo-create-menu" role="menu" hidden>' +
        '<button type="button" role="menuitem" data-tempo-create="quick">Inserimento rapido <span>N</span></button>' +
        '<button type="button" role="menuitem" data-tempo-create="task">Scheda attività completa</button>' +
        '<button type="button" role="menuitem" data-tempo-create="bulk">Inserimento multiplo</button>' +
        '<div class="tempo-create-menu-separator" role="separator"></div>' +
        '<button type="button" role="menuitem" data-tempo-create="session">Nuova sessione</button>' +
        '<button type="button" role="menuitem" data-tempo-create="tags">Gestisci tag</button>' +
      '</div>';
    topActions.append(create);

    // Four primary destinations. Statistics and settings remain fully accessible in "Altro".
    const nav = document.getElementById("tempo-navigation");
    if (nav && !nav.querySelector(".tempo-nav-more")) {
      const statsLink = nav.querySelector('[data-view-link="statistiche"]');
      const settingsLink = nav.querySelector('[data-view-link="impostazioni"]');
      if (statsLink && settingsLink) {
        const more = document.createElement("div");
        more.className = "tempo-nav-more";
        more.innerHTML =
          '<button type="button" class="tempo-nav-more-toggle tempo-nav-link" aria-label="Altre sezioni" aria-expanded="false" aria-controls="tempo-nav-more-menu">' +
            '<span class="tempo-nav-icon" aria-hidden="true">⋯</span>' +
            '<span class="tempo-nav-full" aria-hidden="true">Altro</span><span class="tempo-nav-short" aria-hidden="true">Altro</span>' +
          '</button>' +
          '<div id="tempo-nav-more-menu" class="tempo-nav-more-menu" hidden></div>';
        nav.append(more);
        const extraMenu = more.querySelector(".tempo-nav-more-menu");
        extraMenu.append(statsLink, settingsLink);
        const moreToggle = more.querySelector(".tempo-nav-more-toggle");
        const toggleMore = open => {
          extraMenu.hidden = !open;
          moreToggle.setAttribute("aria-expanded", String(open));
        };
        const syncMore = () => {
          const hash = location.hash.replace("#", "").toLowerCase();
          moreToggle.classList.toggle("active", hash === "statistiche" || hash === "impostazioni");
          toggleMore(false);
        };
        moreToggle.addEventListener("click", () => toggleMore(extraMenu.hidden));
        extraMenu.addEventListener("click", event => {
          if (event.target.closest("[data-view-link]")) toggleMore(false);
        });
        document.addEventListener("pointerdown", event => {
          if (!more.contains(event.target)) toggleMore(false);
        });
        document.addEventListener("keydown", event => {
          if(event.key !== "Escape" || extraMenu.hidden)return;
          event.preventDefault();
          toggleMore(false);
          moreToggle.focus({preventScroll:true});
        });
        more.addEventListener("focusout", event => {
          if (!more.contains(event.relatedTarget)) toggleMore(false);
        });
        window.addEventListener("hashchange", syncMore);
        syncMore();
      }
    }

    const dialog = document.createElement("dialog");
    dialog.id = "tempo-capture-dialog";
    dialog.className = "session-dialog tempo-capture-dialog";
    dialog.setAttribute("aria-labelledby", "tempo-capture-heading");
    dialog.innerHTML =
      '<div class="tempo-capture-heading">' +
        '<div><p class="eyebrow">RACCOLTA RAPIDA</p><h2 id="tempo-capture-heading">Nuova attività</h2></div>' +
        '<button type="button" class="icon-button" id="tempo-capture-close" aria-label="Chiudi inserimento">×</button>' +
      '</div><div id="tempo-capture-slot"></div>' +
      '<div class="tempo-capture-footer"><span>Invio per aggiungere · Esc per chiudere</span>' +
        '<button type="button" class="text-button" data-tempo-create="task">Apri scheda completa</button>' +
      '</div>';
    document.body.append(dialog);
    dialog.querySelector("#tempo-capture-slot").append(quickForm);
    const syntaxHelp = document.querySelector(".tempo-quick-help");
    if (syntaxHelp) dialog.querySelector("#tempo-capture-slot").append(syntaxHelp);

    const primary = create.querySelector("#tempo-create-primary");
    const toggle = create.querySelector("#tempo-create-menu-button");
    const menu = create.querySelector("#tempo-create-menu");
    const setMenu = open => {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };
    const closeMenu = () => setMenu(false);
    const menuButtons = () => [...menu.querySelectorAll('[role="menuitem"]:not([disabled])')];
    const focusMenu = (index = 0) => {
      const buttons=menuButtons();
      if(!buttons.length)return;
      buttons[(index+buttons.length)%buttons.length].focus({preventScroll:true});
    };
    menu.addEventListener("keydown", event => {
      const buttons=menuButtons(),index=buttons.indexOf(document.activeElement);
      if(event.key==="ArrowDown"){event.preventDefault();focusMenu(index+1);}
      else if(event.key==="ArrowUp"){event.preventDefault();focusMenu(index<0?buttons.length-1:index-1);}
      else if(event.key==="Home"){event.preventDefault();focusMenu(0);}
      else if(event.key==="End"){event.preventDefault();focusMenu(buttons.length-1);}
    });
    create.addEventListener("focusout", event => {
      if(!create.contains(event.relatedTarget)) closeMenu();
    });

    const runAction = action => {
      closeMenu();
      if (action === "quick") {
        if (!dialog.open) dialog.showModal();
        quickInput.focus();
        return;
      }
      if (dialog.open) dialog.close();
      const targets = {
        task: "new-task-button",
        bulk: "bulk-task-button",
        session: "new-session-button",
        tags: "manage-tags-button"
      };
      const button = document.getElementById(targets[action]);
      if (button) button.click();
    };

    primary.addEventListener("click", () => runAction("quick"));
    toggle.addEventListener("click", () => {
      const opening = menu.hidden;
      setMenu(opening);
      if(opening) focusMenu();
    });
    toggle.addEventListener("keydown", event => {
      if(event.key!=="ArrowDown" && event.key!=="ArrowUp")return;
      event.preventDefault();setMenu(true);
      focusMenu(event.key==="ArrowDown"?0:menuButtons().length-1);
    });
    create.addEventListener("click", event => {
      const action = event.target.closest("[data-tempo-create]");
      if (action) runAction(action.dataset.tempoCreate);
    });
    dialog.addEventListener("click", event => {
      if (event.target.id === "tempo-capture-close") dialog.close();
      const action = event.target.closest("[data-tempo-create]");
      if (action) runAction(action.dataset.tempoCreate);
    });
    document.addEventListener("pointerdown", event => {
      if (!create.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !menu.hidden){
        event.preventDefault();
        closeMenu();
        toggle.focus({preventScroll:true});
        return;
      }
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
          event.key.toLowerCase() !== "n") return;
      if (event.target.closest("input, textarea, select, [contenteditable], dialog") ||
          document.querySelector("dialog[open]")) return;
      event.preventDefault();
      runAction("quick");
    });
    // The existing submit listener saves and validates the task first; close only after success.
    quickForm.addEventListener("submit", () => {
      if (dialog.open && !quickInput.value.trim() && !quickError.textContent.trim()) dialog.close();
    });
    dialog.addEventListener("close", () => {
      // A secondary editor may open immediately after quick capture.
      if(!document.querySelector("dialog[open]")) primary.focus({preventScroll:true});
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
