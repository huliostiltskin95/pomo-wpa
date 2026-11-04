import { proposeSessionFill } from './core/tempo-fill.js';
import { sessionBounds } from './core/tempo-core.js';
import { sessionArea, sessionTaskIds } from './core/tempo-tasks.js';

// Confirmation-first, editable preview: one task per full Pomodoro.
export function mountSessionFiller({ getState, applySessions, showToast }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'session-dialog tempo-fill-dialog';
  dialog.setAttribute('aria-label', 'Assegna i Pomodori alle task');
  dialog.innerHTML = `<div class="dialog-heading"><h2>Assegna i Pomodori</h2><button type="button" class="icon-button" data-close aria-label="Chiudi">×</button></div>
    <p class="muted">Il tempo viene distribuito equamente fra le task selezionate, rispettando le stime residue. Ogni slot comprende <strong>un periodo completo di concentrazione</strong> e la relativa pausa, se prevista.</p>
    <div id="tempo-fill-choices"></div>
    <div id="tempo-fill-preview" role="status" aria-live="polite"></div>
    <div class="dialog-actions"><button class="button button-secondary" type="button" data-close>Annulla</button><button class="button button-primary hidden" type="button" id="tempo-fill-confirm">Conferma assegnazioni</button></div>`;
  document.body.appendChild(dialog);
  const choices = dialog.querySelector('#tempo-fill-choices');
  const summary = dialog.querySelector('#tempo-fill-preview');
  const confirm = dialog.querySelector('#tempo-fill-confirm');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const format = minutes => {
    const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
    return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
  };
  const clock = date => date.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
  const isFuture = session => sessionBounds(session).start > new Date();
  const snapshot = state => JSON.stringify([state.tasks, state.sessions]);
  let selectedIds = [], manualSlots = new Map(), proposal = [], sourceSignature = '', details = [];

  function selectedTasks(state, area) {
    const picked = new Set([...choices.querySelectorAll('input[data-fill-task]:checked')].map(input => input.value));
    return state.tasks.filter(task => task.area === area && picked.has(task.id)).map(task => task.id);
  }

  function buildChoices(state) {
    const sessions = selectedIds.map(id => state.sessions.find(s => s.id === id)).filter(Boolean);
    const areas = [...new Set(sessions.map(session => sessionArea(session, state.tasks)))];
    choices.innerHTML = areas.map(area => {
      const available = state.tasks.filter(task => task.area === area && task.status !== 'done' &&
        (!task.workDate || sessions.some(s => sessionArea(s, state.tasks) === area && task.workDate <= s.date)));
      const alreadyAssigned = new Set(sessions.filter(s => sessionArea(s, state.tasks) === area)
        .flatMap(s => sessionTaskIds(s)));
      const useExisting = alreadyAssigned.size > 0;
      return `<section class="tempo-fill-task-choices"><h3>${escape(area)} · Task da distribuire</h3>`+
        (available.length ? available.map(task => {
          const checked = useExisting ? alreadyAssigned.has(task.id) : !task.inbox && task.estimateMinutes != null;
          return `<label class="tempo-fill-task-choice"><input type="checkbox" data-fill-task value="${escape(task.id)}" ${checked ? 'checked' : ''}><span>${escape(task.title)}</span><small>${task.estimateMinutes == null ? 'Senza stima' : escape(format(task.estimateMinutes)) + ' stimate'}</small></label>`;
        }).join('') : '<p class="muted">Nessuna task aperta in questa area.</p>') + '</section>';
    }).join('');
  }

  function compute(state) {
    const working = [...state.sessions];
    const next = [], records = [];
    for (const id of selectedIds) {
      const index = working.findIndex(s => s.id === id);
      const session = working[index];
      if (!session || !isFuture(session)) throw Error('Una sessione è cambiata o è già iniziata. Riapri la distribuzione.');
      const taskIds = selectedTasks(state, sessionArea(session, state.tasks));
      const opts = { taskIds };
      if (manualSlots.has(id)) opts.slotTaskIds = manualSlots.get(id);
      const result = proposeSessionFill(session, state.tasks, working, opts);
      working[index] = result.session;
      if (JSON.stringify(result.session) !== JSON.stringify(session)) next.push(result.session);
      records.push({ original: session, ...result, taskIds });
    }
    return { next, records };
  }

  function draw() {
    try {
      const state = getState();
      const generated = compute(state);
      proposal = generated.next;
      details = generated.records;
      sourceSignature = snapshot(state);
      const openDetails = new Set([...summary.querySelectorAll('details[open]')].map(el => el.dataset.session));
      summary.innerHTML = details.map(({ original, slots, session, additions, freeMinutes, unassignableMinutes, taskIds }) => {
        const start = sessionBounds(original).start;
        const taskOptions = taskIds.map(id => state.tasks.find(t => t.id === id)).filter(Boolean);
        const options = [ { id:'', title:'Non assegnato' }, ...taskOptions.map(task => ({id:task.id,title:task.title})) ];
        const items = slots.map(({ startOffset, minutes, focusMinutes, breakMinutes }, i) => {
          const from = new Date(start.getTime() + startOffset * 60000);
          const to = new Date(from.getTime() + minutes * 60000);
          const current = session.pomodoroTaskIds[i] || '';
          return `<li class="tempo-fill-slot"><div><strong>Pomodoro ${i + 1}</strong><small>${escape(clock(from))}–${escape(clock(to))} · ${focusMinutes}m focus${breakMinutes ? ' + ' + breakMinutes + 'm pausa' : ''}</small></div><select data-fill-session="${escape(original.id)}" data-fill-slot="${i}" aria-label="Task del Pomodoro ${i + 1}">${options.map(option => `<option value="${escape(option.id)}" ${option.id === current ? 'selected' : ''}>${escape(option.title)}</option>`).join('')}</select></li>`;
        }).join('');
        return `<section class="tempo-fill-item"><strong>${escape(original.date + ' · ' + original.start + '–' + original.end + ' · ' + original.title)}</strong>`+
          `<small>${slots.length} Pomodori completi · ${escape(format(session.workMinutes))} di concentrazione ciascuno</small>`+
          (additions.length ? `<ul>${additions.map(a => `<li>${escape(a.title)} — ${a.pomodoros} ${a.pomodoros === 1 ? 'Pomodoro' : 'Pomodori'} (${escape(format(a.minutes))} lordi)</li>`).join('')}</ul>`
            : '<p class="muted">Nessuna task assegnata.</p>')+
          (freeMinutes ? `<small>Tempo non assegnato: ${escape(format(freeMinutes))}</small>` : '')+
          (unassignableMinutes ? `<small class="tempo-fill-warning">Ultimi ${escape(format(unassignableMinutes))}: concentrazione inferiore a un Pomodoro intero, non assegnabile.</small>` : '')+
          (items ? `<details data-session="${escape(original.id)}" class="tempo-fill-custom"><summary>Personalizza i singoli Pomodori</summary><ol>${items}</ol></details>` : '')+
          '</section>';
      }).join('') || '<p class="muted">Non ci sono sessioni future per questo giorno.</p>';
      for (const el of summary.querySelectorAll('details[data-session]'))
        el.open = openDetails.has(el.dataset.session);
      confirm.classList.toggle('hidden', !proposal.length);
    } catch (error) {
      proposal = []; details = [];
      confirm.classList.add('hidden');
      summary.textContent = error.message;
    }
  }

  function open(ids) {
    const state = getState();
    selectedIds = [...new Set(ids)].filter(id => state.sessions.some(s => s.id === id && isFuture(s)));
    manualSlots = new Map(); proposal = []; details = [];
    buildChoices(state);
    summary.textContent = selectedIds.length ? '' : 'Non ci sono sessioni future modificabili per questo giorno.';
    if (selectedIds.length) draw();
    else confirm.classList.add('hidden');
    dialog.showModal();
  }

  choices.addEventListener('change', event => {
    if (!event.target.matches('[data-fill-task]')) return;
    manualSlots.clear();
    draw();
  });
  summary.addEventListener('change', event => {
    const select = event.target.closest('select[data-fill-session][data-fill-slot]');
    if (!select) return;
    const sessionId = select.dataset.fillSession, slot = Number(select.dataset.fillSlot);
    const record = details.find(item => item.original.id === sessionId);
    if (!record || !Number.isInteger(slot) || slot < 0 || slot >= record.slots.length) return;
    const values = [...(manualSlots.get(sessionId) || record.session.pomodoroTaskIds)];
    values[slot] = select.value || null;
    manualSlots.set(sessionId, values);
    draw();
  });
  confirm.addEventListener('click', () => {
    if (!proposal.length) return;
    const state = getState();
    if (snapshot(state) !== sourceSignature) {
      confirm.classList.add('hidden');
      summary.textContent = 'I dati sono cambiati. Chiudi e riapri la distribuzione.';
      return;
    }
    try {
      const latest = compute(state);
      if (JSON.stringify(latest.next) !== JSON.stringify(proposal))
        throw Error('La distribuzione è cambiata. Ricalcola l’anteprima.');
      const replacements = new Map(proposal.map(s => [s.id, s]));
      if (applySessions(replacements)) {
        const count = proposal.length;
        proposal = []; dialog.close();
        showToast(count + ' sessioni aggiornate con Pomodori interi.');
      }
    } catch (error) { confirm.classList.add('hidden'); summary.textContent = error.message; }
  });
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  window.addEventListener('tempo:fill-session', event => {
    if (event.detail?.sessionId) open([event.detail.sessionId]);
  });
  return {
    openSession(id) { open([id]); },
    openDay(date) {
      open(getState().sessions.filter(s => s.date === date)
        .sort((a, b) => sessionBounds(a).start - sessionBounds(b).start).map(s => s.id));
    }
  };
}
