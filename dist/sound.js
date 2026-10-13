import { createInstrument, DEFAULT_PATTERN, DEFAULT_TEMPO, DEFAULT_TONE, DEFAULT_VOLUME } from './sound-engine.js';

/* The audio clock drives playback; the animation only follows it. Never autoplay. */
(() => {
  'use strict';
  const root = document.querySelector('.sound-playground');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const steps = [...root.querySelectorAll('[data-step]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pattern = [...DEFAULT_PATTERN], tempo = DEFAULT_TEMPO;
  let tone = DEFAULT_TONE, volume = DEFAULT_VOLUME, audio, instrument;
  let playing = false, starting = false, generation = 0;
  let timer = 0, frame = 0, nextTime = 0, nextStep = 0;
  const queue = [];
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
    generation++; starting = false; playing = false;
    clearInterval(timer); timer = 0;
    cancelAnimationFrame(frame); frame = 0; queue.length = 0;
    if (instrument) {
      const retired = instrument; instrument = null;
      retired.stop(); setTimeout(() => retired.dispose(), 110);
    }
    steps.forEach(button => button.classList.remove('is-current'));
    updateButton(); status(message);
  }
  function schedule() {
    if (!playing) return;
    if (audio.state !== 'running') { stop('Lecture interrompue. Relancez le motif quand vous voulez.'); return; }
    // Never catch up with a burst after a stalled tab: resume on a clean downbeat.
    if (nextTime < audio.currentTime - 0.1) {
      nextTime = audio.currentTime + 0.025; nextStep = 0; queue.length = 0;
    }
    while (nextTime < audio.currentTime + 0.08) {
      instrument.step(nextStep, nextTime, pattern);
      queue.push({ step: nextStep, time: nextTime });
      // A restrained 54% swing; quarter-note kicks remain evenly spaced.
      nextTime += 60 / tempo / 2 * (nextStep % 2 ? 0.92 : 1.08);
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
    const request = ++generation; starting = true;
    try {
      if (!audio) audio = new Context();
      await audio.resume();
      if (request !== generation) return;
      if (document.hidden || document.body.classList.contains('focus-mode')) { starting = false; return; }
      if (audio.state !== 'running') throw new Error('Audio unavailable');
      instrument = createInstrument(audio, { tempo, tone, volume });
      instrument.output.connect(audio.destination); instrument.start();
      starting = false; playing = true; nextStep = 0; nextTime = audio.currentTime + 0.05;
      updateButton(); status('Basse acid, accents et glissés. Ouvrez le timbre pour plus de mordant.');
      schedule(); timer = setInterval(schedule, 25); frame = requestAnimationFrame(animate);
    } catch (_) { if (request === generation) stop('Lecture indisponible. Vous pouvez toujours composer le motif visuel.'); }
  });
  steps.forEach((button, i) => button.addEventListener('click', () => {
    pattern[i] = !pattern[i]; draw();
    status(pattern.some(Boolean) ? `Pas ${i + 1} ${pattern[i] ? 'activé' : 'désactivé'}. Le motif se recompose.` : 'Tous les pas sont coupés. L’écho s’efface. Activez un pas pour retrouver le son.');
  }));
  $('#sound-tempo').addEventListener('input', event => {
    tempo = Number(event.target.value); $('#tempo-value').textContent = `${tempo} BPM`;
    instrument?.setTempo(tempo);
  });
  $('#sound-tone').addEventListener('input', event => {
    tone = Number(event.target.value) / 100; instrument?.setTone(tone);
    $('#tone-value').textContent = tone < 0.34 ? 'Rond' : tone < 0.67 ? 'Acid' : 'Incisif';
    event.target.setAttribute('aria-valuetext', $('#tone-value').textContent);
  });
  $('#sound-volume').addEventListener('input', event => {
    volume = Number(event.target.value) / 100; instrument?.setVolume(volume);
    $('#volume-value').textContent = `${Math.round(volume * 100)} %`;
  });
  $('#sound-reset').addEventListener('click', () => {
    stop('Motif, tempo et timbre réinitialisés. Votre volume est conservé.');
    pattern = [...DEFAULT_PATTERN]; tempo = DEFAULT_TEMPO; tone = DEFAULT_TONE;
    $('#sound-tempo').value = tempo; $('#tempo-value').textContent = `${tempo} BPM`;
    $('#sound-tone').value = tone * 100; $('#tone-value').textContent = 'Acid';
    $('#sound-tone').setAttribute('aria-valuetext', 'Acid'); draw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop('Lecture en pause. Relancez le motif quand vous voulez.'); if (audio) audio.suspend().catch(() => {}); }
  });
  window.addEventListener('pagehide', () => { stop(); if (audio) audio.suspend().catch(() => {}); });
  new MutationObserver(() => {
    if (document.body.classList.contains('focus-mode')) stop('Mode Focus : le son est en pause.');
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && (playing || starting)) stop('Lecture en pause. Votre motif reste en place.');
  }).observe(root);
  draw();
})();
