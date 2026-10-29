%% Chapter 6 - ARX models by least squares; bias of LS on OE data
randn('seed', 5);
a0 = [1.5; -0.7];  b0 = [1; 0.5];        % A(q) = 1 - 1.5 q^-1 + 0.7 q^-2
Aq = [1 -a0'];  Bq = [0 b0'];            % B(q) = q^-1 + 0.5 q^-2   (nk = 1)
N = 500;  u = randn(N, 1);  e = 0.3*randn(N, 1);
y = filter(Bq, Aq, u) + filter(1, Aq, e);           % ARX data: A y = B u + e
[a, b, Phi] = arx_ls(u, y, 2, 2, 1);
disp([a b]);  fprintf('cond(Phi) = %.2f\n', cond(Phi));

%% One-step-ahead prediction versus free-run simulation on fresh data
uv = randn(200, 1);  yv = filter(Bq, Aq, uv) + filter(1, Aq, 0.3*randn(200, 1));
Ahat = [1 -a'];  Bhat = [0 b'];
ypred = filter(Bhat, 1, uv) + filter([0 a'], 1, yv);  % [1-A(q)]y + B(q)u
ysim  = filter(Bhat, Ahat, uv);                        % W(q)u, no measured y used
fprintf('RMSE prediction %.3f, RMSE simulation %.3f\n', ...
        sqrt(mean((yv-ypred).^2)), sqrt(mean((yv-ysim).^2)));

%% Output-error data: y = B/F u + e (white e): ARX-LS becomes biased
F = [1 -1.5 0.7];
MC = 50;  th_arx = zeros(MC, 4);  th_oe = th_arx;
opts = optimset('TolX', 1e-8, 'TolFun', 1e-10, 'MaxFunEvals', 4000, 'MaxIter', 4000);
for i = 1:MC
    u = randn(N, 1);
    y = filter(Bq, F, u) + 0.5*randn(N, 1);
    [a, b] = arx_ls(u, y, 2, 2, 1);
    th_arx(i, :) = [-a' b'];             % reported with the (+) convention of F
    % PEM for the OE model: minimize sum of squared simulation errors
    V = @(th) sum((y - filter([0 th(3:4)], [1 th(1:2)], u)).^2);
    th_oe(i, :) = fminsearch(V, th_arx(i, :), opts);
end
disp('true  [f1 f2 b1 b2] = [-1.5 0.7 1 0.5]');
disp(['ARX-LS mean: ' num2str(mean(th_arx), 4)]);
disp(['PEM-OE mean: ' num2str(mean(th_oe), 4)]);
