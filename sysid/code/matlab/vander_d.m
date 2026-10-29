function V = vander_d(t, d)
%VANDER_D  Regressor matrix for a degree-d polynomial fit:
%   columns t.^d, t.^(d-1), ..., t, 1  (same ordering as polyfit/polyval)
V = t(:).^(d:-1:0);
end
