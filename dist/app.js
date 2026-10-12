(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const toast = $('#toast');
  let toastTimer;
  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }
  document.addEventListener('portfolio:notify', event => notify(event.detail));
  function setFocus(value, announce = false) {
    document.body.classList.toggle('focus-mode', value);
    $('#focus-toggle').setAttribute('aria-pressed', String(value));
    $('#focus-label').textContent = value ? 'Focus activé' : 'Mode Focus';
    if (announce) notify(value ? 'Mode Focus : les éléments s’alignent, les transitions s’arrêtent.' : 'Mode Exploration : les idées reprennent leur liberté.');
    try { localStorage.setItem('florian-focus', String(value)); } catch (_) { /* Optional preference storage. */ }
  }
  let focus = false;
  try { focus = localStorage.getItem('florian-focus') === 'true'; } catch (_) { /* Use default. */ }
  setFocus(focus);
  $('#focus-toggle').addEventListener('click', () => setFocus(!document.body.classList.contains('focus-mode'), true));

  const domains = {
    design: ['01', 'Des interfaces sensibles.\nDes systèmes qui tiennent debout.'],
    code: ['02', 'Du prototype au code de production.\nLes idées méritent de fonctionner.'],
    ia: ['03', 'Des agents outillés. Des contrats clairs.\nEt toujours l’humain pour décider.']
  };
  $$('.idea-node').forEach(node => node.addEventListener('click', () => {
    $$('.idea-node').forEach(item => {
      const active = node === item;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    const [index, message] = domains[node.dataset.domain];
    $('#note-index').textContent = index;
    $('#domain-text').replaceChildren();
    message.split('\n').forEach((line, i) => {
      if (i) $('#domain-text').append(document.createElement('br'));
      $('#domain-text').append(document.createTextNode(line));
    });
  }));

  // The platter accelerates smoothly; the leaf arm engages after it starts.
  const player = $('#vinyle');
  const disc = $('.record-disc');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = false, visible = false, entered = false;
  let angle = 0, speed = 0, frame = 0, lastFrame = 0;
  const motionAllowed = () => !motionPreference.matches && !document.body.classList.contains('focus-mode');
  function syncPlayer() {
    const allowed = motionAllowed();
    if (!allowed) playing = false;
    player.classList.toggle('is-playing', playing);
    player.setAttribute('aria-pressed', String(playing));
    player.setAttribute('aria-disabled', String(!allowed));
    const label = !allowed ? 'Animation désactivée' : playing ? 'Mettre en pause' : 'Lancer le vinyle';
    player.setAttribute('aria-label', label);
    $('.record-action-label').textContent = label;
    $('.record-action-icon').textContent = playing ? 'Ⅱ' : '▶';
    if (!allowed) {
      cancelAnimationFrame(frame); frame = 0; speed = 0; lastFrame = 0;
    } else if (visible && !document.hidden && (playing || speed > .2) && !frame) {
      lastFrame = 0; frame = requestAnimationFrame(turn);
    }
  }
  function turn(now) {
    frame = 0;
    if (!visible || document.hidden || !motionAllowed()) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((now-lastFrame)/1000, .05) : 0;
    lastFrame = now;
    const target = playing ? 200 : 0; // 33⅓ rpm.
    speed += (target-speed) * (1-Math.exp(-dt/(playing ? .65 : .9)));
    angle = (angle + speed*dt) % 360;
    disc.setAttribute('transform', `rotate(${angle} 160 175)`);
    if (playing || speed > .2) frame = requestAnimationFrame(turn);
    else { speed = 0; lastFrame = 0; }
  }
  player.addEventListener('click', () => {
    if (!motionAllowed()) return;
    playing = !playing;
    syncPlayer();
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !entered) { entered = true; playing = motionAllowed(); }
    syncPlayer();
  }, {threshold: .45}).observe(player);
  motionPreference.addEventListener('change', syncPlayer);
  new MutationObserver(syncPlayer).observe(document.body, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', syncPlayer);
  syncPlayer();
})();
