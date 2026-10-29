%% Chapter 2 - Fundamental subspaces, rank, eigendecomposition, QR
A = [1 0 1; 0 1 1; 1 1 2];              % example of Section 1.2 (a3 = a1 + a2)
r      = rank(A)                        % dim Im(A) = 2
ImA    = orth(A)                        % orthonormal basis of Im(A)
KerA   = null(A)                        % orthonormal basis of Ker(A) ~ (-1,-1,1)/sqrt(3)
KerAT  = null(A')                       % left kernel
check  = ImA' * KerAT                   % = 0 : Im(A) is orthogonal to Ker(A^T)

A2 = [1 0; 0 1; 0 0];                   % tall 3x2 example
null(A2)                                % empty: Ker(A2) = {0}
null(A2')                               % e3: left kernel

%% Eigendecomposition A = R*Lambda*L, L = inv(R)
M = [2 1 0; 0 1 0; 0 0 1];              % p(lambda) = (lambda-2)(lambda-1)^2
[R, Lam] = eig(M);
Lft = inv(R);                           % rows = left eigenvectors
disp(norm(R*Lam*Lft - M))               % ~ 0 (M is diagonalizable)
mgeo1 = 3 - rank(1*eye(3) - M)          % geometric multiplicity of lambda = 1 -> 2
k = 5;  disp(norm(M^k - R*Lam^k*Lft))   % A^k via the modal decomposition
J = [1 1; 0 1];                         % Jordan block: m_alg = 2 > m_geo = 1
[RJ, LJ] = eig(J)                       % R is (numerically) singular

%% QR decomposition
X = [1 1; 1 2; 1 3; 1 4];
[Q, Rq] = qr(X, 0);                     % economy size: Q 4x2, Rq 2x2 upper triangular
disp(norm(Q'*Q - eye(2)));  disp(norm(Q*Rq - X))
