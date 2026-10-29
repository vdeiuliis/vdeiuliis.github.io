%% Chapter 8 - MOESP on a 4th-order SISO system with white output noise
A0 = [1.2 -0.61 0 0; 1 0 0 0; 0 0 0.9 0; 0 0 0 -0.5];
B0 = [1; 0; 1; 0.4];  C0 = [1 0.5 0.3 1];  D0 = 0;
randn('seed', 4);
N = 1000;  s = 10;  sigma = 0.3;
u  = randn(N, 1);
y0 = simss(A0, B0, C0, D0, u, zeros(4, 1));
y  = y0 + sigma*randn(N, 1);
[~, ~, ~, ~, ~, sv0] = moesp(u, y0, s, []);   % noise-free data
[~, ~, ~, ~, ~, sv1] = moesp(u, y,  s, []);   % noisy data
disp([sv0 sv1]/sqrt(N))                  % noise floor ~ sigma for i > n
[A, B, C, D, x0] = moesp(u, y, s, 4);
disp([sort(eig(A0)) sort(eig(A))])
% validation on fresh data
uv = randn(300, 1);
yv = simss(A0, B0, C0, D0, uv, zeros(4, 1));
yh = simss(A, B, C, D, uv, zeros(4, 1));
fprintf('fit = %.1f %%\n', 100*(1 - norm(yv - yh)/norm(yv - mean(yv))));
