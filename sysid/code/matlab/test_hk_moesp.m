rand('seed',1); randn('seed',1);
A0 = [0.8 0.2 0; -0.2 0.8 0; 0 0 0.5]; B0 = [1 0; 0 1; 1 1]; C0 = [1 0 1; 0 1 -1]; D0 = [0 0.5; 0 0];
M = 40; W = zeros(2,2,M); W(:,:,1) = D0;
for k=1:M-1, W(:,:,k+1) = C0*A0^(k-1)*B0; end
[A,B,C,D,sv] = hokalman(W, 10, 10, 3);
disp(sort(eig(A)).'), disp(sort(eig(A0)).'), disp(sv(1:5)')
N = 400; u = randn(N,2); x = [1;-1;0.5]; y = zeros(N,2);
for k=1:N, y(k,:) = (C0*x + D0*u(k,:)')'; x = A0*x + B0*u(k,:)'; end
[A,B,C,D,x0,sv] = moesp(u, y, 8, 3, 'lq'); disp(sort(eig(A)).'), disp(sv(1:5)'), disp(D)
[A2,B2,C2,D2,x02,sv2] = moesp(u, y, 8, 3, 'proj'); disp(sort(eig(A2)).'); disp(sv2(1:5)')
x = x0; ys = zeros(N,2); for k=1:N, ys(k,:) = (C*x + D*u(k,:)')'; x = A*x + B*u(k,:)'; end
disp(norm(ys-y)/norm(y))
a0=[1.5;-0.7]; b0=[1;0.5]; N=500; u=randn(N,1); y=zeros(N,1);
for k=3:N, y(k)=a0(1)*y(k-1)+a0(2)*y(k-2)+b0(1)*u(k-1)+b0(2)*u(k-2)+0.1*randn; end
[a,b]=arx_ls(u,y,2,2,1); disp([a b])
