"""Mini motor de heightfield en numpy para las placas procedurales (SPEC §9): marcha de rayos sobre un mapa de alturas,
sombras duras, oclusión, bruma y cielo con nubes. Todo determinista; se corre una sola vez para generar las placas."""
import numpy as np
from pl_common import *

def bil(a, x, y):
    Ny, Nx = a.shape
    x = np.clip(x, 0, Nx - 1.001); y = np.clip(y, 0, Ny - 1.001)
    x0 = x.astype(np.int32); y0 = y.astype(np.int32); fx = x - x0; fy = y - y0
    return (a[y0, x0] * (1 - fx) + a[y0, x0 + 1] * fx) * (1 - fy) + (a[y0 + 1, x0] * (1 - fx) + a[y0 + 1, x0 + 1] * fx) * fy

def bilw(a, x, y):
    """bilineal periódico"""
    Ny, Nx = a.shape
    x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64); fx = (x - x0).astype(np.float32); fy = (y - y0).astype(np.float32)
    xa, xb, ya, yb = x0 % Nx, (x0 + 1) % Nx, y0 % Ny, (y0 + 1) % Ny
    return (a[ya, xa] * (1 - fx) + a[ya, xb] * fx) * (1 - fy) + (a[yb, xa] * (1 - fx) + a[yb, xb] * fx) * fy

class Terrain:
    """h: alturas (m); dx: m por celda; origen (0,0) en la esquina; x = columna, y = fila"""
    def __init__(self, h, dx):
        self.h = h.astype(np.float32); self.dx = float(dx); self.Ny, self.Nx = h.shape; self.zmax = float(h.max()) + 1

    def height(self, X, Y):
        return bil(self.h, X / self.dx, Y / self.dx)

    def normal(self, X, Y):
        e = self.dx * 0.8
        gx = (self.height(X + e, Y) - self.height(X - e, Y)) / (2 * e)
        gy = (self.height(X, Y + e) - self.height(X, Y - e)) / (2 * e)
        n = np.sqrt(gx * gx + gy * gy + 1)
        return -gx / n, -gy / n, 1 / n

    def render(self, cam, target, fov_v, W, Hh, tmax=9000., tmin=2., roll=0., verbose=True):
        cam = np.array(cam, np.float64); f = np.array(target, np.float64) - cam; f /= np.linalg.norm(f)
        r = np.cross(f, [0, 0, 1.]); r /= np.linalg.norm(r); u = np.cross(r, f)
        th = np.tan(np.radians(fov_v) / 2); tw = th * W / Hh
        jj, ii = np.mgrid[0:Hh, 0:W].astype(np.float64)
        sx = (2 * (ii + 0.5) / W - 1) * tw; sy = (1 - 2 * (jj + 0.5) / Hh) * th
        D = f[None, None, :] + sx[..., None] * r[None, None, :] + sy[..., None] * u[None, None, :]
        D /= np.linalg.norm(D, axis=2, keepdims=True)
        D = D.reshape(-1, 3).astype(np.float32)
        G = self.trace(np.broadcast_to(cam.astype(np.float32), D.shape), D, tmax, tmin, verbose)
        for k in ('t', 'hit', 'sky', 'X', 'Y', 'Z'): G[k] = G[k].reshape(Hh, W)
        G['D'] = D.reshape(Hh, W, 3); G['cam'] = cam.astype(np.float32); G['W'] = W; G['H'] = Hh
        return G

    def trace(self, O, D, tmax=9000., tmin=2., verbose=False):
        n = D.shape[0]
        O = np.ascontiguousarray(O, np.float32)
        self._dt_prev = np.ones(n, np.float32)
        t = np.full(n, tmin, np.float32)
        hit = np.zeros(n, bool); sky = np.zeros(n, bool)
        idx = np.arange(n)
        it = 0
        zmax = self.zmax
        while idx.size and it < 900:
            it += 1
            d = D[idx]; tt = t[idx]
            o = O[idx]
            px = o[:, 0] + d[:, 0] * tt; py = o[:, 1] + d[:, 1] * tt; pz = o[:, 2] + d[:, 2] * tt
            out = (px < 0) | (py < 0) | (px > (self.Nx - 2) * self.dx) | (py > (self.Ny - 2) * self.dx)
            hh = self.height(px, py)
            below = pz < hh
            above_sky = (pz > zmax) & (d[:, 2] >= 0)
            far = tt > tmax
            # cruce: bisección
            if below.any():
                bi = idx[below]; lo = t[bi] - self._dt_prev[bi]
                hi = t[bi].copy(); db = D[bi]; ob = O[bi]
                lo = np.maximum(lo, tmin)
                for _ in range(7):
                    m = 0.5 * (lo + hi)
                    pxm = ob[:, 0] + db[:, 0] * m; pym = ob[:, 1] + db[:, 1] * m; pzm = ob[:, 2] + db[:, 2] * m
                    bl = pzm < self.height(pxm, pym)
                    hi = np.where(bl, m, hi); lo = np.where(bl, lo, m)
                t[bi] = 0.5 * (lo + hi); hit[bi] = True
            sky_i = idx[above_sky & ~below]; sky[sky_i] = True
            far_i = idx[(far | out) & ~below & ~above_sky]; sky[far_i] = True; t[far_i] = tmax
            live = ~(below | above_sky | far | out)
            li = idx[live]
            # avance relajado
            dt = np.clip(0.34 * (pz[live] - hh[live]), np.maximum(0.7, 0.0025 * tt[live]), 60.0 + 0 * tt[live]).astype(np.float32)
            self._dt_prev[li] = dt
            t[li] += dt
            idx = li
            if verbose and it % 100 == 0: print('  paso', it, idx.size)
        # los rayos sin resolver se toman como cielo
        sky[idx] = True
        P = O + D * t[:, None]
        return dict(t=t, hit=hit, sky=sky, X=P[:, 0], Y=P[:, 1], Z=P[:, 2])

    def shadow(self, X, Y, Z, L, tmax=1200., steps=90, bias=0.2):
        """sombra dura hacia la luz L (vector unitario): 1 = iluminado"""
        sh = np.ones(X.shape, np.float32)
        t = np.full(X.shape, 3., np.float32)
        for k in range(steps):
            px = X + L[0] * t; py = Y + L[1] * t; pz = Z + L[2] * t
            hh = self.height(px, py)
            blocked = pz < hh - bias
            sh = np.where(blocked, 0, sh)
            t = t + np.maximum(2.5, 0.06 * t + np.clip(0.3 * (pz - hh), 0, 40))
        return sh

def sky_L(D, cam, base_top, base_hor, cloud_seed, cloud_h=2600., cloud_amp=0.3, cloud_cover=0.5, cloud_scale=1500., wind=(0, 0), sun_dir=None, sun_glow=0.0):
    """luminancia del cielo para direcciones D (H,W,3): degradado + nubes en un plano a cloud_h"""
    el = np.clip(D[..., 2], 0, 1)
    L = base_hor + (base_top - base_hor) * np.clip(el, 0, 1) ** 0.6
    if cloud_amp > 0:
        dz = np.maximum(D[..., 2], 0.02)
        tt = (cloud_h - cam[..., 2]) / dz
        cx = cam[..., 0] + D[..., 0] * tt + wind[0]; cy = cam[..., 1] + D[..., 1] * tt + wind[1]
        # muestreo de ruido en coordenadas del plano (textura tileable grande)
        Ntex = 2048
        tex = tfbm(Ntex, 260, 6, cloud_seed)
        tex2 = tfbm(Ntex, 90, 5, cloud_seed + 7)
        u = (cx / cloud_scale * 300) ; v = (cy / cloud_scale * 300)
        c1 = bilw(tex, u, v); c2 = bilw(tex2, u * 1.7, v * 1.7)
        c = c1 * 0.7 + c2 * 0.3
        dens = sm(1 - cloud_cover - 0.12, 1 - cloud_cover + 0.22, c)
        fade = sm(0.02, 0.22, D[..., 2])       # el cielo bajo el horizonte se funde con la bruma
        shade = 0.5 + 0.5 * sm(0.3, 0.75, c2)
        cl_L = 0.98 - 0.30 * (1 - shade) * dens
        L = L * (1 - dens * cloud_amp * fade * 2.2) + cl_L * dens * cloud_amp * fade * 2.2 - 0.0
        L = np.clip(L, 0, 1)
    return L


_TC = {}
def _tex(seed, cell, N=1024):
    if (seed, cell, N) not in _TC: _TC[(seed, cell, N)] = tfbm(N, cell, 4, seed)
    return _TC[(seed, cell, N)]

def shade_hits(T, O, D, R, M, P, seed, allow_water=True):
    """R: dict t,hit,sky,X,Y,Z (planos, n). O: orígenes (n,3). D: direcciones (n,3). P: parámetros de escena. Devuelve luminancia (n,)"""
    X, Y, Z, dist, hit = R['X'], R['Y'], R['Z'], R['t'], R['hit']
    gx, gy = X / T.dx, Y / T.dx
    alb = bil(M['alb'], gx, gy); ao = bil(M['ao'], gx, gy); veg = bil(M['veg'], gx, gy); wat = bil(M['water'], gx, gy)
    nx, ny, nz = T.normal(X, Y)
    Ls = np.array(P['sun'], np.float32); Ls /= np.linalg.norm(Ls)
    sh = T.shadow(X, Y, Z + 0.6, Ls, steps=P.get('shadow_steps', 70), tmax=P.get('shadow_tmax', 1200.), bias=P.get('shadow_bias', 0.2)) if P.get('shadows', True) else np.ones_like(X)
    ndl = np.clip(nx * Ls[0] + ny * Ls[1] + nz * Ls[2], 0, 1)
    m1, m2 = P['m1'], P['m2']      # (semilla, celda, metros por px de textura)
    def mt(sp, XX, YY): return bilw(_tex(sp[0], sp[1]), XX / sp[2], YY / sp[2])
    fade = 1 / (1 + dist / P.get('micro_fade', 900.))
    c1 = mt(m1, X, Y); c2 = mt(m2, X, Y)
    micro = (c1 - 0.5) * 0.9 + (c2 - 0.5) * 0.7
    alb = alb * (1 + micro * fade * (P.get('micro_alb', 1.5) * veg + P.get('micro_base', 0.5)))
    e = 0.5
    bx = ((mt(m2, X + e, Y) - c2) * 1.2 + (mt(m1, X + 1.2, Y) - c1) * 0.9) * fade
    by = ((mt(m2, X, Y + e) - c2) * 1.2 + (mt(m1, X, Y + 1.2) - c1) * 0.9) * fade
    ndl = np.clip(ndl - (bx * Ls[0] + by * Ls[1]) * P.get('micro_n', 9.0) * (0.4 + veg), 0, 1)
    Lum = alb * (P['amb'] * (0.55 + 0.45 * nz) * ao + P['sunI'] * ndl * (0.15 + 0.85 * sh)) * P.get('gain', 1.7)
    if allow_water and (wat > 0.5).any():
        wi = np.nonzero((wat > 0.5) & hit)[0]
        if wi.size:
            d = D[wi]; c = np.clip(-d[:, 2], 0.005, 1)
            rp = P['ripple']
            rx = (bilw(_tex(rp[0], rp[1]), X[wi] / rp[2], Y[wi] / rp[3]) - 0.5) * rp[4]
            ry = (bilw(_tex(rp[0] + 1, rp[1]), X[wi] / rp[2], Y[wi] / rp[3]) - 0.5) * rp[4] * 0.6
            nw = np.stack([rx, ry, np.ones_like(rx)], 1); nw /= np.linalg.norm(nw, axis=1, keepdims=True)
            dn = np.sum(d * nw, 1, keepdims=True)
            rd = (d - 2 * dn * nw).astype(np.float32); rd[:, 2] = np.abs(rd[:, 2]) + 0.002
            rd /= np.linalg.norm(rd, axis=1, keepdims=True)
            ro = np.stack([X[wi], Y[wi], Z[wi] + 0.15], 1).astype(np.float32)
            RR = T.trace(ro, rd, P.get('refl_tmax', 5000.), 1.0)
            Lr = shade_hits(T, ro, rd, RR, M, P, seed + 3, allow_water=False)
            F = np.clip(P.get('F0', 0.05) + (1 - P.get('F0', 0.05)) * (1 - c) ** P.get('Fpow', 4.0), 0, 1)
            Lw = P['water_deep'] * (1 - F) + F * Lr * P.get('refl_gain', 1.0)
            Lum[wi] = Lum[wi] * (1 - wat[wi]) + Lw * wat[wi]
    # bruma
    k = 1 - np.exp(-(dist / P['fog']) ** 1.15)
    Lum = Lum * (1 - k) + P['haze'] * k
    SL = sky_L(D, O, P['sky_top'], P['sky_hor'], seed, cloud_h=P.get('cloud_h', 1900.), cloud_amp=P.get('cloud_amp', 0.32), cloud_cover=P.get('cloud_cover', 0.55), cloud_scale=P.get('cloud_scale', 2200.))
    return np.where(R['sky'] | (~hit), SL, Lum)

def shade_image(T, G, M, P, seed):
    n = G['W'] * G['H']
    R = {k: G[k].reshape(-1) for k in ('t', 'hit', 'sky', 'X', 'Y', 'Z')}
    D = G['D'].reshape(-1, 3); O = np.broadcast_to(G['cam'], D.shape)
    L = shade_hits(T, O, D, R, M, P, seed)
    return L.reshape(G['H'], G['W'])
