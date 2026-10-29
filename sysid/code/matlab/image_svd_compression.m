%% Chapter 3 - Image compression with the truncated SVD
% Each colour channel of an m x n RGB image is an m x n matrix; its rank-p truncated SVD
% is the best rank-p approximation (Eckart-Young-Mirsky) and requires p*(m+n+1) numbers
% instead of m*n.  Run from code/matlab (the image is in ../../figures).
A = im2double(imread(fullfile('..', '..', 'figures', 'trabocco.jpg')));  % values in [0,1]
[m, n, nc] = size(A);
ranks = [1 10 30 100 300];

% SVD of each channel, computed once (thin SVD: min(m,n) singular triplets)
U = cell(1, nc); S = cell(1, nc); V = cell(1, nc);
for c = 1:nc
    [U{c}, S{c}, V{c}] = svd(A(:, :, c), 'econ');
end

% singular values of the three channels
figure;
semilogy(diag(S{1}), 'r'); hold on; semilogy(diag(S{2}), 'g'); semilogy(diag(S{3}), 'b');
xlabel('i'); ylabel('\sigma_i'); legend('R', 'G', 'B'); grid on;

% rank-p approximations, storage and quality
figure;
subplot(2, 3, 1); imshow(A); title('Original');
fprintf('break-even rank mn/(m+n+1) = %.1f\n', m*n/(m+n+1));
fprintf('    p   storage   ratio  rel.err   PSNR\n');
for k = 1:numel(ranks)
    p  = ranks(k);
    Ap = zeros(m, n, nc);
    for c = 1:nc
        Ap(:, :, c) = U{c}(:, 1:p)*S{c}(1:p, 1:p)*V{c}(:, 1:p)';
    end
    storage = p*(m + n + 1)/(m*n);                 % fraction of stored numbers
    relerr  = norm(A(:) - Ap(:))/norm(A(:));       % relative Frobenius error
    psnrdB  = 10*log10(1/mean((A(:) - Ap(:)).^2)); % peak value = 1
    fprintf('%5d  %6.1f%%  %6.1f  %6.2f%%  %5.1f dB\n', ...
            p, 100*storage, 1/storage, 100*relerr, psnrdB);
    Ap = min(max(Ap, 0), 1);                       % clip to [0,1] for display
    subplot(2, 3, k + 1); imshow(Ap); title(sprintf('p = %d', p));
    imwrite(Ap, sprintf('trabocco_p%03d.jpg', p), 'Quality', 95);
end
