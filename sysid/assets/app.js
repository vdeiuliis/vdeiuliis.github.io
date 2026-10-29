/* app.js — navigation, previews, search, code cells and widget bootstrapping */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  // ---------------------------------------------------------------- sidebar, theme, font
  $('#navtoggle').addEventListener('click', () => { if (window.innerWidth > 1000) { document.body.classList.toggle('navhidden'); store.set('sid-nav', document.body.classList.contains('navhidden') ? 'h' : ''); } else document.body.classList.toggle('navopen'); });
  if (store.get('sid-nav') === 'h') document.body.classList.add('navhidden');
  $('#scrim').addEventListener('click', () => document.body.classList.remove('navopen'));
  $$('.sidebar a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('navopen')));
  $('#themebtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nx); store.set('sid-theme', nx);
    document.dispatchEvent(new Event('themechange'));
  });
  const fs = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 17;
  const setFs = (v) => { v = Math.max(13, Math.min(23, v)); document.documentElement.style.setProperty('--fs', v + 'px'); store.set('sid-font', v); };
  $('#fontplus').addEventListener('click', () => setFs(fs() + 1));
  $('#fontminus').addEventListener('click', () => setFs(fs() - 1));
  const cur = $('.navlist li.cur'); if (cur) cur.scrollIntoView({ block: 'center' });

  // scrollspy for section links
  const secLinks = $$('.navsec a');
  if (secLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(secLinks.map(a => [a.dataset.sec, a]));
    const vis = new Set();
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) vis.add(e.target.id); else vis.delete(e.target.id); });
      const heads = $$('h2.sec'); let best = null;
      for (const h of heads) { if (h.getBoundingClientRect().top < 140) best = h.id; }
      secLinks.forEach(a => a.classList.toggle('active', a.dataset.sec === best));
    }, { rootMargin: '-60px 0px -60% 0px' });
    $$('h2.sec').forEach(h => io.observe(h));
    window.addEventListener('scroll', () => { const heads = $$('h2.sec'); let best = null;
      for (const h of heads) { if (h.getBoundingClientRect().top < 140) best = h.id; }
      secLinks.forEach(a => a.classList.toggle('active', a.dataset.sec === best)); }, { passive: true });
  }

  // ---------------------------------------------------------------- MathJax helper
  const typeset = (els) => {
    if (window.MathJax && MathJax.typesetPromise) return MathJax.typesetPromise(els).catch(e => console.warn(e));
    return new Promise(res => document.addEventListener('mathjax-ready', () => MathJax.typesetPromise(els).then(res), { once: true }));
  };
  window.SID = { typeset };

  // ---------------------------------------------------------------- hover previews of cross references
  let pop = null, popTimer = null, hideTimer = null;
  const showPop = (a) => {
    let html = '', head = '';
    if (a.dataset.ref && window.REFS && REFS[a.dataset.ref]) { const r = REFS[a.dataset.ref]; head = r[1]; html = r[2]; }
    else if (a.dataset.cite && window.CITES && CITES[a.dataset.cite]) { const c = CITES[a.dataset.cite]; head = '[' + c[0] + ']'; html = c[1]; }
    if (!html) return;
    hidePop();
    pop = document.createElement('div'); pop.className = 'refpop';
    pop.innerHTML = '<div class="refpop-h">' + head + '</div>' + html;
    $$('.widget', pop).forEach(w => w.remove());
    $$('[id]', pop).forEach(e => e.removeAttribute('id'));
    document.body.appendChild(pop);
    const r = a.getBoundingClientRect(); const pw = pop.offsetWidth;
    let left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pw - 10);
    pop.style.left = Math.max(window.scrollX + 8, left) + 'px';
    const below = r.bottom + 8 + 360 < window.innerHeight;
    pop.style.top = (below ? window.scrollY + r.bottom + 6 : window.scrollY + r.top - Math.min(pop.offsetHeight, 360) - 6) + 'px';
    pop.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    pop.addEventListener('mouseleave', () => { hideTimer = setTimeout(hidePop, 200); });
    typeset([pop]);
  };
  const hidePop = () => { if (pop) { pop.remove(); pop = null; } };
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest && e.target.closest('a.xref, a.cite');
    if (!a || (pop && pop.contains(a))) return;
    clearTimeout(popTimer); clearTimeout(hideTimer);
    popTimer = setTimeout(() => showPop(a), 280);
    a.addEventListener('mouseleave', () => { clearTimeout(popTimer); hideTimer = setTimeout(hidePop, 250); }, { once: true });
  });

  // ---------------------------------------------------------------- search
  const sbox = $('#searchbox'), sin = $('#searchinput'), sres = $('#searchres');
  let loaded = false, sel = -1;
  const loadIndex = () => new Promise((res) => { if (window.SEARCH) return res();
    const s = document.createElement('script'); s.src = 'assets/search.js'; s.onload = res; document.head.appendChild(s); });
  const openSearch = () => { sbox.hidden = false; sin.focus(); sin.select(); loadIndex().then(() => { loaded = true; doSearch(); }); };
  const closeSearch = () => { sbox.hidden = true; };
  $('#searchbtn').addEventListener('click', openSearch);
  sbox.addEventListener('click', (e) => { if (e.target === sbox) closeSearch(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeSearch(); hidePop(); }
  });
  const escH = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const doSearch = () => {
    if (!loaded) return; const q = sin.value.trim().toLowerCase(); sel = -1;
    if (q.length < 2) { sres.innerHTML = '<div class="sr"><div>Type at least two characters.</div></div>'; return; }
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = [];
    for (const it of SEARCH) {
      const hay = (it.s + ' ' + it.x).toLowerCase(); let score = 0, ok = true;
      for (const t of terms) { const i = hay.indexOf(t); if (i < 0) { ok = false; break; } score += (it.s.toLowerCase().includes(t) ? 10 : 0) + 1 / (1 + i / 500); }
      if (ok) hits.push([score, it]);
    }
    hits.sort((a, b) => b[0] - a[0]);
    sres.innerHTML = hits.slice(0, 40).map(([, it]) => {
      const low = it.x.toLowerCase(); const i = low.indexOf(terms[0]); const st = Math.max(0, i - 70);
      let snip = escH(it.x.slice(st, st + 220));
      terms.forEach(t => { snip = snip.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
      return '<a class="sr" href="' + it.u + '"><small>' + escH(it.p) + '</small><br><b>' + escH(it.s) + '</b><div>' + (st > 0 ? '… ' : '') + snip + ' …</div></a>';
    }).join('') || '<div class="sr"><div>No results.</div></div>';
  };
  sin.addEventListener('input', doSearch);
  sin.addEventListener('keydown', (e) => { const items = $$('.sr[href]', sres); if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((x, i) => x.classList.toggle('sel', i === sel)); items[sel].scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { (items[sel] || items[0]).click(); closeSearch(); } });
  sres.addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });

  // ---------------------------------------------------------------- code blocks: copy and run (Pyodide)
  let pyodideP = null;
  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  const getPyodide = (status) => {
    if (pyodideP) return pyodideP;
    pyodideP = new Promise((res, rej) => {
      status('Loading Python (Pyodide, ~15 MB, first time only)…');
      const s = document.createElement('script'); s.src = PYODIDE + 'pyodide.js';
      s.onerror = () => rej(new Error('Could not load Pyodide: an internet connection is required to run Python in the browser.'));
      s.onload = async () => {
        try {
          const py = await loadPyodide({ indexURL: PYODIDE });
          status('Loading numpy and scipy…');
          await py.loadPackage(['numpy', 'scipy']);
          await new Promise((r2) => { if (window.PYFILES) return r2(); const t = document.createElement('script'); t.src = 'assets/pyfiles.js'; t.onload = r2; t.onerror = r2; document.head.appendChild(t); });
          if (window.PYFILES) for (const [name, txt] of Object.entries(PYFILES)) py.FS.writeFile(name, txt);
          res(py);
        } catch (e) { rej(e); }
      };
      document.head.appendChild(s);
    });
    return pyodideP;
  };
  $$('.code').forEach(box => {
    const pre = $('pre', box), src = $('textarea.code-src', box);
    const copyBtn = $('.copy', box), runBtn = $('.run', box);
    const text = () => box.dataset.edited ? pre.innerText : src.value;
    copyBtn.addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(text()).then(() => {
      copyBtn.textContent = 'Copied'; setTimeout(() => copyBtn.textContent = 'Copy', 1200); }); });
    if (!runBtn) return;
    // allow editing
    const edit = document.createElement('button'); edit.className = 'code-btn'; edit.textContent = 'Edit';
    runBtn.before(edit);
    edit.addEventListener('click', () => { pre.contentEditable = 'true'; pre.spellcheck = false; box.dataset.edited = '1'; pre.textContent = pre.innerText; pre.focus(); edit.remove(); });
    runBtn.addEventListener('click', async () => {
      let out = $('.out', box); if (!out) { out = document.createElement('div'); out.className = 'out'; box.appendChild(out); }
      out.classList.remove('err'); runBtn.disabled = true;
      const status = (m) => { out.textContent = m; };
      try {
        const py = await getPyodide(status);
        if (/trabocco\.jpg/.test(text()) && !py._img) {
          status('Loading the image…');
          await new Promise((r2) => { if (window.TRABOCCO_JPG) return r2(); const t = document.createElement('script'); t.src = 'assets/trabocco.js'; t.onload = r2; document.head.appendChild(t); });
          await py.loadPackage(['pillow']);
          const bin = Uint8Array.from(atob(window.TRABOCCO_JPG), c => c.charCodeAt(0)); py.FS.writeFile('trabocco.jpg', bin); py._img = true;
        }
        status('Running…');
        let buf = '';
        py.setStdout({ batched: (s) => { buf += s + '\n'; } }); py.setStderr({ batched: (s) => { buf += s + '\n'; } });
        await py.loadPackagesFromImports(text());
        const r = await py.runPythonAsync(text());
        if (r !== undefined && r !== null) buf += String(r);
        out.textContent = buf || '(no output)';
      } catch (e) { out.classList.add('err'); out.textContent = String(e.message || e); }
      runBtn.disabled = false;
    });
  });

  // ---------------------------------------------------------------- widgets: lazy initialisation, presets from the hash
  const inited = new Map();
  const initWidget = (el) => {
    if (inited.has(el)) return inited.get(el);
    const name = el.dataset.widget; const W = window.WIDGETS && WIDGETS[name];
    if (!W) { el.innerHTML = '<div class="w-loading">Widget “' + name + '” not available.</div>'; inited.set(el, null); return null; }
    let api = null;
    try { api = W(el) || {}; } catch (e) { console.error(e); el.innerHTML += '<div class="w-err">Error: ' + e.message + '</div>'; }
    inited.set(el, api); return api;
  };
  const widgets = $$('.widget');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => ents.forEach(e => { if (e.isIntersecting) { initWidget(e.target); io.unobserve(e.target); } }), { rootMargin: '600px 0px' });
    widgets.forEach(w => io.observe(w));
  } else widgets.forEach(initWidget);
  const handleHash = () => {
    const h = decodeURIComponent(location.hash.slice(1)); if (!h.startsWith('w-')) return;
    const [id, preset] = h.split(':'); const el = document.getElementById(id); if (!el) return;
    const api = initWidget(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (preset && api && api.preset) setTimeout(() => api.preset(preset), 60);
  };
  window.addEventListener('hashchange', handleHash);
  $$('a.ex-link').forEach(a => a.addEventListener('click', (e) => {
    if (a.getAttribute('href').startsWith('#') && location.hash === a.getAttribute('href')) { e.preventDefault(); handleHash(); } }));
  if (location.hash.startsWith('#w-')) setTimeout(handleHash, 300);
})();
