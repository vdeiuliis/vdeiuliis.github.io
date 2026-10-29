/* la.js — a small dense linear-algebra library for the interactive laboratories.
   Matrices are arrays of row arrays. All routines are written for clarity on small/medium sizes. */
(function () {
  'use strict';
  const LA = {};

  // ------------------------------------------------------------------ construction
  LA.zeros = (m, n) => Array.from({ length: m }, () => new Array(n).fill(0));
  LA.eye = (n) => { const I = LA.zeros(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; };
  LA.clone = (A) => A.map(r => r.slice());
  LA.size = (A) => [A.length, A.length ? A[0].length : 0];
  LA.T = (A) => { const [m, n] = LA.size(A); const B = LA.zeros(n, m);
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) B[j][i] = A[i][j]; return B; };
  LA.diag = (v) => { const D = LA.zeros(v.length, v.length); v.forEach((x, i) => D[i][i] = x); return D; };
  LA.col = (A, j) => A.map(r => r[j]);
  LA.cols = (A, j0, j1) => A.map(r => r.slice(j0, j1));
  LA.rows = (A, i0, i1) => A.slice(i0, i1).map(r => r.slice());
  LA.fromCols = (cols) => { const m = cols[0].length; return Array.from({ length: m }, (_, i) => cols.map(c => c[i])); };
  LA.hcat = (...Ms) => Ms[0].map((r, i) => [].concat(...Ms.map(M => M[i])));
  LA.vcat = (...Ms) => [].concat(...Ms.map(M => LA.clone(M)));

  // ------------------------------------------------------------------ arithmetic
  LA.mul = (A, B) => {
    const m = A.length, k = B.length, n = B[0].length; const C = LA.zeros(m, n);
    for (let i = 0; i < m; i++) { const Ai = A[i], Ci = C[i];
      for (let p = 0; p < k; p++) { const a = Ai[p]; if (a === 0) continue; const Bp = B[p];
        for (let j = 0; j < n; j++) Ci[j] += a * Bp[j]; } }
    return C;
  };
  LA.mv = (A, x) => A.map(r => r.reduce((s, a, j) => s + a * x[j], 0));
  LA.add = (A, B) => A.map((r, i) => r.map((a, j) => a + B[i][j]));
  LA.sub = (A, B) => A.map((r, i) => r.map((a, j) => a - B[i][j]));
  LA.scale = (A, c) => A.map(r => r.map(a => a * c));
  LA.dot = (x, y) => x.reduce((s, a, i) => s + a * y[i], 0);
  LA.norm = (x) => Math.sqrt(LA.dot(x, x));
  LA.vadd = (x, y) => x.map((a, i) => a + y[i]);
  LA.vsub = (x, y) => x.map((a, i) => a - y[i]);
  LA.vscale = (x, c) => x.map(a => a * c);
  LA.fro = (A) => Math.sqrt(A.reduce((s, r) => s + r.reduce((t, a) => t + a * a, 0), 0));
  LA.pow = (A, k) => { let R = LA.eye(A.length); for (let i = 0; i < k; i++) R = LA.mul(R, A); return R; };
  LA.mean = (x) => x.reduce((s, a) => s + a, 0) / x.length;
  LA.std = (x) => { const m = LA.mean(x); return Math.sqrt(x.reduce((s, a) => s + (a - m) * (a - m), 0) / Math.max(1, x.length - 1)); };
  LA.rms = (x) => Math.sqrt(x.reduce((s, a) => s + a * a, 0) / x.length);

  // ------------------------------------------------------------------ random numbers (seeded)
  LA.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const uni = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    let spare = null;
    const randn = () => { if (spare !== null) { const s = spare; spare = null; return s; }
      let u, v, s; do { u = 2 * uni() - 1; v = 2 * uni() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
      const f = Math.sqrt(-2 * Math.log(s) / s); spare = v * f; return u * f; };
    return { uni, randn, randnv: (n) => Array.from({ length: n }, randn),
      randnm: (m, n) => Array.from({ length: m }, () => Array.from({ length: n }, randn)),
      uniform: (a0, b0) => a0 + (b0 - a0) * uni() };
  };

  // ------------------------------------------------------------------ solving
  LA.solve = (A, b) => {   // Gaussian elimination with partial pivoting; b vector or matrix
    const n = A.length; const M = LA.clone(A); const isVec = !Array.isArray(b[0]);
    let B = isVec ? b.map(x => [x]) : LA.clone(b);
    for (let k = 0; k < n; k++) {
      let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      [M[k], M[p]] = [M[p], M[k]]; [B[k], B[p]] = [B[p], B[k]];
      const piv = M[k][k]; if (Math.abs(piv) < 1e-300) throw new Error('singular matrix');
      for (let i = k + 1; i < n; i++) { const f = M[i][k] / piv; if (!f) continue;
        for (let j = k; j < n; j++) M[i][j] -= f * M[k][j];
        for (let j = 0; j < B[0].length; j++) B[i][j] -= f * B[k][j]; }
    }
    for (let k = n - 1; k >= 0; k--) for (let j = 0; j < B[0].length; j++) {
      let s = B[k][j]; for (let i = k + 1; i < n; i++) s -= M[k][i] * B[i][j]; B[k][j] = s / M[k][k]; }
    return isVec ? B.map(r => r[0]) : B;
  };
  LA.inv = (A) => LA.solve(A, LA.eye(A.length));
  LA.det = (A) => { const n = A.length; const M = LA.clone(A); let d = 1;
    for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (M[p][k] === 0) return 0; if (p !== k) { [M[k], M[p]] = [M[p], M[k]]; d = -d; } d *= M[k][k];
      for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; for (let j = k; j < n; j++) M[i][j] -= f * M[k][j]; } }
    return d; };

  // ------------------------------------------------------------------ Householder QR (thin)
  LA.qr = (A) => {
    const m = A.length, n = A[0].length; const R = LA.clone(A); const vs = [];
    const kmax = Math.min(m - 1, n);
    for (let k = 0; k < Math.min(m, n); k++) {
      let nrm = 0; for (let i = k; i < m; i++) nrm += R[i][k] * R[i][k]; nrm = Math.sqrt(nrm);
      const v = new Array(m).fill(0);
      if (nrm === 0 || k >= m) { vs.push(null); continue; }
      const alpha = R[k][k] > 0 ? -nrm : nrm;
      for (let i = k; i < m; i++) v[i] = R[i][k]; v[k] -= alpha;
      let vn = 0; for (let i = k; i < m; i++) vn += v[i] * v[i];
      if (vn === 0) { vs.push(null); continue; }
      for (let j = k; j < n; j++) { let s = 0; for (let i = k; i < m; i++) s += v[i] * R[i][j]; s = 2 * s / vn;
        for (let i = k; i < m; i++) R[i][j] -= s * v[i]; }
      vs.push([v, vn]);
    }
    const p = Math.min(m, n);
    // build thin Q (m x p) by applying reflections to the first p columns of I
    const Q = LA.zeros(m, p); for (let i = 0; i < p; i++) Q[i][i] = 1;
    for (let k = vs.length - 1; k >= 0; k--) { if (!vs[k]) continue; const [v, vn] = vs[k];
      for (let j = 0; j < p; j++) { let s = 0; for (let i = k; i < m; i++) s += v[i] * Q[i][j]; s = 2 * s / vn;
        if (s) for (let i = k; i < m; i++) Q[i][j] -= s * v[i]; } }
    const Rt = LA.zeros(p, n); for (let i = 0; i < p; i++) for (let j = i; j < n; j++) Rt[i][j] = R[i][j];
    return { Q, R: Rt };
  };
  // R factor only, for tall matrices (used by the LQ implementation of MOESP)
  LA.qrR = (A) => LA.qr(A).R;
  LA.backsub = (R, b) => { const n = R.length; const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j]; x[i] = s / R[i][i]; }
    return x; };
  LA.lstsqQR = (A, y) => { const { Q, R } = LA.qr(A); return LA.backsub(R, LA.mv(LA.T(Q), y)); };

  // ------------------------------------------------------------------ SVD (one-sided Jacobi)
  LA.svd = (A0) => {
    let [m, n] = LA.size(A0); let flip = false; let A = A0;
    if (m < n) { A = LA.T(A0); [m, n] = [n, m]; flip = true; }
    // work on columns
    const U = LA.T(A);           // n rows, each a column of A (length m)
    const V = LA.eye(n);         // rows = columns of V
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
        const up = U[p], uq = U[q]; let a = 0, b = 0, c = 0;
        for (let i = 0; i < m; i++) { a += up[i] * up[i]; b += uq[i] * uq[i]; c += up[i] * uq[i]; }
        if (Math.abs(c) <= 1e-15 * Math.sqrt(a * b) || c === 0) continue;
        off = Math.max(off, Math.abs(c) / Math.sqrt(a * b));
        const zeta = (b - a) / (2 * c); const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const cs = 1 / Math.sqrt(1 + t * t), sn = cs * t;
        for (let i = 0; i < m; i++) { const x = up[i], y = uq[i]; up[i] = cs * x - sn * y; uq[i] = sn * x + cs * y; }
        const vp = V[p], vq = V[q];
        for (let i = 0; i < n; i++) { const x = vp[i], y = vq[i]; vp[i] = cs * x - sn * y; vq[i] = sn * x + cs * y; }
      }
      if (off < 1e-15) break;
    }
    let s = U.map(u => Math.sqrt(u.reduce((t, x) => t + x * x, 0)));
    const order = s.map((x, i) => i).sort((i, j) => s[j] - s[i]);
    s = order.map(i => s[i]);
    const smax = s[0] || 1;
    let Ucols = order.map((i, k) => s[k] > 1e-300 && s[k] > smax * 1e-300 ? U[i].map(x => x / s[k]) : null);
    const Vcols = order.map(i => V[i]);
    // complete null columns of U to an orthonormal set
    Ucols = LA._completeCols(Ucols, m);
    let Um = LA.fromCols(Ucols), Vm = LA.fromCols(Vcols);
    if (flip) return { U: Vm, s, V: Um };
    return { U: Um, s, V: Vm };
  };
  // replace null entries by vectors orthonormal to the others (Gram-Schmidt against e_i)
  LA._completeCols = (cols, m) => {
    const out = cols.slice(); const good = out.filter(c => c);
    for (let k = 0; k < out.length; k++) if (!out[k]) {
      for (let e = 0; e < m; e++) {
        let v = new Array(m).fill(0); v[e] = 1;
        for (let pass = 0; pass < 2; pass++) for (const g of good) { const d = LA.dot(g, v); v = v.map((x, i) => x - d * g[i]); }
        const nv = LA.norm(v); if (nv > 1e-8) { v = v.map(x => x / nv); out[k] = v; good.push(v); break; }
      }
    }
    return out;
  };
  // full orthonormal completion of the columns of U (m x r) to m columns
  LA.complete = (U, m) => { const cols = U.length ? LA.T(U) : []; const r = cols.length;
    const all = cols.concat(new Array(m - r).fill(null)); return LA.fromCols(LA._completeCols(all, m)); };
  LA.svals = (A) => LA.svd(A).s;
  LA.rank = (A, tol) => { const s = LA.svals(A); const t = tol !== undefined ? tol : Math.max(A.length, A[0].length) * (s[0] || 0) * 2.22e-16;
    return s.filter(x => x > t).length; };
  LA.pinv = (A, tol) => { const { U, s, V } = LA.svd(A); const t = tol !== undefined ? tol : Math.max(A.length, A[0].length) * (s[0] || 0) * 2.22e-16;
    const m = A.length, n = A[0].length; const P = LA.zeros(n, m);
    s.forEach((sv, k) => { if (sv > t) for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) P[i][j] += V[i][k] * U[j][k] / sv; });
    return P; };
  LA.lstsq = (A, y) => LA.mv(LA.pinv(A), y);
  LA.cond = (A) => { const s = LA.svals(A); return s[0] / s[s.length - 1]; };

  // ------------------------------------------------------------------ symmetric eigen (Jacobi)
  LA.eigSym = (S) => {
    const n = S.length; const A = LA.clone(S); const V = LA.eye(n);
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-30) break;
      for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]); const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const x = A[k][p], y = A[k][q]; A[k][p] = c * x - s * y; A[k][q] = s * x + c * y; }
        for (let k = 0; k < n; k++) { const x = A[p][k], y = A[q][k]; A[p][k] = c * x - s * y; A[q][k] = s * x + c * y; }
        for (let k = 0; k < n; k++) { const x = V[k][p], y = V[k][q]; V[k][p] = c * x - s * y; V[k][q] = s * x + c * y; }
      }
    }
    const vals = A.map((r, i) => r[i]); const order = vals.map((x, i) => i).sort((i, j) => vals[j] - vals[i]);
    return { values: order.map(i => vals[i]), vectors: LA.fromCols(order.map(i => LA.col(V, i))) };
  };

  // ------------------------------------------------------------------ general eigenvalues (Hessenberg + shifted QR, JAMA hqr2 without vectors)
  LA.eig = (A0) => {
    const n = A0.length; if (n === 0) return [];
    if (n === 1) return [{ re: A0[0][0], im: 0 }];
    const H = LA.clone(A0);
    // reduce to Hessenberg form (orthes)
    const ort = new Array(n).fill(0);
    for (let m = 1; m <= n - 2; m++) {
      let scale = 0; for (let i = m; i < n; i++) scale += Math.abs(H[i][m - 1]);
      if (scale !== 0) {
        let h = 0; for (let i = n - 1; i >= m; i--) { ort[i] = H[i][m - 1] / scale; h += ort[i] * ort[i]; }
        let g = Math.sqrt(h); if (ort[m] > 0) g = -g; h -= ort[m] * g; ort[m] -= g;
        for (let j = m; j < n; j++) { let f = 0; for (let i = n - 1; i >= m; i--) f += ort[i] * H[i][j]; f /= h; for (let i = m; i < n; i++) H[i][j] -= f * ort[i]; }
        for (let i = 0; i < n; i++) { let f = 0; for (let j = n - 1; j >= m; j--) f += ort[j] * H[i][j]; f /= h; for (let j = m; j < n; j++) H[i][j] -= f * ort[j]; }
        ort[m] = scale * ort[m]; H[m][m - 1] = scale * g;
      }
    }
    // hqr
    const d = new Array(n).fill(0), e = new Array(n).fill(0);
    let nn = n - 1; const low = 0, high = n - 1; const eps = Math.pow(2, -52); let exshift = 0;
    let p = 0, q = 0, r = 0, s = 0, z = 0, t, w, x, y;
    let norm = 0; for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) norm += Math.abs(H[i][j]);
    let iter = 0;
    while (nn >= low) {
      let l = nn;
      while (l > low) { s = Math.abs(H[l - 1][l - 1]) + Math.abs(H[l][l]); if (s === 0) s = norm; if (Math.abs(H[l][l - 1]) < eps * s) break; l--; }
      if (l === nn) { H[nn][nn] += exshift; d[nn] = H[nn][nn]; e[nn] = 0; nn--; iter = 0; }
      else if (l === nn - 1) {
        w = H[nn][nn - 1] * H[nn - 1][nn]; p = (H[nn - 1][nn - 1] - H[nn][nn]) / 2; q = p * p + w; z = Math.sqrt(Math.abs(q));
        H[nn][nn] += exshift; H[nn - 1][nn - 1] += exshift; x = H[nn][nn];
        if (q >= 0) { z = p >= 0 ? p + z : p - z; d[nn - 1] = x + z; d[nn] = d[nn - 1]; if (z !== 0) d[nn] = x - w / z; e[nn - 1] = 0; e[nn] = 0; }
        else { d[nn - 1] = x + p; d[nn] = x + p; e[nn - 1] = z; e[nn] = -z; }
        nn -= 2; iter = 0;
      } else {
        x = H[nn][nn]; y = 0; w = 0;
        if (l < nn) { y = H[nn - 1][nn - 1]; w = H[nn][nn - 1] * H[nn - 1][nn]; }
        if (iter === 10) { exshift += x; for (let i = low; i <= nn; i++) H[i][i] -= x; s = Math.abs(H[nn][nn - 1]) + Math.abs(H[nn - 1][nn - 2]); x = y = 0.75 * s; w = -0.4375 * s * s; }
        if (iter === 30) { s = (y - x) / 2; s = s * s + w; if (s > 0) { s = Math.sqrt(s); if (y < x) s = -s; s = x - w / ((y - x) / 2 + s);
          for (let i = low; i <= nn; i++) H[i][i] -= s; exshift += s; x = y = w = 0.964; } }
        iter++; if (iter > 500) break;
        let m = nn - 2;
        while (m >= l) { z = H[m][m]; r = x - z; s = y - z; p = (r * s - w) / H[m + 1][m] + H[m][m + 1]; q = H[m + 1][m + 1] - z - r - s; r = H[m + 2][m + 1];
          s = Math.abs(p) + Math.abs(q) + Math.abs(r); p /= s; q /= s; r /= s; if (m === l) break;
          if (Math.abs(H[m][m - 1]) * (Math.abs(q) + Math.abs(r)) < eps * (Math.abs(p) * (Math.abs(H[m - 1][m - 1]) + Math.abs(z) + Math.abs(H[m + 1][m + 1])))) break; m--; }
        for (let i = m + 2; i <= nn; i++) { H[i][i - 2] = 0; if (i > m + 2) H[i][i - 3] = 0; }
        for (let k = m; k <= nn - 1; k++) {
          const notlast = (k !== nn - 1);
          if (k !== m) { p = H[k][k - 1]; q = H[k + 1][k - 1]; r = notlast ? H[k + 2][k - 1] : 0; x = Math.abs(p) + Math.abs(q) + Math.abs(r); if (x === 0) continue; p /= x; q /= x; r /= x; }
          s = Math.sqrt(p * p + q * q + r * r); if (p < 0) s = -s;
          if (s !== 0) {
            if (k !== m) H[k][k - 1] = -s * x; else if (l !== m) H[k][k - 1] = -H[k][k - 1];
            p += s; x = p / s; y = q / s; z = r / s; q /= p; r /= p;
            for (let j = k; j < n; j++) { p = H[k][j] + q * H[k + 1][j]; if (notlast) { p += r * H[k + 2][j]; H[k + 2][j] -= p * z; } H[k][j] -= p * x; H[k + 1][j] -= p * y; }
            for (let i = 0; i <= Math.min(nn, k + 3); i++) { p = x * H[i][k] + y * H[i][k + 1]; if (notlast) { p += z * H[i][k + 2]; H[i][k + 2] -= p * r; } H[i][k] -= p; H[i][k + 1] -= p * q; }
          }
        }
      }
    }
    const out = d.map((re, i) => ({ re, im: e[i] }));
    out.sort((a, b) => (b.re - a.re) || (b.im - a.im));
    return out;
  };
  // roots of a polynomial c[0] x^n + ... + c[n] (companion matrix)
  LA.roots = (c) => {
    c = c.slice(); while (c.length && Math.abs(c[0]) < 1e-14) c.shift();
    let nz = 0; while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-14) { c.pop(); nz++; }
    const n = c.length - 1; const zeros = Array.from({ length: nz }, () => ({ re: 0, im: 0 }));
    if (n < 1) return zeros;
    const M = LA.zeros(n, n);
    for (let j = 0; j < n; j++) M[0][j] = -c[j + 1] / c[0];
    for (let i = 1; i < n; i++) M[i][i - 1] = 1;
    return LA.eig(M).concat(zeros);
  };
  LA.cabs = (z) => Math.hypot(z.re, z.im);
  // characteristic polynomial coefficients (Faddeev-LeVerrier), [1, c1, ..., cn]
  LA.charpoly = (A) => { const n = A.length; let M = LA.zeros(n, n); const c = [1];
    for (let k = 1; k <= n; k++) { M = LA.add(LA.mul(A, M), LA.scale(LA.eye(n), c[k - 1])); const AM = LA.mul(A, M);
      let tr = 0; for (let i = 0; i < n; i++) tr += AM[i][i]; c.push(-tr / k); }
    return c; };
  LA.polyval = (c, x) => c.reduce((s, a) => s * x + a, 0);
  LA.polymul = (a, b) => { const r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => r[i + j] += x * y)); return r; };

  // ------------------------------------------------------------------ signals and systems
  LA.filter = (b, a, u) => {     // MATLAB filter: a(1) y(k) = sum b(i) u(k-i) - sum_{i>=1} a(i) y(k-i)
    const N = u.length, y = new Array(N).fill(0); const a0 = a[0];
    for (let k = 0; k < N; k++) { let s = 0;
      for (let i = 0; i < b.length; i++) if (k - i >= 0) s += b[i] * u[k - i];
      for (let i = 1; i < a.length; i++) if (k - i >= 0) s -= a[i] * y[k - i];
      y[k] = s / a0; }
    return y;
  };
  // simulate x(k+1)=Ax+Bu, y=Cx+Du ; u: array of input vectors (N x p); returns {y: N x q, x: N x n}
  LA.simss = (A, B, C, D, u, x0) => {
    const n = A.length; let x = x0 ? x0.slice() : new Array(n).fill(0); const Y = [], X = [];
    for (let k = 0; k < u.length; k++) { X.push(x.slice());
      const yk = LA.vadd(LA.mv(C, x), LA.mv(D, u[k])); Y.push(yk);
      x = LA.vadd(LA.mv(A, x), LA.mv(B, u[k])); }
    return { y: Y, x: X };
  };
  LA.markov = (A, B, C, D, N) => { const W = [D]; let Ak = LA.eye(A.length);
    for (let k = 1; k < N; k++) { W.push(LA.mul(LA.mul(C, Ak), B)); Ak = LA.mul(A, Ak); } return W; };
  LA.fit = (y, yh) => { const m = LA.mean(y); let a = 0, b = 0; for (let i = 0; i < y.length; i++) { a += (y[i] - yh[i]) ** 2; b += (y[i] - m) ** 2; } return 100 * (1 - Math.sqrt(a / b)); };

  // Ho-Kalman (Kung) : W array of q x p matrices, W[0] = D
  LA.hokalman = (W, s, l, n) => {
    const q = W[0].length, p = W[0][0].length;
    const H = LA.zeros(s * q, l * p);
    for (let i = 0; i < s; i++) for (let j = 0; j < l; j++) { const Wk = W[i + j + 1];
      for (let a = 0; a < q; a++) for (let b = 0; b < p; b++) H[i * q + a][j * p + b] = Wk[a][b]; }
    const { U, s: sv, V } = LA.svd(H);
    if (!n) return { sv, H };
    const sq = sv.slice(0, n).map(Math.sqrt);
    const Lm = U.map(r => r.slice(0, n).map((x, k) => x * sq[k]));
    const P = LA.T(V.map(r => r.slice(0, n).map((x, k) => x * sq[k])));
    const C = Lm.slice(0, q);
    const B = P.map(r => r.slice(0, p));
    const Lup = Lm.slice(0, (s - 1) * q), Ldn = Lm.slice(q, s * q);
    const A = LA.mul(LA.pinv(Lup), Ldn);
    return { A, B, C, D: LA.clone(W[0]), sv, H };
  };

  // block Hankel (rows: s blocks) from a list of vectors sig[k] (length d), columns l, first index i0
  LA.blockHankel = (sig, i0, s, l) => { const d = sig[0].length; const H = LA.zeros(s * d, l);
    for (let i = 0; i < s; i++) for (let j = 0; j < l; j++) for (let a = 0; a < d; a++) H[i * d + a][j] = sig[i0 + i + j][a]; return H; };

  // MOESP (LQ implementation): u N x p, y N x q (arrays of vectors)
  LA.moesp = (u, y, s, n) => {
    const N = u.length, p = u[0].length, q = y[0].length, l = N - s + 1;
    const Uh = LA.blockHankel(u, 0, s, l), Yh = LA.blockHankel(y, 0, s, l);
    const M = LA.T(LA.vcat(Uh, Yh));               // l x s(p+q)
    const R = LA.qr(M).R;                          // upper triangular
    const Lf = LA.T(R);
    const L22 = Lf.slice(s * p).map(r => r.slice(s * p));
    const { U, s: sv } = LA.svd(L22);
    const res = { sv: sv.map(x => x / Math.sqrt(l)) };
    if (!n) return res;
    const Lm = U.map(r => r.slice(0, n));
    const C = Lm.slice(0, q);
    const A = LA.mul(LA.pinv(Lm.slice(0, (s - 1) * q)), Lm.slice(q, s * q));
    // least squares for x0, B, D : y(k) = [C A^k | sum u'(t) kron C A^(k-t-1) | u'(k) kron I_q] theta
    const nt = n + n * p + p * q; const Phi = [], Y = [];
    let CAk = LA.clone(C);                          // C A^k
    let G = LA.zeros(n, n * p);                     // G(k) = sum_{t<k} u'(t) kron A^(k-t-1)
    for (let k = 0; k < N; k++) {
      const CG = LA.mul(C, G);
      for (let a = 0; a < q; a++) {
        const row = new Array(nt).fill(0);
        for (let j = 0; j < n; j++) row[j] = CAk[a][j];
        for (let j = 0; j < n * p; j++) row[n + j] = CG[a][j];
        for (let b = 0; b < p; b++) row[n + n * p + b * q + a] = u[k][b];
        Phi.push(row); Y.push(y[k][a]);
      }
      // G(k+1) = A G(k) + u'(k) kron I_n
      G = LA.mul(A, G); for (let b = 0; b < p; b++) for (let i = 0; i < n; i++) G[i][b * n + i] += u[k][b];
      CAk = LA.mul(CAk, A);
    }
    const th = LA.lstsqQR(Phi, Y);
    const x0 = th.slice(0, n);
    const B = LA.zeros(n, p); for (let b = 0; b < p; b++) for (let i = 0; i < n; i++) B[i][b] = th[n + b * n + i];
    const D = LA.zeros(q, p); for (let b = 0; b < p; b++) for (let a = 0; a < q; a++) D[a][b] = th[n + n * p + b * q + a];
    return Object.assign(res, { A, B, C, D, x0 });
  };

  // ARX least squares, convention of the notes: y(k) = sum a_i y(k-i) + sum_{j} b_j u(k-nk-j+1)... (b_1..b_nb with delay nk)
  LA.arx = (u, y, na, nb, nk) => {
    const N = y.length, k0 = Math.max(na, nb + nk - 1); const Phi = [], Y = [];
    for (let k = k0; k < N; k++) { const row = [];
      for (let i = 1; i <= na; i++) row.push(y[k - i]);
      for (let j = 0; j < nb; j++) row.push(u[k - nk - j]);
      Phi.push(row); Y.push(y[k]); }
    let th = LA.lstsqQR(Phi, Y); let rankDef = false;
    if (th.some(v => !isFinite(v))) { th = LA.lstsq(Phi, Y); rankDef = true; }
    return { a: th.slice(0, na), b: th.slice(na), Phi, Y, rankDef };
  };
  // one-step-ahead prediction and simulation of an ARX model (notes convention)
  LA.arxPredict = (a, b, nk, u, y) => { const N = y.length; const yh = new Array(N).fill(0);
    for (let k = 0; k < N; k++) { let s = 0; a.forEach((ai, i) => { if (k - i - 1 >= 0) s += ai * y[k - i - 1]; });
      b.forEach((bj, j) => { if (k - nk - j >= 0) s += bj * u[k - nk - j]; }); yh[k] = s; } return yh; };
  LA.arxSimulate = (a, b, nk, u) => { const N = u.length; const ys = new Array(N).fill(0);
    for (let k = 0; k < N; k++) { let s = 0; a.forEach((ai, i) => { if (k - i - 1 >= 0) s += ai * ys[k - i - 1]; });
      b.forEach((bj, j) => { if (k - nk - j >= 0) s += bj * u[k - nk - j]; }); ys[k] = s; } return ys; };

  // Gauss-Newton / Levenberg-Marquardt on a residual function r(theta) (numerical Jacobian)
  LA.lm = (res, th0, iters = 40) => {
    let th = th0.slice(); let r = res(th); let cost = LA.dot(r, r); let mu = 1e-3;
    for (let it = 0; it < iters; it++) {
      const J = r.map(() => new Array(th.length).fill(0));
      for (let j = 0; j < th.length; j++) { const h = 1e-6 * Math.max(1, Math.abs(th[j])); const t2 = th.slice(); t2[j] += h;
        const r2 = res(t2); for (let i = 0; i < r.length; i++) J[i][j] = (r2[i] - r[i]) / h; }
      const JT = LA.T(J); const JTJ = LA.mul(JT, J); const g = LA.mv(JT, r);
      let improved = false;
      for (let tries = 0; tries < 8; tries++) {
        const M = JTJ.map((row, i) => row.map((x, j) => x + (i === j ? mu * (JTJ[i][i] + 1e-12) : 0)));
        let dth; try { dth = LA.solve(M, g); } catch (e) { mu *= 10; continue; }
        const t2 = LA.vsub(th, dth); const r2 = res(t2); const c2 = LA.dot(r2, r2);
        if (isFinite(c2) && c2 < cost) { th = t2; r = r2; const rel = (cost - c2) / cost; cost = c2; mu = Math.max(mu / 3, 1e-9); improved = true;
          if (rel < 1e-10) it = iters; break; }
        mu *= 10;
      }
      if (!improved) break;
    }
    return th;
  };

  // ------------------------------------------------------------------ formatting helpers
  LA.fmt = (x, d = 3) => { if (!isFinite(x)) return x > 0 ? '\\infty' : (x < 0 ? '-\\infty' : 'NaN');
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) return '0';
    const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) { const e = Math.floor(Math.log10(a)); const m = x / Math.pow(10, e);
      return (+m.toFixed(2)) + '\\cdot 10^{' + e + '}'; }
    return String(+x.toFixed(d)); };
  LA.fmtc = (z, d = 3) => { if (Math.abs(z.im) < 1e-9) return LA.fmt(z.re, d);
    return LA.fmt(z.re, d) + (z.im >= 0 ? '+' : '-') + LA.fmt(Math.abs(z.im), d) + 'j'; };
  LA.tex = (A, d = 3, env = 'bmatrix') => '\\begin{' + env + '}' + A.map(r => r.map(x => LA.fmt(x, d)).join(' & ')).join('\\\\') + '\\end{' + env + '}';
  LA.texv = (v, d = 3) => LA.tex(v.map(x => [x]), d);
  LA.parse = (str) => {   // "1 2; 3 4" or rows separated by newlines; commas allowed
    const rows = str.replace(/[\[\]]/g, '').split(/[;\n]+/).map(r => r.trim()).filter(r => r.length);
    const M = rows.map(r => r.split(/[\s,]+/).filter(t => t.length).map(t => { const v = Number(t); if (!isFinite(v)) throw new Error('not a number: ' + t); return v; }));
    if (!M.length) throw new Error('empty matrix');
    const n = M[0].length; if (M.some(r => r.length !== n)) throw new Error('rows of different length');
    return M; };
  LA.toStr = (A) => A.map(r => r.map(x => +x.toFixed(6)).join(' ')).join('; ');

  window.LA = LA;
})();
