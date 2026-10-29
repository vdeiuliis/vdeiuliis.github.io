%% Chapter 7 - Ho-Kalman realization from (noisy) impulse response samples
A0 = [1.2 -0.61 0 0; 1 0 0 0; 0 0 0.9 0; 0 0 0 -0.5];
B0 = [1; 0; 1; 0.4];  C0 = [1 0.5 0.3 1];  D0 = 0;
M = 60;  W = zeros(1, 1, M);  W(1) = D0;
for k = 1:M-1, W(k+1) = C0*A0^(k-1)*B0; end
randn('seed', 2);
Wn = W + 0.02*randn(size(W));            % noisy Markov parameters
s = 25;  l = 25;
[~, ~, ~, ~, sv] = hokalman(Wn, s, l, 4);
semilogy(sv(1:15), 'o');  grid on;       % inspect the singular values -> n = 4
[A, B, C, D] = hokalman(Wn, s, l, 4);
disp([sort(eig(A0)) sort(eig(A))])       % true vs estimated poles

%% Model reduction: realizations of lower order from the exact data
for nr = 2:3
    [Ar, Br, Cr, Dr] = hokalman(W, s, l, nr);
    disp(eig(Ar).')
end

%% General input: recover the Markov parameters from input-output data
% (a) exact deconvolution with the square lower-triangular Toeplitz matrix
%     (x(0) = 0, u(0) ~= 0): correct in exact arithmetic, but T can be
%     extremely ill-conditioned -> use it only for short records
N = 15;  u = randn(N, 1);  u(1) = 1;
y = simss(A0, B0, C0, D0, u);
T = toeplitz(u, [u(1) zeros(1, N-1)]);   % U_{0,N,N}
w = T \ y;
fprintf('cond(T) = %.2e, max error = %.2e\n', cond(T), max(abs(w - squeeze(W(1:N)))));
% (b) least-squares FIR estimate of the first Mw Markov parameters from a
%     long, noisy record (w(k) ~ 0 for k >= Mw because the system is stable)
N = 1000;  Mw = 60;  u = randn(N, 1);
y = simss(A0, B0, C0, D0, u) + 0.05*randn(N, 1);
T = toeplitz(u, [u(1) zeros(1, Mw-1)]);  % tall N x Mw Toeplitz matrix
w = T \ y;                               % LS estimate of w(0..Mw-1)
fprintf('cond(T) = %.2f, max error = %.3f\n', cond(T), max(abs(w - squeeze(W(1:Mw)))));
Wls = reshape(w, 1, 1, Mw);
[A, B, C, D] = hokalman(Wls, 25, 25, 4);
disp(eig(A).')
