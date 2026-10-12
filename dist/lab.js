(() => {
  'use strict';
  const lab = document.querySelector('#laboratoire');
  if (!lab) return;
  const $ = selector => lab.querySelector(selector);
  const $$ = selector => [...lab.querySelectorAll(selector)];
  const announce = message => document.dispatchEvent(new CustomEvent('portfolio:notify', {detail:message}));
  const accents = {
    lime: {hex:'#e7fb70', name:'Citron'},
    lavender: {hex:'#c4b9fb', name:'Lavande'},
    peach: {hex:'#ffac8c', name:'Corail'}
  };
  const presets = {
    studio: {accent:'lime', mode:'light', radius:8, space:20},
    club: {accent:'lavender', mode:'dark', radius:24, space:12},
    table: {accent:'peach', mode:'light', radius:2, space:28}
  };
  const modes = {
    light: {canvas:'#f4f3ee', surface:'#ffffff', text:'#252720', muted:'#62675b', line:'#a5ab98'},
    dark: {canvas:'#252b25', surface:'#333b32', text:'#f4f3ee', muted:'#c5cebb', line:'#88947b'}
  };
  let state = {...presets.studio}, format = 'json', inspect = false, saved = false;
  let jsonText = '', cssText = '';
  const dimension = value => ({$type:'dimension', $value:{value, unit:'px'}});
  const alias = ($type, path) => ({$type, $value:`{${path}}`});
  const colorToken = hex => ({$type:'color', $value:{colorSpace:'srgb', components:[1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255), hex}});
  const luminance = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(v => v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  function contrast(a,b) {
    const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);
    return (values[0]+.05)/(values[1]+.05);
  }
  function setPressed(selector, predicate) {
    $$(selector).forEach(button => button.setAttribute('aria-pressed', String(predicate(button))));
  }
  function selectedRecipe() {
    return Object.keys(presets).find(key => Object.keys(state).every(prop => state[prop]===presets[key][prop]));
  }
  function renderCode() {
    $('#token-output').textContent = format==='json' ? jsonText : cssText;
    setPressed('[data-format]', el => el.dataset.format===format);
  }
  function update(message) {
    const mode = modes[state.mode];
    const accent = accents[state.accent];
    const values = {accent:accent.hex,'on-accent':'#252720',...mode,radius:`${state.radius}px`,space:`${state.space}px`};
    Object.entries(values).forEach(([key,value]) => $('#lab-preview').style.setProperty(`--sys-${key}`,value));
    $('#lab-preview').dataset.mode = state.mode;
    $('#lab-radius').value = state.radius;
    $('#lab-space').value = state.space;
    $('#radius-value').textContent = `${state.radius} px`;
    $('#space-value').textContent = `${state.space} px`;
    $('#lab-color-name').textContent = accent.name;
    const recipe = selectedRecipe();
    $('#lab-recipe').textContent = `${recipe ? recipe.toUpperCase() : 'MIX LIBRE'} · ${state.mode==='light' ? 'CLAIR' : 'SOMBRE'}`;
    setPressed('[data-preset]', el => el.dataset.preset===recipe);
    setPressed('[data-accent]', el => el.dataset.accent===state.accent);
    setPressed('[data-mode]', el => el.dataset.mode===state.mode);
    const ratio=contrast(accent.hex, values['on-accent']);
    $('#contrast-result').textContent = `Texte / accent · ${ratio.toFixed(1)}:1 · ${ratio>=4.5 ? 'AA ✓' : 'AA ✕'}`;
    $('#contrast-result').title = 'Contraste du texte principal sur la couleur d’accent. AA pour du texte normal à partir de 4,5:1.';
    $('#chain-source').textContent = `palette.${state.accent}`;
    const tokens = {
      $description:`Composition ${recipe || 'libre'} — mode ${state.mode}, FXLOW — Florian Cazé.`,
      palette: {...Object.fromEntries(Object.entries(accents).map(([key,v])=>[key,colorToken(v.hex)])), ink:colorToken('#252720')},
      color: {accent:alias('color',`palette.${state.accent}`), 'on-accent':alias('color','palette.ink'), ...Object.fromEntries(Object.entries(mode).map(([key,value])=>[key,colorToken(value)]))},
      radius: {control:dimension(state.radius)},
      space: {layout:dimension(state.space)},
      component: {
        button: {background:alias('color','color.accent'),text:alias('color','color.on-accent'),radius:alias('dimension','radius.control')},
        card: {background:alias('color','color.surface'),radius:alias('dimension','radius.control'),padding:alias('dimension','space.layout')},
        badge: {background:alias('color','color.accent'),text:alias('color','color.on-accent'),radius:alias('dimension','radius.control')},
        progress: {fill:alias('color','color.accent'),radius:alias('dimension','radius.control')},
        input: {background:alias('color','color.canvas'),text:alias('color','color.text'),radius:alias('dimension','radius.control')}
      }
    };
    jsonText = JSON.stringify(tokens,null,2);
    cssText = `/* FXLOW / f(x) — ${recipe || 'mix libre'} / ${state.mode} */\n:root {\n${Object.entries(values).map(([key,value])=>`  --sys-${key}: ${value};`).join('\n')}\n}\n\n/* Les composants consomment les mêmes décisions. */\n.system-button {\n  background: var(--sys-accent);\n  color: var(--sys-on-accent);\n  border-radius: var(--sys-radius);\n}\n\n.system-card {\n  background: var(--sys-surface);\n  border-radius: var(--sys-radius);\n}\n\n.idea-content, .session-card, .note-card {\n  padding: var(--sys-space);\n}`;
    renderCode();
    if (message) $('#lab-signal-text').textContent=message;
  }
  $$('[data-preset]').forEach(button => button.addEventListener('click',()=>{
    state={...presets[button.dataset.preset]};
    update(`${button.textContent.trim()} : couleur, lumière, forme et rythme se recomposent ensemble.`);
  }));
  $$('[data-accent]').forEach(button=>button.addEventListener('click',()=>{
    state.accent=button.dataset.accent;
    update('Une couleur partagée par l’illustration, le bouton, le badge et la progression.');
  }));
  $$('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    state.mode=button.dataset.mode;
    update('Les surfaces, textes et bordures changent de rôle ensemble.');
  }));
  $('#lab-radius').addEventListener('input',event=>{
    state.radius=Number(event.target.value);
    update(`Un rayon de ${state.radius} px partagé par les cartes, le champ, le bouton et le badge.`);
  });
  $('#lab-space').addEventListener('input',event=>{
    state.space=Number(event.target.value);
    update(`Un espacement de base de ${state.space} px. Toute l’interface trouve son rythme.`);
  });
  $('#lab-inspect').addEventListener('click',()=>{
    inspect=!inspect;
    $('#lab-inspect').setAttribute('aria-pressed',String(inspect));
    $('#lab-preview').classList.toggle('is-inspecting',inspect);
    $('#token-chain').hidden=!inspect;
    $('#lab-signal-text').textContent=inspect ? 'En violet : les composants reliés à vos tokens. Le trait plein suit la couleur d’accent.' : 'Changez une valeur. Suivez ce qui se transforme.';
  });
  function updateSession() {
    const count=$$('[data-session-task]').filter(el=>el.checked).length;
    $('#session-progress').value=count;
    $('#session-progress-label').textContent=`${count} / 3 étapes`;
  }
  $$('[data-session-task]').forEach(input=>input.addEventListener('change',updateSession));
  $('#session-name').addEventListener('input',event=>$('#session-caption').textContent=event.target.value.trim() || 'Session sans titre');
  $('#save-idea').addEventListener('click',()=>{
    saved=!saved;
    $('#save-idea').setAttribute('aria-pressed',String(saved));
    $('#save-idea span:first-child').textContent=saved ? 'Idée gardée' : 'Garder cette idée';
    $('#save-idea span:last-child').textContent=saved ? '✓' : '↗';
    $('#saved-count').textContent=saved ? '1 idée gardée' : '0 idée gardée';
    $('#lab-signal-text').textContent=saved ? 'Idée gardée pour cette démo. Son état change, son contrat reste le même.' : 'L’idée est à nouveau disponible. À vous de jouer.';
  });
  $('#lab-reset').addEventListener('click',()=>{
    state={...presets.studio};
    if(inspect)$('#lab-inspect').click();
    if(saved)$('#save-idea').click();
    $$('[data-session-task]').forEach((input,i)=>input.checked=i<2);
    $('#session-name').value='Composition libre';
    $('#session-caption').textContent='Composition libre';
    updateSession();
    update('Retour au Studio. Une nouvelle composition peut commencer.');
  });
  $$('[data-format]').forEach(button=>button.addEventListener('click',()=>{format=button.dataset.format;renderCode();}));
  $('#copy-token').addEventListener('click',async()=>{
    const text=format==='json' ? jsonText : cssText;
    try {await navigator.clipboard.writeText(text);announce(format==='json' ? 'Tokens DTCG copiés.' : 'Variables CSS copiées.');}
    catch (_) {
      $('#lab-source').open=true;
      const range=document.createRange();range.selectNodeContents($('#token-output'));
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      announce('Code sélectionné : utilisez ⌘C ou Ctrl+C pour le copier.');
    }
  });
  $('#download-token').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([format==='json' ? jsonText : cssText],{type:format==='json' ? 'application/json' : 'text/css'}));
    const link=document.createElement('a');link.href=url;link.download=`fxlow-${selectedRecipe() || 'mix-libre'}-${state.mode}.${format==='json' ? 'tokens.json' : 'css'}`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  update();
})();
