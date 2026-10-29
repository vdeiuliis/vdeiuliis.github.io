function y = simss(A, B, C, D, u, x)
%SIMSS  Simulate x(k+1) = A x(k) + B u(k), y(k) = C x(k) + D u(k).
%   u : N-by-p inputs, x : initial state;  y : N-by-q outputs
if nargin < 6, x = zeros(size(A, 1), 1); end
N = size(u, 1);  y = zeros(N, size(C, 1));
for k = 1:N
    y(k, :) = (C*x + D*u(k, :)')';
    x = A*x + B*u(k, :)';
end
end
