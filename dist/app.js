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

  const colors = {
    lime: {hex:'#e7fb70',label:'Citron électrique',short:'CITRON'},
    lavender: {hex:'#c4b9fb',label:'Lavande curieuse',short:'LAVANDE'},
    peach: {hex:'#ffac8c',label:'Corail spontané',short:'CORAIL'}
  };
  let color = 'lime';
  let theme = 'light';
  let tokenText;
  function updatePlayground() {
    const current = colors[color];
    $('#lab-stage').style.setProperty('--accent', current.hex);
    $('#lab-stage').dataset.theme = theme;
    $('#color-name').textContent = current.label;
    $('#lab-state').textContent = current.short + ' · ' + (theme === 'light' ? 'CLAIR' : 'SOMBRE');
    tokenText = JSON.stringify({color:{accent:{$type:'color',$value:current.hex},surface:{$type:'color',$value:theme === 'light' ? '#ffffff' : '#30362e'}}}, null, 2);
    $('#token-output').textContent = tokenText;
    $$('.swatch').forEach(button => {
      const selected = button.dataset.color === color;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('.segmented button').forEach(button => {
      const selected = button.dataset.theme === theme;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  $$('.swatch').forEach(button => button.addEventListener('click', () => { color = button.dataset.color; updatePlayground(); }));
  $$('.segmented button').forEach(button => button.addEventListener('click', () => { theme = button.dataset.theme; updatePlayground(); }));
  $('#demo-button').addEventListener('click', () => {
    notify('Connexion établie. Le composant répond, le système suit.');
    $('#demo-button').replaceChildren(document.createTextNode('Connexion établie '));
    const tick = document.createElement('span'); tick.textContent = '✓'; tick.setAttribute('aria-hidden','true'); $('#demo-button').append(tick);
    $('#demo-button').disabled = true;
    setTimeout(() => {
      $('#demo-button').replaceChildren(document.createTextNode('Tester le composant '));
      const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden','true'); $('#demo-button').append(arrow);
      $('#demo-button').disabled = false;
    }, 2000);
  });
  $('#copy-token').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(tokenText);
      notify('Tokens copiés. À vous de faire la prochaine connexion.');
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents($('#token-output'));
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      notify('Sélection prête : utilisez Ctrl+C ou ⌘C pour copier les tokens.');
    }
  });
  updatePlayground();
})();
