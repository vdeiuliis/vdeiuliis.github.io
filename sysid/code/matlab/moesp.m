function [A, B, C, D, x0, sv] = moesp(u, y, s, n, method)
%MOESP  Basic (ordinary) MOESP subspace identification for the deterministic
%       and the white-output-noise case.
%   [A,B,C,D,x0,sv] = moesp(u, y, s, n, method)
%   u : N-by-p input samples  (row k+1 = u(k)^T, k = 0..N-1)
%   y : N-by-q output samples
%   s : number of block rows of the Hankel matrices (s > n)
%   n : model order (inspect sv to choose it; pass n = [] to get only sv)
%   method : 'proj' (explicit projection, as in the lecture notes) or
%            'lq'   (numerically efficient LQ implementation, default)
if nargin < 5, method = 'lq'; end
[N, p] = size(u);  q = size(y, 2);
l = N - s + 1;                           % number of columns of the Hankel matrices
U = blockhankel(u, s, l);                % U_{0,s,l}  (s*p x l)
Y = blockhankel(y, s, l);                % Y_{0,s,l}  (s*q x l)
switch method
    case 'proj'
        % Y*Pi_{Ker(U)} = Y - Y U^T (U U^T)^{-1} U  (the l x l projector is never formed)
        YP = Y - ((Y * U') / (U * U')) * U;
        [Uy, Sy] = svd(YP, 'econ');
    case 'lq'
        % [U; Y] = [L11 0; L21 L22] [Q1; Q2]   =>   Y*Pi_{Ker(U)} = L22*Q2
        Lf  = triu(qr([U; Y]', 0))';     % lower-triangular LQ factor
        L22 = Lf(s*p+1:end, s*p+1:end);
        [Uy, Sy] = svd(L22);
    otherwise
        error('moesp: unknown method');
end
sv = diag(Sy);
if isempty(n), A = []; B = []; C = []; D = []; x0 = []; return; end
Lm = Uy(:, 1:n);                         % basis of Im(O_s) (up to a change of basis)
C  = Lm(1:q, :);
A  = pinv(Lm(1:(s-1)*q, :)) * Lm(q+1:s*q, :);
% ---- B, D, x0 by linear least squares (Kronecker product / vec trick) ----
% y(k) = C A^k x0 + sum_{tau<k} (u(tau)^T kron C A^(k-tau-1)) vec(B) + (u(k)^T kron I_q) vec(D)
Phi = zeros(N*q, n + n*p + p*q);
G   = zeros(n, n*p);                     % G_k = sum_{tau<k} u(tau)^T kron A^(k-tau-1)
Ak  = eye(n);                            % A^k
for k = 0:N-1
    rows = k*q+1:(k+1)*q;
    uk = u(k+1, :);
    Phi(rows, :) = [C*Ak, C*G, kron(uk, eye(q))];
    G  = A*G + kron(uk, eye(n));         % G_{k+1} = A G_k + u(k)^T kron I_n
    Ak = A*Ak;
end
theta = Phi \ reshape(y', [], 1);        % stacked outputs [y(0); y(1); ...; y(N-1)]
x0 = theta(1:n);
B  = reshape(theta(n+1:n+n*p), n, p);    % inverse of vec(.)
D  = reshape(theta(n+n*p+1:end), q, p);
end

function H = blockhankel(x, s, l)
%BLOCKHANKEL  s block rows, l columns; column j = [x(j-1); x(j); ...; x(j+s-2)]
m = size(x, 2);
H = zeros(s*m, l);
for i = 1:s
    H((i-1)*m+1:i*m, :) = x(i:i+l-1, :)';
end
end
