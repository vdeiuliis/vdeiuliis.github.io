function [a, b, Phi, Yv] = arx_ls(u, y, na, nb, nk)
%ARX_LS  Least-squares estimate of a SISO ARX model, lecture-notes convention:
%   y(k) = a1 y(k-1) + ... + a_na y(k-na)
%        + b1 u(k-nk) + ... + b_nb u(k-nk-nb+1) + e(k),
%   i.e. A(q) = 1 - a1 q^-1 - ... - a_na q^-na  (MATLAB's arx uses +a_i).
%   u, y : column vectors (samples k = 0..N-1)
%   The first max(na, nk+nb-1) samples are used only as initial conditions.
N  = length(y);
k0 = max(na, nk + nb - 1) + 1;           % first usable (1-based) index
Phi = zeros(N - k0 + 1, na + nb);
for k = k0:N
    Phi(k-k0+1, :) = [y(k-1:-1:k-na)', u(k-nk:-1:k-nk-nb+1)'];
end
Yv = y(k0:N);
theta = Phi \ Yv;                        % LS solution (QR based, same as pinv(Phi)*Yv)
a = theta(1:na);  b = theta(na+1:end);
end
