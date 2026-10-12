/* A small original synthesized demonstration, never autoplayed. */
(() => {
  'use strict';
  const root = document.querySelector('.sound-playground');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const steps = [...root.querySelectorAll('[data-step]')];
  const initial = [true, false, true, true, false, false, true, false];
  const pitches = [110, 164.81, 130.81, 220, 146.83, 164.81, 196, 130.81];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pattern = [...initial], tempo = 120, audio, master;
  let playing = false, starting = false, generation = 0;
  let timer = 0, frame = 0, nextTime = 0, nextStep = 0;
  const voices = new Set(), queue = [];
  const status = text => { $('#sound-status').textContent = text; };
  function draw() {
    steps.forEach((button, i) => button.setAttribute('aria-pressed', String(pattern[i])));
    const points = [];
    for (let x = 0; x <= 640; x += 2) {
      const step = Math.min(7, Math.floor(x / 80)), phase = (x % 80) / 80;
      const amplitude = pattern[step] ? 45 * Math.sin(phase * Math.PI * 4) * Math.exp(-phase * 3) : 0;
      points.push(`${x === 0 ? 'M' : 'L'}${x} ${(50 - amplitude).toFixed(2)}`);
    }
    $('#sound-wave').setAttribute('d', points.join(' '));
  }
  function updateButton() {
    $('#sound-toggle').setAttribute('aria-pressed', String(playing));
    $('#sound-toggle span:first-child').textContent = playing ? '■' : '▶';
    $('#sound-toggle span:last-child').textContent = playing ? 'Arrêter le motif' : 'Écouter le motif';
  }
  function stop(message = 'À l’arrêt. Votre motif reste en place.') {
    generation++;
    starting = false;
    playing = false;
    clearInterval(timer); timer = 0;
    cancelAnimationFrame(frame); frame = 0;
    queue.length = 0;
    if (audio && master) {
      master.gain.cancelScheduledValues(audio.currentTime);
      master.gain.setTargetAtTime(0, audio.currentTime, .012);
      for (const voice of voices) {
        try { voice.stop(audio.currentTime + .045); } catch (_) { /* Already ended. */ }
      }
    }
    steps.forEach(button => button.classList.remove('is-current'));
    updateButton();
    status(message);
  }
  function note(index, when) {
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(pitches[index], when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, when);
    filter.frequency.exponentialRampToValueAtTime(260, when + .24);
    filter.Q.value = .6;
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(.5, when + .008);
    envelope.gain.exponentialRampToValueAtTime(.001, when + .27);
    oscillator.connect(filter).connect(envelope).connect(master);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
    oscillator.start(when);
    oscillator.stop(when + .29);
  }
  function schedule() {
    if (!playing) return;
    if (audio.state !== 'running') { stop('Lecture interrompue. Relancez le motif quand vous voulez.'); return; }
    // Skip missed beats after a stalled tab; never stack a burst of old notes.
    if (nextTime < audio.currentTime - .1) nextTime = audio.currentTime + .025;
    while (nextTime < audio.currentTime + .08) {
      if (pattern[nextStep]) note(nextStep, nextTime);
      queue.push({step:nextStep, time:nextTime});
      nextTime += 60 / tempo / 2;
      nextStep = (nextStep + 1) % steps.length;
    }
  }
  function animate() {
    if (!playing) return;
    let current;
    while (queue.length && queue[0].time <= audio.currentTime) current = queue.shift().step;
    if (current !== undefined) steps.forEach((button, i) => button.classList.toggle('is-current', !reduced.matches && i === current));
    frame = requestAnimationFrame(animate);
  }
  $('#sound-toggle').addEventListener('click', async () => {
    if (playing || starting) { stop(); return; }
    if (document.body.classList.contains('focus-mode')) { status('Le mode Focus garde le son en pause. Désactivez-le pour écouter.'); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) { status('Le son n’est pas disponible dans ce navigateur. Vous pouvez composer le motif visuel.'); return; }
    const request = ++generation;
    starting = true;
    try {
      if (!audio) { audio = new Context(); master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination); }
      await audio.resume();
      if (request !== generation || document.hidden || document.body.classList.contains('focus-mode')) { starting = false; return; }
      if (audio.state !== 'running') throw new Error('Audio unavailable');
      starting = false;
      playing = true;
      master.gain.cancelScheduledValues(audio.currentTime);
      master.gain.setValueAtTime(0, audio.currentTime);
      master.gain.linearRampToValueAtTime(.22, audio.currentTime + .035);
      nextStep = 0; nextTime = audio.currentTime + .05;
      updateButton();
      status('Lecture du motif synthétique. Chaque case active joue une note.');
      schedule(); timer = setInterval(schedule, 25); frame = requestAnimationFrame(animate);
    } catch (_) { stop('Lecture indisponible. Vous pouvez toujours composer le motif visuel.'); }
  });
  steps.forEach((button, i) => button.addEventListener('click', () => {
    pattern[i] = !pattern[i]; draw();
    status(pattern.some(Boolean) ? `Pas ${i + 1} ${pattern[i] ? 'activé' : 'désactivé'}. Le motif se recompose.` : 'Tous les pas sont coupés. Activez une note pour retrouver le son.');
  }));
  $('#sound-tempo').addEventListener('input', event => {
    tempo = Number(event.target.value);
    $('#tempo-value').textContent = `${tempo} BPM`;
  });
  $('#sound-reset').addEventListener('click', () => {
    stop('Motif et tempo réinitialisés. Prêt pour une nouvelle composition.');
    pattern = [...initial]; tempo = 120;
    $('#sound-tempo').value = tempo; $('#tempo-value').textContent = `${tempo} BPM`; draw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop('Lecture en pause. Relancez le motif quand vous voulez.'); if (audio) audio.suspend().catch(() => {}); }
  });
  window.addEventListener('pagehide', () => { stop(); if (audio) audio.suspend().catch(() => {}); });
  new MutationObserver(() => {
    if (document.body.classList.contains('focus-mode')) stop('Mode Focus : le son est en pause.');
  }).observe(document.body, {attributes:true, attributeFilter:['class']});
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && (playing || starting)) stop('Lecture en pause. Votre motif reste en place.');
  }).observe(root);
  draw();
})();
