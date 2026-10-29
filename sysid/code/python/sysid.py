"""sysid.py -- companion Python module of the lecture notes
"System Identification and Data Analysis -- Model identification part".

Conventions (same as in the notes):
  * signals are stored as arrays of shape (N, m): row k is the sample at time k,
    k = 0, ..., N-1;
  * n = state dimension, p = number of inputs, q = number of outputs;
  * Markov parameters are stored in an array W of shape (M, q, p), W[k] = w(k).

Only numpy is required (scipy is used in the examples for the PEM of OE models).
"""
import numpy as np


# ---------------------------------------------------------------------------
# Simulation utilities
# ---------------------------------------------------------------------------
def simulate_ss(A, B, C, D, u, x0=None):
    """Simulate x(k+1) = A x(k) + B u(k), y(k) = C x(k) + D u(k)."""
    A, B, C, D = map(np.atleast_2d, (A, B, C, D))
    u = np.asarray(u, dtype=float).reshape(len(u), -1)
    n = A.shape[0]
    x = np.zeros(n) if x0 is None else np.asarray(x0, dtype=float).ravel()
    y = np.zeros((u.shape[0], C.shape[0]))
    for k in range(u.shape[0]):
        y[k] = C @ x + D @ u[k]
        x = A @ x + B @ u[k]
    return y


def markov_parameters(A, B, C, D, M):
    """w(0) = D, w(k) = C A^(k-1) B, k = 1..M-1; returns array (M, q, p)."""
    A, B, C, D = map(np.atleast_2d, (A, B, C, D))
    W = np.zeros((M, C.shape[0], B.shape[1]))
    W[0] = D
    Ak = np.eye(A.shape[0])
    for k in range(1, M):
        W[k] = C @ Ak @ B
        Ak = A @ Ak
    return W


def block_hankel(x, s, l):
    """Block Hankel matrix with s block rows and l columns built from x (N, m):
    column j is [x(j); x(j+1); ...; x(j+s-1)]."""
    x = np.asarray(x, dtype=float).reshape(len(x), -1)
    m = x.shape[1]
    H = np.zeros((s * m, l))
    for i in range(s):
        H[i * m:(i + 1) * m, :] = x[i:i + l, :].T
    return H


# ---------------------------------------------------------------------------
# Least squares and ARX
# ---------------------------------------------------------------------------
def arx_ls(u, y, na, nb, nk):
    """LS estimate of y(k) = sum a_i y(k-i) + sum b_j u(k-nk-j+1) + e(k)
    (notes' convention A(q) = 1 - a_1 q^-1 - ...). Returns (a, b, Phi, Yv)."""
    u = np.asarray(u, dtype=float).ravel()
    y = np.asarray(y, dtype=float).ravel()
    N = len(y)
    k0 = max(na, nk + nb - 1)             # first usable 0-based index
    rows = []
    for k in range(k0, N):
        rows.append(np.concatenate([y[k - 1::-1][:na] if na > 0 else [],
                                    u[k - nk::-1][:nb] if k - nk >= 0 else []]))
    Phi = np.array(rows)
    Yv = y[k0:]
    theta, *_ = np.linalg.lstsq(Phi, Yv, rcond=None)
    return theta[:na], theta[na:], Phi, Yv


# ---------------------------------------------------------------------------
# Ho-Kalman realization
# ---------------------------------------------------------------------------
def hokalman(W, s, l, n):
    """Ho-Kalman / Kung realization from Markov parameters W (M, q, p)."""
    W = np.asarray(W, dtype=float)
    M, q, p = W.shape
    if s + l > M:
        raise ValueError("need s + l <= number of Markov parameters")
    D = W[0].copy()
    H = np.zeros((s * q, l * p))
    for i in range(s):
        for j in range(l):
            H[i * q:(i + 1) * q, j * p:(j + 1) * p] = W[i + j + 1]
    U, sv, Vt = np.linalg.svd(H)
    Sh = np.diag(np.sqrt(sv[:n]))
    L = U[:, :n] @ Sh                    # = O_s T
    P = Sh @ Vt[:n, :]                   # = T^{-1} C_l
    C = L[:q, :]
    B = P[:, :p]
    A = np.linalg.pinv(L[:(s - 1) * q, :]) @ L[q:, :]
    return A, B, C, D, sv


def deconvolve_markov(u, y):
    """SISO: solve the lower-triangular Toeplitz system y = T(u) w for the
    Markov parameters w(0..N-1) (requires x(0) = 0 and u(0) != 0)."""
    u = np.asarray(u, dtype=float).ravel()
    y = np.asarray(y, dtype=float).ravel()
    N = len(u)
    T = np.zeros((N, N))
    for i in range(N):
        T[i, :i + 1] = u[i::-1]
    return np.linalg.solve(T, y)


def fir_ls(u, y, M):
    """SISO: least-squares estimate of the first M Markov parameters from a
    long record (tall N-by-M Toeplitz regression, well conditioned for a
    white input; assumes x(0) = 0 and w(k) ~ 0 for k >= M)."""
    u = np.asarray(u, dtype=float).ravel()
    y = np.asarray(y, dtype=float).ravel()
    N = len(u)
    T = np.zeros((N, M))
    for j in range(M):
        T[j:, j] = u[:N - j]
    w, *_ = np.linalg.lstsq(T, y, rcond=None)
    return w


# ---------------------------------------------------------------------------
# MOESP
# ---------------------------------------------------------------------------
def moesp(u, y, s, n=None, method="lq"):
    """Basic MOESP. Returns (A, B, C, D, x0, sv); if n is None only sv is
    meaningful (the other outputs are None)."""
    u = np.asarray(u, dtype=float).reshape(len(u), -1)
    y = np.asarray(y, dtype=float).reshape(len(y), -1)
    N, p = u.shape
    q = y.shape[1]
    l = N - s + 1
    U = block_hankel(u, s, l)
    Y = block_hankel(y, s, l)
    if method == "proj":
        YP = Y - (Y @ U.T) @ np.linalg.solve(U @ U.T, U)
        Uy, sv, _ = np.linalg.svd(YP, full_matrices=False)
    else:  # LQ factorisation of [U; Y] obtained from the QR of its transpose
        R = np.linalg.qr(np.vstack([U, Y]).T, mode="r")
        L = R.T
        L22 = L[s * p:, s * p:]
        Uy, sv, _ = np.linalg.svd(L22)
    if n is None:
        return None, None, None, None, None, sv
    Lm = Uy[:, :n]
    C = Lm[:q, :]
    A = np.linalg.pinv(Lm[:(s - 1) * q, :]) @ Lm[q:, :]
    # B, D, x0 via least squares with the Kronecker/vec trick
    Phi = np.zeros((N * q, n + n * p + p * q))
    G = np.zeros((n, n * p))
    Ak = np.eye(n)
    Iq, In = np.eye(q), np.eye(n)
    for k in range(N):
        uk = u[k][None, :]
        Phi[k * q:(k + 1) * q, :] = np.hstack([C @ Ak, C @ G, np.kron(uk, Iq)])
        G = A @ G + np.kron(uk, In)
        Ak = A @ Ak
    theta, *_ = np.linalg.lstsq(Phi, y.reshape(-1), rcond=None)
    x0 = theta[:n]
    B = theta[n:n + n * p].reshape(p, n).T          # inverse of vec (column-major)
    D = theta[n + n * p:].reshape(p, q).T
    return A, B, C, D, x0, sv


# ---------------------------------------------------------------------------
# Validation metrics
# ---------------------------------------------------------------------------
def rmse(y, yhat):
    return np.sqrt(np.mean((np.asarray(y) - np.asarray(yhat)) ** 2))


def nrmse_range(y, yhat):
    y = np.asarray(y)
    return rmse(y, yhat) / (y.max() - y.min())


def fit_percent(y, yhat):
    """MATLAB-style fit: 100 (1 - ||y - yhat|| / ||y - mean(y)||)."""
    y = np.asarray(y).ravel()
    yhat = np.asarray(yhat).ravel()
    return 100 * (1 - np.linalg.norm(y - yhat) / np.linalg.norm(y - y.mean()))


if __name__ == "__main__":
    # quick self-test (noise-free MIMO system)
    rng = np.random.default_rng(1)
    A0 = np.array([[0.8, 0.2, 0], [-0.2, 0.8, 0], [0, 0, 0.5]])
    B0 = np.array([[1., 0], [0, 1], [1, 1]])
    C0 = np.array([[1., 0, 1], [0, 1, -1]])
    D0 = np.array([[0, 0.5], [0, 0]])
    A, B, C, D, sv = hokalman(markov_parameters(A0, B0, C0, D0, 40), 10, 10, 3)
    print("Ho-Kalman eig:", np.sort_complex(np.linalg.eigvals(A)))
    u = rng.standard_normal((400, 2))
    y = simulate_ss(A0, B0, C0, D0, u, x0=[1, -1, 0.5])
    for m in ("lq", "proj"):
        A, B, C, D, x0, sv = moesp(u, y, 8, 3, method=m)
        ys = simulate_ss(A, B, C, D, u, x0)
        print(m, "MOESP eig:", np.sort_complex(np.linalg.eigvals(A)),
              "rel. err:", np.linalg.norm(ys - y) / np.linalg.norm(y))
