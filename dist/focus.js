/* One shared document, two reading modes. Nothing advances without a gesture. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const chapters = [
    {id:'accueil', label:'Présentation', root:'.hero', title:'#hero-title'},
    {id:'projet-galaxie', label:'Galaxie · design system', root:'#projets', title:'#projet-galaxie summary'},
    {id:'projet-mcp', label:'Plugins & agents', root:'#projets', title:'#projet-mcp summary'},
    {id:'projet-interfaces', label:'Interfaces & prototypes', root:'#projets', title:'#projet-interfaces summary'},
    {id:'laboratoire', label:'Le laboratoire', root:'#laboratoire', title:'#lab-title'},
    {id:'a-propos', label:'L’humain', root:'#a-propos', title:'#about-title'},
    {id:'parcours', label:'Le parcours', root:'#parcours', title:'#journey-title'},
    {id:'contact', label:'On en parle ?', root:'#contact', title:'#contact-title'}
  ];
  const roots = [...new Set(chapters.map(chapter => $(chapter.root)))];
  const projects = [...document.querySelectorAll('.project')];
  const storageKey = 'fxlow-focus-reading-v1';
  const read = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } };
  let saved;
  try { saved = JSON.parse(read(storageKey)); } catch (_) { /* Ignore an obsolete or damaged bookmark. */ }
  const savedIndex = chapters.findIndex(chapter => chapter.id === saved?.chapter);
  let active = Math.max(0, savedIndex), enabled = false, scrollTimer;
  let projectState = [], labExpanded = false;
  const jump = $('#focus-chapter');
  chapters.forEach((chapter, index) => {
    const option = document.createElement('option');
    option.value = String(index); option.textContent = `${String(index + 1).padStart(2, '0')} — ${chapter.label}`;
    jump.append(option);
  });

  function remember() {
    if (enabled) write(storageKey, JSON.stringify({chapter:chapters[active].id, scrollY:window.scrollY}));
  }
  function indexForHash(hash) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch (_) { return -1; }
    if (!id || id === 'main') return 0;
    const target = document.getElementById(id);
    if (!target) return -1;
    const project = target.closest('.project');
    return project ? chapters.findIndex(chapter => chapter.id === project.id) : chapters.findIndex(chapter => $(chapter.root).contains(target));
  }
  function visibleChapter() {
    let index = 0;
    chapters.forEach((chapter, i) => {
      const node = document.getElementById(chapter.id), box = node.getBoundingClientRect();
      if (box.height && box.top < innerHeight * .35) index = i;
    });
    return index;
  }
  function setLab(expanded) {
    labExpanded = expanded;
    $('#focus-lab-content').hidden = enabled && !expanded;
    $('#focus-lab-toggle').setAttribute('aria-expanded', String(expanded));
    $('#focus-lab-toggle').textContent = expanded ? 'Replier le laboratoire' : 'Essayer le laboratoire';
  }
  function moveToTitle() {
    const title = $(chapters[active].title);
    if (!title.hasAttribute('tabindex') && title.tagName !== 'SUMMARY') title.setAttribute('tabindex', '-1');
    title.focus({preventScroll:true});
    // Start with the context and progress visible, including on a small screen.
    window.scrollTo({top:0, behavior:'instant'});
  }
  function showChapter(index, {navigate = false, updateHash = false} = {}) {
    active = Math.max(0, Math.min(chapters.length - 1, index));
    const chapter = chapters[active];
    roots.forEach(root => { root.hidden = root !== $(chapter.root); });
    projects.forEach(project => {
      project.hidden = project.id !== chapter.id;
      if (!project.hidden) project.open = true;
    });
    if (active !== 4) setLab(false);
    jump.value = String(active);
    $('#focus-position').textContent = `${String(active + 1).padStart(2, '0')} / 08`;
    $('#focus-track-fill').style.width = `${(active + 1) / chapters.length * 100}%`;
    $('#focus-prev').disabled = active === 0;
    $('#focus-next small').textContent = active === chapters.length - 1 ? 'LECTURE TERMINÉE' : 'À SUIVRE';
    $('#focus-next-label').textContent = chapters[(active + 1) % chapters.length].label;
    $('#focus-next').setAttribute('aria-label', active === chapters.length - 1 ? 'Revenir à la présentation' : `Suivant : ${chapters[active + 1].label}`);
    if (updateHash && location.hash !== `#${chapter.id}`) history.pushState(null, '', `#${chapter.id}`);
    if (navigate) {
      moveToTitle();
      $('#focus-status').textContent = `Étape ${active + 1} sur 8 : ${chapter.label}.`;
    }
    remember();
  }
  function setFocus(value, {initial = false, exitTarget = null} = {}) {
    const startingAt = initial ? (location.hash ? indexForHash(location.hash) : savedIndex) : visibleChapter();
    if (enabled) remember();
    enabled = value;
    if (enabled) projectState = projects.map(project => project.open);
    document.body.classList.toggle('focus-mode', enabled);
    $('#focus-toggle').setAttribute('aria-pressed', String(enabled));
    $('#focus-toggle').title = enabled ? 'Retrouver la page complète' : 'Lire le portfolio une étape à la fois, sans animation ni son';
    $('#focus-label').textContent = enabled ? 'Quitter Focus' : 'Mode Focus';
    $('#focus-reader').hidden = !enabled;
    $('#focus-controls').hidden = !enabled;
    if (!write('florian-focus', String(enabled))) {
      $('.focus-hint').textContent = 'Une chose à la fois. Avancez à votre rythme. La mémorisation est indisponible dans ce navigateur.';
    }
    if (enabled) {
      setLab(false);
      const index = startingAt >= 0 ? startingAt : active;
      showChapter(index, {navigate:!initial});
      if (initial && savedIndex === index && Number.isFinite(saved?.scrollY)) {
        // Restore after fonts settle; never steal focus during a page load.
        document.fonts.ready.then(() => {
          if (enabled && active === index) window.scrollTo({top:Math.max(0, saved.scrollY), behavior:'instant'});
        });
      }
    } else {
      roots.forEach(root => { root.hidden = false; });
      projects.forEach((project, index) => {
        project.hidden = false;
        if (projectState.length) project.open = projectState[index];
      });
      setLab(false);
      if (!initial) {
        const target = exitTarget || document.getElementById(chapters[active].id);
        const project = target.closest('.project');
        if (project) project.open = true;
        target.scrollIntoView({block:'start', behavior:'instant'});
        if (exitTarget) {
          target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true});
        } else $('#focus-toggle').focus({preventScroll:true});
        $('#focus-status').textContent = 'Mode Exploration. La page complète est disponible.';
      }
    }
  }

  $('#focus-toggle').addEventListener('click', () => setFocus(!enabled));
  $('#focus-prev').addEventListener('click', () => showChapter(active - 1, {navigate:true, updateHash:true}));
  $('#focus-next').addEventListener('click', () => showChapter((active + 1) % chapters.length, {navigate:true, updateHash:true}));
  jump.addEventListener('change', () => showChapter(Number(jump.value), {navigate:true, updateHash:true}));
  $('#focus-lab-toggle').addEventListener('click', () => setLab(!labExpanded));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!enabled || !link) return;
    const hash = link.getAttribute('href'), index = indexForHash(hash);
    if (index < 0) return;
    event.preventDefault();
    if (link.hasAttribute('data-focus-exit')) {
      history.pushState(null, '', hash);
      setFocus(false, {exitTarget:document.querySelector(hash)});
    } else showChapter(index, {navigate:true, updateHash:true});
  });
  window.addEventListener('hashchange', () => {
    if (!enabled) return;
    const index = indexForHash(location.hash);
    if (index >= 0) showChapter(index, {navigate:true});
  });
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer); scrollTimer = setTimeout(remember, 150);
  }, {passive:true});
  window.addEventListener('pagehide', remember);
  setFocus(read('florian-focus') === 'true', {initial:true});
})();
