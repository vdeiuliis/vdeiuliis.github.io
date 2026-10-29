"""Numerical experiments used for the figures and tables of the lecture notes.
Run:  python3 experiments.py   (writes ../../figdata/*.dat, prints numbers)"""
import os
import numpy as np
from scipy.optimize import least_squares
from scipy.signal import lfilter
from sysid import (simulate_ss, markov_parameters, hokalman, moesp, arx_ls,
                   rmse, fit_percent, deconvolve_markov, fir_ls)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "figdata")
os.makedirs(OUT, exist_ok=True)


def save(name, header, *cols):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(" ".join(header) + "\n")
        for row in zip(*cols):
            f.write(" ".join(f"{v:.6g}" for v in row) + "\n")


# ----------------------------------------------------------------- Chapter 3
def svd_spectra():
    rng = np.random.default_rng(0)
    m = 100
    Q1, _ = np.linalg.qr(rng.standard_normal((m, m)))
    Q2, _ = np.linalg.qr(rng.standard_normal((m, m)))
    # (a) slowly decaying spectrum: no evident gap
    sa = 10 * np.exp(-np.arange(m) / 35)
    Aa = Q1 @ np.diag(sa) @ Q2.T + 0.01 * rng.standard_normal((m, m))
    # (b) rank-10 matrix + small noise: evident gap after sigma_10
    sb = np.r_[np.linspace(10, 5, 10), np.zeros(m - 10)]
    Ab = Q1 @ np.diag(sb) @ Q2.T + 0.05 * rng.standard_normal((m, m))
    s_a = np.linalg.svd(Aa, compute_uv=False)
    s_b = np.linalg.svd(Ab, compute_uv=False)
    idx = np.arange(1, 41)
    save("sv_nogap.dat", ["i", "s"], idx, s_a[:40])
    save("sv_gap.dat", ["i", "s"], idx, s_b[:40])
    # relative Frobenius error of the rank-10 truncation of Ab
    U, s, Vt = np.linalg.svd(Ab)
    A10 = U[:, :10] @ np.diag(s[:10]) @ Vt[:10]
    print("[SVD] sigma_10, sigma_11 =", s_b[9], s_b[10],
          " ||A-A10||_2 =", np.linalg.norm(Ab - A10, 2),
          " rel Frob err =", np.linalg.norm(Ab - A10) / np.linalg.norm(Ab))


def pca_example():
    rng = np.random.default_rng(3)
    N = 60
    z = rng.standard_normal((N, 2)) * np.array([2.0, 0.5])
    th = np.deg2rad(30)
    R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
    X = z @ R.T + np.array([3.0, 2.0])
    mu = X.mean(axis=0)
    Xc = X - mu
    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
    lam = s ** 2 / (N - 1)
    save("pca_points.dat", ["x", "y"], X[:, 0], X[:, 1])
    print("[PCA] mean =", mu, " directions =\n", Vt, "\n variances =", lam,
          " explained =", lam / lam.sum())
    return mu, Vt, lam


def image_compression(ranks=(1, 10, 30, 100, 300)):
    """SVD compression of a colour image (Chapter 3): singular values, trade-off curve,
    table of storage/error/PSNR and the rank-p reconstructions saved in ../../figures."""
    from PIL import Image
    FIG = os.path.join(os.path.dirname(OUT), "figures")
    A = np.asarray(Image.open(os.path.join(FIG, "trabocco.jpg")), dtype=float) / 255
    m, n, nc = A.shape
    svds = [np.linalg.svd(A[:, :, c], full_matrices=False) for c in range(nc)]
    S = np.array([s for _, s, _ in svds])                 # nc x min(m,n)
    q = S.shape[1]
    idx = np.arange(1, q + 1)
    save("img_sv.dat", ["i", "r", "g", "b"], idx, *S)
    # errors from the singular values (Eckart-Young-Mirsky), for every p
    tot = (S ** 2).sum()
    tail = np.array([(S[:, p:] ** 2).sum() for p in range(q + 1)])
    p_all = np.arange(1, q + 1)
    storage = 100 * p_all * (m + n + 1) / (m * n)         # % of the numbers of A
    relerr = 100 * np.sqrt(tail[1:] / tot)
    psnr = 10 * np.log10(3 * m * n / np.maximum(tail[1:], 1e-300))
    keep = storage <= 110
    save("img_tradeoff.dat", ["p", "storage", "relerr", "psnr"],
         p_all[keep], storage[keep], relerr[keep], psnr[keep])
    print(f"[IMG] {m}x{n}x{nc}, break-even rank mn/(m+n+1) = {m*n/(m+n+1):.1f}")
    print("[IMG]   p  stored/ch  storage%  ratio  energy%  relerr%  PSNR[dB]")
    for p in ranks:
        Ap = np.stack([U[:, :p] * s[:p] @ Vt[:p] for U, s, Vt in svds], axis=2)
        err = np.linalg.norm(A - Ap) / np.linalg.norm(A)
        mse = np.mean((A - Ap) ** 2)
        print(f"[IMG] {p:4d} {p*(m+n+1):9d} {100*p*(m+n+1)/(m*n):8.1f} "
              f"{m*n/(p*(m+n+1)):6.1f} {100*(1-tail[p]/tot):8.2f} {100*err:8.2f} "
              f"{10*np.log10(1/mse):8.1f}")
        img = Image.fromarray(np.round(255 * Ap.clip(0, 1)).astype(np.uint8))
        img.save(os.path.join(FIG, f"trabocco_p{p:03d}.jpg"), quality=95)


# ----------------------------------------------------------------- Chapter 4
def line_fit():
    t = np.array([-1.0, 1.0, 1.5, 3.0, 3.5])
    y = np.array([0.4, 2.2, 2.3, 3.9, 4.0])
    A = np.c_[t, np.ones_like(t)]
    x = np.linalg.pinv(A) @ y
    r = y - A @ x
    print("[LS line] m, q =", x, " residual norm^2 =", r @ r, " A^T r =", A.T @ r)


# ----------------------------------------------------------------- Chapter 5
def poly_order_selection():
    rng = np.random.default_rng(7)
    f = lambda t: 0.5 * t ** 3 - t ** 2 - t + 1
    Ntr, Nte, sig = 30, 30, 0.6
    ttr = np.sort(rng.uniform(-2, 3, Ntr))
    tte = np.sort(rng.uniform(-2, 3, Nte))
    ytr = f(ttr) + sig * rng.standard_normal(Ntr)
    yte = f(tte) + sig * rng.standard_normal(Nte)
    orders = np.arange(0, 13)
    etr, ete, aic, mdl = [], [], [], []
    for d in orders:
        Atr = np.vander(ttr, d + 1)
        th, *_ = np.linalg.lstsq(Atr, ytr, rcond=None)
        V = np.mean((ytr - Atr @ th) ** 2)
        etr.append(np.sqrt(V))
        ete.append(rmse(yte, np.vander(tte, d + 1) @ th))
        npar = d + 1
        aic.append(np.log(V) + 2 * npar / Ntr)
        mdl.append(np.log(V) + npar * np.log(Ntr) / Ntr)
        if d == 3:
            print("[poly] cubic coefficients (a3..a0):", th)
    save("poly_rmse.dat", ["order", "train", "test", "aic", "mdl"],
         orders, etr, ete, aic, mdl)
    save("poly_train.dat", ["t", "y"], ttr, ytr)
    save("poly_test.dat", ["t", "y"], tte, yte)
    tt = np.linspace(-2, 3, 200)
    fits = {}
    for d in (1, 3, 12):
        th, *_ = np.linalg.lstsq(np.vander(ttr, d + 1), ytr, rcond=None)
        fits[d] = np.clip(np.vander(tt, d + 1) @ th, -8, 12)
    save("poly_fits.dat", ["t", "true", "d1", "d3", "d12"], tt, f(tt),
         fits[1], fits[3], fits[12])
    print("[poly] RMSE train:", np.round(etr, 3))
    print("[poly] RMSE test :", np.round(ete, 3))
    print("[poly] argmin test", orders[int(np.argmin(ete))],
          " argmin AIC", orders[int(np.argmin(aic))],
          " argmin MDL", orders[int(np.argmin(mdl))])


# ----------------------------------------------------------------- Chapter 6
def arx_vs_oe():
    """True system is OE: y = B/F u + e. Compare ARX-LS (biased) with the
    PEM estimate of the OE model (nonlinear LS), Monte Carlo."""
    rng = np.random.default_rng(11)
    b_true = np.array([1.0, 0.5])            # B(q) = q^-1 + 0.5 q^-2
    f_true = np.array([1.0, -1.5, 0.7])      # F(q) = 1 - 1.5 q^-1 + 0.7 q^-2
    N, sig, MC = 500, 0.5, 100
    est_arx, est_oe = [], []
    for _ in range(MC):
        u = rng.standard_normal(N)
        y0 = lfilter(np.r_[0, b_true], f_true, u)
        y = y0 + sig * rng.standard_normal(N)
        a, b, _, _ = arx_ls(u, y, 2, 2, 1)
        est_arx.append(np.r_[-a, b])          # report as F-coefficients (+ convention)

        def res(th):
            return y - lfilter(np.r_[0, th[2:]], np.r_[1, th[:2]], u)
        th0 = np.r_[-a, b]
        sol = least_squares(res, th0)
        est_oe.append(sol.x)
    est_arx, est_oe = np.array(est_arx), np.array(est_oe)
    true = np.r_[f_true[1:], b_true]
    print("[OE] true      f1 f2 b1 b2:", true)
    print("[OE] ARX-LS mean:", est_arx.mean(0), " std:", est_arx.std(0))
    print("[OE] PEM-OE mean:", est_oe.mean(0), " std:", est_oe.std(0))
    return true, est_arx, est_oe


def arx_example():
    rng = np.random.default_rng(5)
    a0, b0 = np.array([1.5, -0.7]), np.array([1.0, 0.5])
    for N in (50, 500, 5000):
        u = rng.standard_normal(N)
        e = 0.3 * rng.standard_normal(N)
        # A(q) y = B(q) u + e  with A = 1 - 1.5 q^-1 + 0.7 q^-2
        y = lfilter([0, 1.0, 0.5], [1, -1.5, 0.7], u) + lfilter([1], [1, -1.5, 0.7], e)
        a, b, Phi, Yv = arx_ls(u, y, 2, 2, 1)
        print(f"[ARX] N={N}: a={a}, b={b}, cond(Phi)={np.linalg.cond(Phi):.2f}")


# ----------------------------------------------------------------- Chapter 7
SYS_A = np.array([[1.2, -0.61, 0.0, 0.0],
                  [1.0, 0.0, 0.0, 0.0],
                  [0.0, 0.0, 0.9, 0.0],
                  [0.0, 0.0, 0.0, -0.5]])
SYS_B = np.array([[1.0], [0.0], [1.0], [0.4]])
SYS_C = np.array([[1.0, 0.5, 0.3, 1.0]])
SYS_D = np.array([[0.0]])


def hokalman_noisy():
    rng = np.random.default_rng(2)
    M = 60
    W = markov_parameters(SYS_A, SYS_B, SYS_C, SYS_D, M)
    Wn = W + 0.02 * rng.standard_normal(W.shape)
    s = l = 25
    _, _, _, _, sv_clean = hokalman(W, s, l, 4)
    A, B, C, D, sv_noisy = hokalman(Wn, s, l, 4)
    idx = np.arange(1, 16)
    save("hk_sv.dat", ["i", "clean", "noisy"], idx, sv_clean[:15], sv_noisy[:15])
    print("[HK] true poles:", np.round(np.sort_complex(np.linalg.eigvals(SYS_A)), 4))
    print("[HK] est. poles:", np.round(np.sort_complex(np.linalg.eigvals(A)), 4))
    print("[HK] sv clean:", np.round(sv_clean[:6], 4))
    print("[HK] sv noisy:", np.round(sv_noisy[:6], 4))
    Wid = markov_parameters(A, B, C, D, M)
    k = np.arange(M)
    save("hk_imp.dat", ["k", "true", "noisy", "ident"], k[:40], W[:40, 0, 0],
         Wn[:40, 0, 0], Wid[:40, 0, 0])
    for nn in (2, 3):
        Ar, Br, Cr, Dr, _ = hokalman(W, s, l, nn)
        Wr = markov_parameters(Ar, Br, Cr, Dr, M)
        print(f"[HK] reduced order {nn}: poles", np.round(np.linalg.eigvals(Ar), 4),
              " rel err", np.linalg.norm(Wr - W) / np.linalg.norm(W))
    # deconvolution from a general input: square Toeplitz (ill-conditioned)
    conds = []
    for N in (10, 20, 40, 60):
        u = rng.standard_normal(N); u[0] = 1.0
        T = np.array([[u[i - j] if i >= j else 0 for j in range(N)] for i in range(N)])
        conds.append(np.linalg.cond(T))
    print("[HK] cond of square Toeplitz for N=10,20,40,60:", ["%.1e" % c for c in conds])
    # LS FIR estimate from a long noisy record, then Ho-Kalman
    N, Mw = 1000, 60
    u = rng.standard_normal(N)
    y = simulate_ss(SYS_A, SYS_B, SYS_C, SYS_D, u)[:, 0] + 0.05 * rng.standard_normal(N)
    w = fir_ls(u, y, Mw)
    print("[HK] FIR-LS max error:", np.max(np.abs(w - W[:Mw, 0, 0])))
    A, B, C, D, sv = hokalman(w.reshape(Mw, 1, 1), 25, 25, 4)
    print("[HK] poles from FIR-LS + HK:", np.round(np.sort_complex(np.linalg.eigvals(A)), 4))


# ----------------------------------------------------------------- Chapter 8
def moesp_noisy():
    rng = np.random.default_rng(4)
    N, s, sig, MC = 1000, 10, 0.3, 50
    true_eig = np.linalg.eigvals(SYS_A)
    u = rng.standard_normal(N)
    y0 = simulate_ss(SYS_A, SYS_B, SYS_C, SYS_D, u)
    _, _, _, _, _, sv0 = moesp(u, y0, s)
    y = y0 + sig * rng.standard_normal(y0.shape)
    _, _, _, _, _, sv1 = moesp(u, y, s)
    idx = np.arange(1, s + 1)
    save("moesp_sv.dat", ["i", "clean", "noisy"], idx, sv0 / np.sqrt(N),
         sv1 / np.sqrt(N))
    print("[MOESP] sv/sqrt(N) clean:", np.round(sv0 / np.sqrt(N), 4))
    print("[MOESP] sv/sqrt(N) noisy:", np.round(sv1 / np.sqrt(N), 4),
          " (sigma =", sig, ")")
    re, im = [], []
    fits = []
    for _ in range(MC):
        u = rng.standard_normal(N)
        y = simulate_ss(SYS_A, SYS_B, SYS_C, SYS_D, u) + sig * rng.standard_normal((N, 1))
        A, B, C, D, x0, _ = moesp(u, y, s, 4)
        ev = np.linalg.eigvals(A)
        re += list(ev.real); im += list(ev.imag)
        uv = rng.standard_normal(300)
        yv = simulate_ss(SYS_A, SYS_B, SYS_C, SYS_D, uv)
        fits.append(fit_percent(yv, simulate_ss(A, B, C, D, uv)))
    save("moesp_eig.dat", ["re", "im"], re, im)
    save("true_eig.dat", ["re", "im"], true_eig.real, true_eig.imag)
    print("[MOESP] mean validation fit (noise-free validation output):",
          np.mean(fits), "+-", np.std(fits))
    # time-domain validation plot for one realisation
    u = rng.standard_normal(N)
    y = simulate_ss(SYS_A, SYS_B, SYS_C, SYS_D, u) + sig * rng.standard_normal((N, 1))
    A, B, C, D, x0, _ = moesp(u, y, s, 4)
    uv = rng.standard_normal(120)
    yv0 = simulate_ss(SYS_A, SYS_B, SYS_C, SYS_D, uv)[:, 0]
    yvn = yv0 + sig * rng.standard_normal(120)
    yid = simulate_ss(A, B, C, D, uv)[:, 0]
    save("moesp_val.dat", ["k", "meas", "true", "ident"], np.arange(120), yvn, yv0, yid)
    print("[MOESP] single-run validation fit vs noisy data:", fit_percent(yvn, yid))


if __name__ == "__main__":
    svd_spectra()
    pca_example()
    image_compression()
    line_fit()
    poly_order_selection()
    arx_example()
    arx_vs_oe()
    hokalman_noisy()
    moesp_noisy()
