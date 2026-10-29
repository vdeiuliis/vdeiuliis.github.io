function [A, B, C, D, sv] = hokalman(W, s, l, n)
%HOKALMAN  Ho-Kalman (Kung's SVD-based) realization from Markov parameters.
%   [A,B,C,D,sv] = hokalman(W, s, l, n)
%   W  : q-by-p-by-M array, W(:,:,k+1) = impulse response matrix w(k), k = 0..M-1
%   s,l: number of block rows / block columns of the Hankel matrix
%        (s, l > n  and  s + l <= M)
%   n  : order of the realization (choose it by inspecting sv if unknown)
%   sv : singular values of the block Hankel matrix H_{s,l}
[q, p, M] = size(W);
if s + l > M
    error('hokalman: need s + l <= number of Markov parameters');
end
D = W(:, :, 1);                         % w(0) = D
H = zeros(s*q, l*p);                    % block Hankel matrix of w(1),...,w(s+l-1)
for i = 1:s
    for j = 1:l
        H((i-1)*q+1:i*q, (j-1)*p+1:j*p) = W(:, :, i+j);   % block (i,j) = w(i+j-1)
    end
end
[U, S, V] = svd(H);
sv = diag(S);
Un = U(:, 1:n);  Sn = S(1:n, 1:n);  Vn = V(:, 1:n);
L = Un * sqrt(Sn);                      % = O_s T       (extended observability)
P = sqrt(Sn) * Vn';                     % = T^{-1} C_l  (extended reachability)
C = L(1:q, :);                          % first block row
B = P(:, 1:p);                          % first block column
Lup   = L(1:(s-1)*q, :);                % L without its last block row
Ldown = L(q+1:s*q, :);                  % L without its first block row
A = pinv(Lup) * Ldown;                  % shift invariance: Lup*A = Ldown
end
