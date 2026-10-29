%% Chapter 3 - SVD, low-rank approximation, PCA
A = [3 2 2; 2 3 -2];
[U, S, V] = svd(A)                      % sigma = 5, 3
disp(norm(A - U*S*V'))
% relationship with the eigendecompositions of A'A and AA'
disp(sort(eig(A*A'), 'descend')')       % = sigma.^2 = [25 9]
disp(sort(eig(A'*A), 'descend')')       % = [25 9 0]

%% Numerical rank and low-rank approximation (Eckart-Young-Mirsky)
m = 100; rand('seed', 0); randn('seed', 0);
[Q1, ~] = qr(randn(m)); [Q2, ~] = qr(randn(m));
s = [linspace(10, 5, 10), zeros(1, m-10)];
An = Q1*diag(s)*Q2' + 0.05*randn(m);    % rank-10 matrix + noise
sv = svd(An);
stem(sv(1:40)); xlabel('i'); ylabel('\sigma_i');   % evident gap after sigma_10
[U, S, V] = svd(An);
p = 10;
Ap = U(:, 1:p)*S(1:p, 1:p)*V(:, 1:p)';
fprintf('||A-A_p||_2 = %.4f,  sigma_{p+1} = %.4f\n', norm(An-Ap), sv(p+1));
fprintf('||A-A_p||_F = %.4f,  sqrt(sum sigma_i^2, i>p) = %.4f\n', ...
        norm(An-Ap, 'fro'), sqrt(sum(sv(p+1:end).^2)));

%% PCA via SVD of the centred data matrix (rows = observations)
N = 60; th = pi/6; Rr = [cos(th) -sin(th); sin(th) cos(th)];
X  = (randn(N, 2).*[2 0.5])*Rr' + [3 2];
mu = mean(X, 1);
Xc = X - mu;                            % centring is essential
[~, Sx, Vx] = svd(Xc, 'econ');
lambda    = diag(Sx).^2/(N-1);          % variances along the principal directions
explained = lambda/sum(lambda)          % fraction of explained variance
scores    = Xc*Vx;                      % principal components (coordinates)
X1 = mu + scores(:, 1)*Vx(:, 1)';       % rank-1 reconstruction
