// One presentation of the existing timer: no separate clock or stored session.
export const BREAK_COLOR = '#2563EB';
export function timerColor(areaColor, phase, paused) {
  return paused || phase?.kind === 'break' ? BREAK_COLOR : areaColor;
}
export function createTimerPip({button, snapshot, notify, togglePause}) {
  let pipWindow, video, stream, canvas, busy = false, prepared = false;
  const probe = document.createElement('video');
  const documentSupported = Boolean(window.documentPictureInPicture?.requestWindow);
  const videoSupported = Boolean(HTMLCanvasElement.prototype.captureStream &&
    ((document.pictureInPictureEnabled && probe.requestPictureInPicture) || probe.webkitSetPresentationMode));
  const supported = documentSupported || videoSupported;
  button.title = supported ? 'Mostra il timer sopra le altre finestre' : 'Picture-in-Picture non disponibile in questo browser';
  function opened() { return Boolean(pipWindow && !pipWindow.closed) || Boolean(video &&
    (document.pictureInPictureElement === video || video.webkitPresentationMode === 'picture-in-picture')); }
  function cleanupVideo() {
    const oldVideo = video, oldStream = stream;
    video = stream = canvas = null; prepared = false;
    if(oldVideo) { oldVideo.pause(); oldVideo.srcObject = null; oldVideo.remove(); }
    oldStream?.getTracks().forEach(track => track.stop());
    update();
  }
  function update() {
    const view = snapshot();
    button.hidden = !view.active && !opened();
    button.disabled = busy;
    button.textContent = opened() ? 'Chiudi mini timer' : prepared ? 'Apri mini timer' : 'Mini timer (PiP)';
    button.setAttribute('aria-pressed', String(opened()));
    if(pipWindow && !pipWindow.closed) {
      const doc = pipWindow.document;
      doc.body.style.borderColor = view.color;
      doc.getElementById('phase').textContent = view.phase;
      doc.getElementById('title').textContent = view.title;
      doc.getElementById('clock').textContent = view.clock;
      doc.getElementById('end').textContent = view.end;
      const pause = doc.getElementById('pause');
      pause.hidden = !view.active;
      pause.textContent = view.paused ? 'Riprendi' : 'Pausa';
      doc.querySelector('progress').value = view.progress;
      doc.querySelector('progress').style.accentColor = view.color;
    }
    if(canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f7f8fa'; ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = view.color; ctx.fillRect(0, 0, 640, 14);
      ctx.textAlign = 'center'; ctx.fillStyle = '#263831';
      ctx.font = '20px system-ui'; ctx.fillText(view.phase, 320, 58, 590);
      ctx.font = '26px system-ui'; ctx.fillText(view.title, 320, 103, 590);
      ctx.font = '86px system-ui'; ctx.fillText(view.clock, 320, 214, 590);
      ctx.font = '20px system-ui'; ctx.fillText(view.end, 320, 275, 590);
      ctx.fillStyle = '#d4ded7'; ctx.fillRect(50, 310, 540, 8);
      ctx.fillStyle = view.color; ctx.fillRect(50, 310, 540 * view.progress / 100, 8);
    }
  }
  button.addEventListener('click', async () => {
    if(busy) return;
    if(!supported) return notify('Questo browser non consente il mini timer PiP. Puoi usare Schermo intero.');
    busy = true;
    try {
      if(pipWindow && !pipWindow.closed) { pipWindow.close(); return; }
      if(opened()) {
        if(document.pictureInPictureElement === video) await document.exitPictureInPicture();
        else video.webkitSetPresentationMode('inline');
        cleanupVideo(); return;
      }
      if(documentSupported) {
        pipWindow = await window.documentPictureInPicture.requestWindow({width:360,height:300});
        pipWindow.document.title = 'TEMPVS · Mini timer';
        pipWindow.document.body.innerHTML = '<style>body{box-sizing:border-box;margin:0;padding:16px;text-align:center;font:16px system-ui;color:#263831;background:#f7f8fa;border-top:8px solid}p{margin:8px;overflow-wrap:anywhere}#phase{font-size:12px}#clock{font-size:clamp(32px,18vw,72px);font-variant-numeric:tabular-nums}progress{width:80%}button{padding:10px 22px;margin-top:12px;border:1px solid #cbd7cf;border-radius:8px;background:white;color:inherit}</style><p id="phase"></p><p id="title"></p><div id="clock" role="timer"></div><progress max="100" aria-label="Avanzamento fase"></progress><p id="end"></p><button id="pause"></button>';
        pipWindow.document.getElementById('pause').onclick = togglePause;
        pipWindow.addEventListener('pagehide', () => { pipWindow = null; update(); }, {once:true});
      } else if (prepared) {
        await openVideoPip(video, document);
      } else {
        canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
        update();
        stream = canvas.captureStream(1);
        video = document.createElement('video');
        video.muted = true; video.playsInline = true;
        video.setAttribute('playsinline', '');
        // Initialize native media controls before attaching a MediaStream (WebKit).
        video.controls = true; video.srcObject = stream; video.controls = false;
        video.setAttribute('aria-label', 'Anteprima del mini timer');
        video.style.cssText = 'display:block;width:240px;max-width:100%;margin:12px auto;border-radius:12px';
        button.parentElement.after(video);
        video.addEventListener('leavepictureinpicture', cleanupVideo, {once:true});
        video.addEventListener('webkitpresentationmodechanged', () => {
          if(prepared && video?.webkitPresentationMode === 'inline') cleanupVideo();
        });
        update(); // Paint a frame after captureStream is connected.
        await withTimeout(video.play(), 'Preparazione video', 8000);
        prepared = true;
        if(video.webkitSetPresentationMode) {
          // A second tap preserves a fresh user gesture after async video startup.
          notify('Anteprima pronta. Tocca Apri mini timer per attivare il PiP.');
        } else {
          await openVideoPip(video, document);
        }
      }
    } catch (error) {
      cleanupVideo();
      notify(pipErrorMessage(error));
    } finally { busy = false; update(); }
  });
  window.addEventListener('pagehide', () => { pipWindow?.close(); cleanupVideo(); });
  return {update};
}

export function pipErrorMessage(error) {
  const detail = [error?.name, error?.message].filter(Boolean).join(': ').slice(0, 240);
  return 'Mini timer non aperto. ' + (error?.name === 'NotSupportedError'
    ? 'Il browser non consente il PiP per questo video del timer. '
    : error?.name === 'NotAllowedError'
      ? 'Il browser ha negato l’apertura; riprova con un nuovo tocco. '
      : '') + '(' + (detail || 'Errore sconosciuto') + ')';
}
function withTimeout(promise, label, ms = 3000) {
  let timeout;
  return Promise.race([promise, new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new DOMException(label + ': nessuna risposta dal browser', 'TimeoutError')), ms);
  })]).finally(() => clearTimeout(timeout));
}
export async function openVideoPip(video, doc) {
  if(video.webkitSetPresentationMode && video.webkitSupportsPresentationMode?.('picture-in-picture')) {
    // WebKit does not return a promise: verify its presentation-mode event.
    let changed;
    const entered = new Promise(resolve => {
      changed = () => { if(video.webkitPresentationMode === 'picture-in-picture') resolve(); };
      video.addEventListener('webkitpresentationmodechanged', changed);
    });
    try {
      video.webkitSetPresentationMode('picture-in-picture');
      changed();
      await withTimeout(entered, 'Apertura PiP');
    } finally { video.removeEventListener('webkitpresentationmodechanged', changed); }
  } else if(doc.pictureInPictureEnabled && video.requestPictureInPicture) {
    await withTimeout(video.requestPictureInPicture(), 'Apertura PiP');
  } else {
    throw new DOMException('PiP non disponibile per il video generato dal timer', 'NotSupportedError');
  }
}
