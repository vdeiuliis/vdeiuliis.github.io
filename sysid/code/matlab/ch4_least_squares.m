%% Chapter 4 - Least squares
t = [-1 1 1.5 3 3.5]';  y = [0.4 2.2 2.3 3.9 4.0]';
A = [t ones(size(t))];
x_ne   = (A'*A) \ (A'*y);               % normal equations (avoid if ill-conditioned)
x_pinv = pinv(A)*y;                     % pseudo-inverse (SVD based)
x_bs   = A \ y;                         % QR based: preferred in practice
[Q, R] = qr(A, 0);  x_qr = R \ (Q'*y);  % explicit QR solution
disp([x_ne x_pinv x_bs x_qr])           % all equal: m = 0.8244, q = 1.2409
r = y - A*x_bs;  disp(A'*r)             % residual orthogonal to Im(A)
P = A*pinv(A);                          % orthogonal projector onto Im(A)
disp(norm(P*P - P)); disp(norm(P - P'))

%% Rank-deficient / underdetermined problems: minimum-norm solutions
Af = [1 0 0 0; 0 1 0 0; 0 0 1 0];  yf = [1; 2; 3];
x_ln = Af'*((Af*Af') \ yf)              % least-norm solution (full row rank)
disp(norm(x_ln - pinv(Af)*yf))
Ad = [1 0 0 0; 0 1 0 0; 0 0 0 0];  yd = [1; 1; 1];   % y not in Im(Ad)
x_mn = pinv(Ad)*yd                      % minimum-norm LS solution: [1 1 0 0]'
% NB: Ad\yd returns *a* LS solution (with a rank warning), not necessarily
% the minimum-norm one; use pinv or lsqminnorm in that case.

%% Regularized (ridge / Tikhonov) least squares
lambda = 1e-2;
x_ridge = (A'*A + lambda*eye(2)) \ (A'*y);

%% Total least squares (errors in both A and y) via the SVD of [A y]
[~, ~, V] = svd([A y], 0);
v = V(:, end);                          % right singular vector of sigma_min
x_tls = -v(1:end-1)/v(end)

%% Polynomial fitting with model-order selection (training / testing data)
f = @(t) 0.5*t.^3 - t.^2 - t + 1;
randn('seed', 7); rand('seed', 7);
ttr = sort(-2 + 5*rand(30, 1));  ytr = f(ttr) + 0.6*randn(30, 1);
tte = sort(-2 + 5*rand(30, 1));  yte = f(tte) + 0.6*randn(30, 1);
orders = 0:12;  Etr = zeros(size(orders));  Ete = Etr;
for i = 1:numel(orders)
    d  = orders(i);
    th = vander_d(ttr, d) \ ytr;        % LS fit of a degree-d polynomial
    Etr(i) = sqrt(mean((ytr - vander_d(ttr, d)*th).^2));
    Ete(i) = sqrt(mean((yte - vander_d(tte, d)*th).^2));
end
disp([orders' Etr' Ete'])               % training RMSE decreases, testing does not
