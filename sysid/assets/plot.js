/* plot.js — minimal SVG plotting for the interactive laboratories (no dependencies). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e); return e; };

  function niceTicks(a, b, n) {
    if (!(b > a)) { b = a + 1; }
    const span = b - a; const step0 = span / Math.max(1, n); const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag; const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const t = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return t;
  }
  function logTicks(a, b) { const e0 = Math.ceil(Math.log10(a) - 1e-9), e1 = Math.floor(Math.log10(b) + 1e-9); const st = Math.max(1, Math.ceil((e1 - e0 + 1) / 8)); const t = []; for (let e = e1; e >= e0; e -= st) t.unshift(Math.pow(10, e)); return t; }
  function fmtTick(v, log) {
    if (log) { const e = Math.round(Math.log10(v)); if (e >= -2 && e <= 3) return String(+v.toPrecision(3)); return '1e' + e; }
    const a = Math.abs(v); if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(0);
    return String(+v.toPrecision(6));
  }

  function Plot(container, o) {
    o = Object.assign({ w: 560, h: 320, ml: 54, mr: 14, mt: 26, mb: 42, xlim: [0, 1], ylim: [0, 1] }, o || {});
    const P = { o };
    const svg = el('svg', { viewBox: `0 0 ${o.w} ${o.h}`, class: 'plot', role: 'img' });
    if (o.title) svg.setAttribute('aria-label', o.title);
    container.appendChild(svg);
    P.svg = svg;
    const gGrid = el('g', { class: 'grid' }, svg);
    const clipId = 'clip' + Math.random().toString(36).slice(2);
    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: clipId }, defs);
    const clipRect = el('rect', {}, clip);
    ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'ag'].forEach(c => {
      const m = el('marker', { id: clipId + 'm' + c, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'fill-' + c }, m);
    });
    const gData = el('g', { 'clip-path': `url(#${clipId})` }, svg);
    const gOver = el('g', {}, svg);
    const gAxes = el('g', { class: 'axes' }, svg);
    const gHand = el('g', { class: 'handles' }, svg);
    P.g = gData; P.over = gOver;

    P.X = (x) => o.logx ? o.ml + (Math.log10(x) - Math.log10(o.xlim[0])) / (Math.log10(o.xlim[1]) - Math.log10(o.xlim[0])) * (o.w - o.ml - o.mr)
      : o.ml + (x - o.xlim[0]) / (o.xlim[1] - o.xlim[0]) * (o.w - o.ml - o.mr);
    P.Y = (y) => o.logy ? o.h - o.mb - (Math.log10(Math.max(y, 1e-300)) - Math.log10(o.ylim[0])) / (Math.log10(o.ylim[1]) - Math.log10(o.ylim[0])) * (o.h - o.mt - o.mb)
      : o.h - o.mb - (y - o.ylim[0]) / (o.ylim[1] - o.ylim[0]) * (o.h - o.mt - o.mb);
    P.invX = (px) => o.xlim[0] + (px - o.ml) / (o.w - o.ml - o.mr) * (o.xlim[1] - o.xlim[0]);
    P.invY = (py) => o.ylim[0] + (o.h - o.mb - py) / (o.h - o.mt - o.mb) * (o.ylim[1] - o.ylim[0]);

    const fixLim = (l, old, log) => { if (!l || !isFinite(l[0]) || !isFinite(l[1])) return old; let [a, b] = l;
      if (log) { a = Math.max(a, 1e-300); b = Math.max(b, a * 10); } else if (!(b > a)) { const c = (a + b) / 2, h = Math.max(Math.abs(c) * 0.1, 1); a = c - h; b = c + h; } return [a, b]; };
    P.setLimits = (xlim, ylim) => { if (xlim) o.xlim = fixLim(xlim, o.xlim, o.logx); if (ylim) o.ylim = fixLim(ylim, o.ylim, o.logy); P.drawAxes(); };
    P.equalAspect = () => {   // expand limits so that one unit has the same length on both axes
      const W = o.w - o.ml - o.mr, H = o.h - o.mt - o.mb;
      const sx = (o.xlim[1] - o.xlim[0]) / W, sy = (o.ylim[1] - o.ylim[0]) / H;
      if (sx > sy) { const c = (o.ylim[0] + o.ylim[1]) / 2, h = sx * H / 2; o.ylim = [c - h, c + h]; }
      else { const c = (o.xlim[0] + o.xlim[1]) / 2, w = sy * W / 2; o.xlim = [c - w, c + w]; }
    };
    P.drawAxes = () => {
      if (o.equal) P.equalAspect();
      gGrid.innerHTML = ''; gAxes.innerHTML = '';
      const x0 = o.ml, x1 = o.w - o.mr, y0 = o.mt, y1 = o.h - o.mb;
      clipRect.setAttribute('x', x0); clipRect.setAttribute('y', y0); clipRect.setAttribute('width', x1 - x0); clipRect.setAttribute('height', y1 - y0);
      const xt = o.xticks || (o.logx ? logTicks(o.xlim[0], o.xlim[1]) : niceTicks(o.xlim[0], o.xlim[1], o.nxt || 6));
      const yt = o.yticks || (o.logy ? logTicks(o.ylim[0], o.ylim[1]) : niceTicks(o.ylim[0], o.ylim[1], o.nyt || 5));
      xt.forEach(v => { const X = P.X(v); if (X < x0 - 0.5 || X > x1 + 0.5) return;
        el('line', { x1: X, x2: X, y1: y0, y2: y1, class: 'gl' }, gGrid);
        if (!o.noxlab) el('text', { x: X, y: y1 + 15, class: 'tick', 'text-anchor': 'middle' }, gAxes).textContent = o.xfmt ? o.xfmt(v) : fmtTick(v, o.logx); });
      yt.forEach(v => { const Y = P.Y(v); if (Y < y0 - 0.5 || Y > y1 + 0.5) return;
        el('line', { x1: x0, x2: x1, y1: Y, y2: Y, class: 'gl' }, gGrid);
        el('text', { x: x0 - 6, y: Y + 4, class: 'tick', 'text-anchor': 'end' }, gAxes).textContent = o.yfmt ? o.yfmt(v) : fmtTick(v, o.logy); });
      if (o.zeroLines) { if (o.ylim[0] < 0 && o.ylim[1] > 0) el('line', { x1: x0, x2: x1, y1: P.Y(0), y2: P.Y(0), class: 'zl' }, gGrid);
        if (o.xlim[0] < 0 && o.xlim[1] > 0) el('line', { x1: P.X(0), x2: P.X(0), y1: y0, y2: y1, class: 'zl' }, gGrid); }
      el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: 'frame' }, gAxes);
      if (o.xlabel) el('text', { x: (x0 + x1) / 2, y: o.h - 6, class: 'alab', 'text-anchor': 'middle' }, gAxes).textContent = o.xlabel;
      if (o.ylabel) { const t = el('text', { x: 13, y: (y0 + y1) / 2, class: 'alab', 'text-anchor': 'middle', transform: `rotate(-90 13 ${(y0 + y1) / 2})` }, gAxes); t.textContent = o.ylabel; }
      if (o.title) el('text', { x: (x0 + x1) / 2, y: 16, class: 'ptitle', 'text-anchor': 'middle' }, gAxes).textContent = o.title;
    };
    P.clear = () => { gData.innerHTML = ''; gOver.innerHTML = ''; P._legend = []; };
    P._legend = [];
    const cls = (c) => c ? (c.startsWith('#') || c.startsWith('rgb') ? '' : c) : 'a1';
    const sty = (c, extra) => (c && (c.startsWith('#') || c.startsWith('rgb')) ? `stroke:${c};fill:${c};` : '') + (extra || '');
    P.line = (xs, ys, s = {}) => {
      let d = '', pen = false;
      for (let i = 0; i < xs.length; i++) { const y = ys[i]; if (!isFinite(y) || (o.logy && y <= 0)) { pen = false; continue; }
        const X = P.X(xs[i]), Y = Math.max(-1e4, Math.min(1e4, P.Y(y))); d += (pen ? 'L' : 'M') + X.toFixed(2) + ',' + Y.toFixed(2); pen = true; }
      const p = el('path', { d, class: 'ln s-' + cls(s.color) + (s.dash ? ' dash' : '') + (s.dot ? ' dot' : ''), style: sty(s.color, (s.width ? `stroke-width:${s.width};` : '') + 'fill:none;') + (s.opacity ? `opacity:${s.opacity}` : '') }, s.over ? gOver : gData);
      if (s.label) P._legend.push({ label: s.label, type: 'line', color: s.color, dash: s.dash });
      return p;
    };
    P.fn = (f, a, b, s = {}) => { const n = s.n || 200; const xs = [], ys = []; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; xs.push(x); ys.push(f(x)); } return P.line(xs, ys, s); };
    P.stem = (xs, ys, s = {}) => {
      const g = el('g', { class: 'stem s-' + cls(s.color) }, gData); const base = o.logy ? o.ylim[0] : 0;
      xs.forEach((x, i) => { const y = ys[i]; if (!isFinite(y)) return;
        el('line', { x1: P.X(x), x2: P.X(x), y1: P.Y(base), y2: P.Y(y), class: 'ln s-' + cls(s.color), style: sty(s.color) }, g);
        el('circle', { cx: P.X(x), cy: P.Y(y), r: s.r || 2.6, class: 'mk f-' + cls(s.color), style: sty(s.color) }, g); });
      if (s.label) P._legend.push({ label: s.label, type: 'mark', color: s.color });
      return g;
    };
    P.scatter = (xs, ys, s = {}) => {
      const g = el('g', {}, s.over ? gOver : gData); const r = s.r || 3;
      const pts = [];
      xs.forEach((x, i) => { const y = ys[i]; if (!isFinite(y) || (o.logy && y <= 0)) return; const X = P.X(x), Y = P.Y(y); let m;
        if (s.marker === 'square') m = el('rect', { x: X - r, y: Y - r, width: 2 * r, height: 2 * r, class: 'mk ' + (s.hollow ? 'hollow s-' : 'f-') + cls(s.color), style: sty(s.color) }, g);
        else if (s.marker === 'x') { m = el('path', { d: `M${X - r},${Y - r}L${X + r},${Y + r}M${X - r},${Y + r}L${X + r},${Y - r}`, class: 'ln s-' + cls(s.color), style: sty(s.color, 'stroke-width:2') }, g); }
        else m = el('circle', { cx: X, cy: Y, r, class: 'mk ' + (s.hollow ? 'hollow s-' : 'f-') + cls(s.color), style: sty(s.color, s.opacity ? `opacity:${s.opacity}` : '') }, g);
        if (s.title) { const t = el('title', {}, m); t.textContent = typeof s.title === 'function' ? s.title(i) : s.title; }
        pts.push(m); });
      if (s.label) P._legend.push({ label: s.label, type: 'mark', color: s.color, hollow: s.hollow, marker: s.marker });
      return pts;
    };
    P.arrow = (x0, y0, x1, y1, s = {}) => el('line', { x1: P.X(x0), y1: P.Y(y0), x2: P.X(x1), y2: P.Y(y1), class: 'ln s-' + cls(s.color) + (s.dash ? ' dash' : ''),
      style: sty(s.color, `stroke-width:${s.width || 2.2};`), 'marker-end': `url(#${clipId}m${(s.color && !s.color.startsWith('#')) ? s.color : 'a1'})` }, s.over === false ? gData : gOver);
    P.seg = (x0, y0, x1, y1, s = {}) => el('line', { x1: P.X(x0), y1: P.Y(y0), x2: P.X(x1), y2: P.Y(y1), class: 'ln s-' + cls(s.color) + (s.dash ? ' dash' : ''), style: sty(s.color, (s.width ? `stroke-width:${s.width};` : '') + (s.opacity ? `opacity:${s.opacity};` : '')) }, gData);
    P.text = (x, y, str, s = {}) => { const t = el('text', { x: P.X(x) + (s.dx || 0), y: P.Y(y) + (s.dy || 0), class: 'ptext ' + (s.cls || '') + (s.color ? ' t-' + s.color : ''), 'text-anchor': s.anchor || 'start' }, gOver); t.textContent = str; return t; };
    P.circle = (cx, cy, r, s = {}) => el('ellipse', { cx: P.X(cx), cy: P.Y(cy), rx: Math.abs(P.X(cx + r) - P.X(cx)), ry: Math.abs(P.Y(cy + r) - P.Y(cy)),
      class: 'ln s-' + cls(s.color) + (s.dash ? ' dash' : '') + (s.fill ? ' fl-' + s.fill : ''), style: s.fill ? '' : 'fill:none' }, gData);
    P.poly = (xs, ys, s = {}) => el('polygon', { points: xs.map((x, i) => P.X(x) + ',' + P.Y(ys[i])).join(' '), class: 'poly fl-' + (s.fill || 'a1') + (s.stroke ? ' s-' + s.stroke : ''), style: s.opacity ? `fill-opacity:${s.opacity}` : '' }, gData);
    P.hline = (y, s = {}) => P.seg(o.xlim[0], y, o.xlim[1], y, Object.assign({ dash: true, color: 'ag' }, s));
    P.vline = (x, s = {}) => P.seg(x, o.ylim[0], x, o.ylim[1], Object.assign({ dash: true, color: 'ag' }, s));
    P.legend = (pos = 'ne') => {
      if (!P._legend.length) return;
      const g = el('g', { class: 'legend' }, gOver); const lh = 16; const w = Math.max(...P._legend.map(l => l.label.length)) * 6.6 + 34; const h = P._legend.length * lh + 8;
      let x = pos.includes('e') ? o.w - o.mr - w - 6 : o.ml + 6; let y = pos.includes('n') ? o.mt + 6 : o.h - o.mb - h - 6;
      el('rect', { x, y, width: w, height: h, rx: 4, class: 'legbg' }, g);
      P._legend.forEach((l, i) => { const yy = y + 12 + i * lh;
        if (l.type === 'line') el('line', { x1: x + 6, x2: x + 24, y1: yy, y2: yy, class: 'ln s-' + cls(l.color) + (l.dash ? ' dash' : ''), style: sty(l.color) }, g);
        else if (l.marker === 'square') el('rect', { x: x + 11, y: yy - 4, width: 8, height: 8, class: 'mk ' + (l.hollow ? 'hollow s-' : 'f-') + cls(l.color) }, g);
        else el('circle', { cx: x + 15, cy: yy, r: 3.5, class: 'mk ' + (l.hollow ? 'hollow s-' : 'f-') + cls(l.color), style: sty(l.color) }, g);
        el('text', { x: x + 30, y: yy + 4, class: 'legtext' }, g).textContent = l.label; });
    };
    // pointer position in data coordinates
    P.pointer = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [P.invX(q.x), P.invY(q.y), q.x, q.y]; };
    // draggable handle (persistent across clear(); call h.set(x, y) to move it)
    P.handle = (x, y, onmove, s = {}) => {
      const c = el('circle', { cx: P.X(x), cy: P.Y(y), r: s.r || 7, class: 'handle f-' + (s.color || 'a2'), tabindex: 0 }, gHand);
      if (s.title) { el('title', {}, c).textContent = s.title; }
      let drag = false;
      const move = (ev) => { if (!drag) return; ev.preventDefault(); const [dx, dy] = P.pointer(ev); onmove(dx, dy); };
      c.addEventListener('pointerdown', (ev) => { drag = true; c.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation(); });
      c.addEventListener('pointermove', move);
      c.addEventListener('pointerup', () => { drag = false; s.onend && s.onend(); });
      c.addEventListener('pointercancel', () => { drag = false; });
      const h = { el: c, x, y, set(nx, ny) { h.x = nx; h.y = ny; c.setAttribute('cx', P.X(nx)); c.setAttribute('cy', P.Y(ny)); }, remove() { c.remove(); } };
      return h;
    };
    P.clearHandles = () => { gHand.innerHTML = ''; };
    P.drawAxes();
    return P;
  }

  // heat map of a matrix as a grid of rects (diverging colours), returns svg
  function heat(container, M, o = {}) {
    const m = M.length, n = M[0].length; const cs = o.cell || Math.max(4, Math.min(26, Math.floor((o.maxw || 300) / n)));
    const W = n * cs, H = m * cs;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'heat', width: o.width, style: `max-width:${W}px` });
    let mx = o.max || 0; if (!mx) M.forEach(r => r.forEach(v => mx = Math.max(mx, Math.abs(v)))); mx = mx || 1;
    M.forEach((r, i) => r.forEach((v, j) => { const t = Math.max(-1, Math.min(1, v / mx));
      const col = t >= 0 ? `rgba(0,84,147,${Math.abs(t)})` : `rgba(190,30,45,${Math.abs(t)})`;
      const rc = el('rect', { x: j * cs, y: i * cs, width: cs, height: cs, fill: col, class: 'hcell', 'data-i': i, 'data-j': j }, svg);
      if (o.titles) el('title', {}, rc).textContent = o.titles(i, j, v); }));
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'hframe' }, svg);
    if (container) container.appendChild(svg);
    return svg;
  }

  window.Plot = Plot; window.Plot.heat = heat; window.Plot.el = el; window.Plot.niceTicks = niceTicks;
})();
