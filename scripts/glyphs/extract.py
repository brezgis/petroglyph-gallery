#!/usr/bin/env python3
"""Stage 2 of the glyph pipeline: extract each petroglyph from its reference
image and write the peck masks the renderer carves into the stones.

For every panel in scripts/glyphs/manifest.json, each layer is:
  1. cropped (fractional box) from its cached source image,
  2. flattened — the slow light/shadow gradient of the rock is estimated with
     a wide Gaussian and removed, then contrast-stretched (CLAHE),
  3. thresholded in the layer's mode:
       light  – pecked marks brighter than the patina (desert varnish, basalt)
       dark   – ink drawings / tracings (dark on pale paper)
       red    – modern red in-fill on Scandinavian panels (a*-channel of Lab)
       color  – a coloured tracing line ("rgb" + "tol")
  4. cleaned — open/close, small specks removed, optional include/exclude
     polygons (fractions of the crop) for hand masking,
  5. optionally skeletonised and re-stroked at a uniform groove width
     ("stroke": metres) — used for thin tracings,
  6. downsampled and run-length encoded.
Output: src/art/glyphdata.js (generated — do not edit by hand) plus debug
sheets in reference/glyph-sources/debug/ for checking every glyph by eye.

usage: python3 scripts/glyphs/extract.py [panel-id ...]
"""
import base64, json, math, os, sys

import cv2
import numpy as np
from skimage.morphology import remove_small_objects, remove_small_holes, skeletonize

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.join(ROOT, 'scripts', 'glyphs')
DEBUG = os.path.join(ROOT, 'reference', 'glyph-sources', 'debug')
OUT_JS = os.path.join(ROOT, 'src', 'art', 'glyphdata.js')
STATE = os.path.join(ROOT, 'reference', 'glyph-sources', 'extracted.json')   # lets you re-run single panels
WORK = 1100          # working resolution (long side of the crop, px)
PPM_OUT = 160        # mask pixels per metre on the panel (capped by MAX_OUT)
MAX_OUT = 720


def load_source(layer, sources):
    f = layer['file']
    if f.startswith('File:'):
        path = os.path.join(ROOT, sources[f]['cache'])
    else:
        path = os.path.join(ROOT, f)
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f'cannot read {path} — run fetch.py first')
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:  # transparent SVG render: composite on white
        a = img[:, :, 3:4] / 255.0
        img = (img[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)
    return img


def crop(img, box):
    H, W = img.shape[:2]
    x0, y0, x1, y1 = box
    return img[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]


def poly_mask(shape, polys):
    h, w = shape
    m = np.zeros((h, w), np.uint8)
    for p in polys:
        pts = np.array([[x * w, y * h] for x, y in p], np.int32)
        cv2.fillPoly(m, [pts], 255)
    return m > 0


def to_crop_space(L):
    """polygons may be given in whole-image fractions ("poly_space": "image")"""
    if L.get('poly_space') != 'image':
        return L
    x0, y0, x1, y1 = L.get('crop', [0, 0, 1, 1])
    conv = lambda polys: [[[(x - x0) / (x1 - x0), (y - y0) / (y1 - y0)] for x, y in p] for p in polys]
    L = dict(L)
    for k in ('include', 'exclude'):
        if L.get(k):
            L[k] = conv(L[k])
    return L


def extract_layer(img, L):
    L = to_crop_space(L)
    if L.get('quad'):
        # perspective-correct a panel photographed at an angle: the four
        # corners (TL, TR, BR, BL; image fractions) map to a flat rectangle
        # of aspect quad_aspect (width / height)
        H0, W0 = img.shape[:2]
        src = np.float32([[x * W0, y * H0] for x, y in L['quad']])
        ow = int(max(np.linalg.norm(src[1] - src[0]), np.linalg.norm(src[2] - src[3])))
        oh = int(ow / L.get('quad_aspect', 1.0))
        M = cv2.getPerspectiveTransform(src, np.float32([[0, 0], [ow, 0], [ow, oh], [0, oh]]))
        c = cv2.warpPerspective(img, M, (ow, oh), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    else:
        c = crop(img, L.get('crop', [0, 0, 1, 1]))
    if L.get('flip'):
        c = c[:, ::-1]
    if L.get('rotate'):
        # rotate about the centre, expanding the canvas (for tilted photos)
        h, w = c.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), L['rotate'], 1)
        cos, sin = abs(M[0, 0]), abs(M[0, 1])
        nw, nh = int(h * sin + w * cos), int(h * cos + w * sin)
        M[0, 2] += nw / 2 - w / 2
        M[1, 2] += nh / 2 - h / 2
        c = cv2.warpAffine(c, M, (nw, nh), borderMode=cv2.BORDER_REPLICATE)
    hole = None
    if L.get('inpaint'):
        # an overlay colour (e.g. the yellow light-dagger drawn on a diagram):
        # paint it with the paper colour, then bridge the strokes it cut
        # (see 'bridge' below). inpaint = minimum (red − blue) of the overlay.
        cf = c.astype(np.int16)
        hole = cv2.dilate(((cf[:, :, 2] - cf[:, :, 0]) > L['inpaint']).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        c = c.copy()
        c[hole] = np.median(c[~hole], axis=0).astype(np.uint8)
    h, w = c.shape[:2]
    s = WORK / max(h, w)
    c = cv2.resize(c, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    if hole is not None:
        hole = cv2.resize(hole.astype(np.uint8), (c.shape[1], c.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
    h, w = c.shape[:2]
    mode = L.get('mode', 'light')
    lab = cv2.cvtColor(c, cv2.COLOR_BGR2LAB).astype(np.float32)

    if mode == 'ridge':
        # incised line work (e.g. Dabous): grooves show as thin light/dark
        # lines rather than a tone change — use a Sato tubeness filter
        from skimage.filters import sato
        g = lab[:, :, 0] / 255.0
        g = g - cv2.GaussianBlur(g, (0, 0), max(3, L.get('bg', 0.05) * max(h, w)))
        r = sato(g, sigmas=L.get('sigmas', [1.5, 2.5, 3.5]), black_ridges=L.get('black', True))
        region = poly_mask((h, w), L['include']) if L.get('include') else np.ones((h, w), bool)
        t = np.percentile(r[region], 100 - L.get('pct', 12))
        mask = r > t
        signal = r
    elif mode == 'color':
        rgb = np.array(L['rgb'], np.float32)[::-1]
        d = np.linalg.norm(c.astype(np.float32) - rgb, axis=2)
        mask = d < L.get('tol', 60)
        signal = 255 - np.clip(d, 0, 255)
    else:
        if mode == 'red':
            ch = lab[:, :, 1]                        # a*: green→red
        elif mode == 'smooth':
            # pecked-and-ground areas are smoother and paler than the
            # surrounding grain: low local variance + brightness
            g = lab[:, :, 0]
            r = max(3, int(L.get('tex', 0.012) * max(h, w)))
            mu = cv2.blur(g, (r, r)); var = cv2.blur(g * g, (r, r)) - mu * mu
            ch = mu - L.get('tw', 2.0) * np.sqrt(np.maximum(var, 0))
        elif mode == 'mix':                          # weighted Lab combination
            wl, wa, wb = L.get('weights', [-1, 0, 3])
            ch = wl * lab[:, :, 0] + wa * (lab[:, :, 1] - 128) + wb * (lab[:, :, 2] - 128)
        elif mode == 'chroma':                       # pale & desaturated marks
            ch = lab[:, :, 0] - L.get('satw', 1.0) * np.hypot(lab[:, :, 1] - 128, lab[:, :, 2] - 128)
        else:
            ch = lab[:, :, 0]
        if mode == 'dark':
            ch = 255 - ch
        sig = max(3, L.get('bg', 0.06) * max(h, w))
        flat = ch - cv2.GaussianBlur(ch, (0, 0), sig)
        if L.get('denoise', 1.2) > 0:
            flat = cv2.GaussianBlur(flat, (0, 0), L.get('denoise', 1.2))
        region = poly_mask((h, w), L['include']) if L.get('include') else np.ones((h, w), bool)
        vals = flat[region]
        if 'pct' in L:                                # keep the brightest pct %
            t = np.percentile(vals, 100 - L['pct'])
        else:                                         # mean + k·std
            t = vals.mean() + L.get('k', 1.0) * vals.std()
        mask = flat > t
        signal = np.clip((flat - vals.mean()) / (vals.std() * 3 + 1e-6) * 128 + 128, 0, 255)

    if L.get('trace'):
        # hand-traced outline over the photo (crop fractions) — used only where
        # thresholding cannot separate the carving (e.g. low relief)
        mask = np.zeros((h, w), bool)
        lw = max(2, int(L.get('trace_w', 0.018) * max(h, w)))
        for line in L['trace']:
            pts = np.array([[x * w, y * h] for x, y in line], np.int32)
            m8 = np.zeros((h, w), np.uint8)
            cv2.polylines(m8, [pts], bool(L.get('trace_closed', True)), 255, lw, cv2.LINE_AA)
            mask |= m8 > 127
    if L.get('include'):
        mask &= poly_mask((h, w), L['include'])
    if L.get('exclude'):
        mask &= ~poly_mask((h, w), L['exclude'])

    k = L.get('open', 1)
    if k:
        mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1,) * 2)) > 0
    k = L.get('close', 2)
    if k:
        mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1,) * 2)) > 0
    if hole is not None:
        # re-join strokes that cross the painted-out band: a row is filled
        # across the band only where a stroke touches both of its edges
        mask[hole] = False
        e = max(2, int(0.004 * w))
        for y in range(h):
            xs = np.flatnonzero(hole[y])
            if xs.size == 0:
                continue
            a, b = xs[0], xs[-1]
            if mask[y, max(0, a - e):a].any() and mask[y, b + 1:b + 1 + e].any():
                mask[y, a:b + 1] = True
    area = h * w
    mask = remove_small_objects(mask, max(4, int(L.get('min_area', 0.00012) * area)))
    if L.get('hole', 0.00005):
        mask = remove_small_holes(mask, int(L.get('hole', 0.00005) * area))
    if L.get('grow'):
        g = L['grow']
        mask = cv2.dilate(mask.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * g + 1,) * 2)) > 0
    if L.get('shrink'):
        g = L['shrink']
        mask = cv2.erode(mask.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * g + 1,) * 2)) > 0
    return c, mask, signal


def placement(L, crop_hw, panel):
    """metres: centre (x, y) on the panel face and size (w, h)."""
    h, w = crop_hw
    P = L.get('place', {})
    if 'w' in P:
        wm = P['w']; hm = wm * h / w
    elif 'h' in P:
        hm = P['h']; wm = hm * w / h
    else:  # fit inside the panel, 94 %
        k = min(panel['pw'] / w, panel['ph'] / h) * 0.94
        wm, hm = w * k, h * k
    return P.get('x', 0.0), P.get('y', 0.0), wm, hm


def restroke(mask, width_px):
    sk = skeletonize(mask)
    r = max(1, int(round(width_px / 2)))
    return cv2.dilate(sk.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1,) * 2)) > 0


def rle(mask):
    """row-major runs, alternating off/on starting with off, LEB128 varints, base64."""
    flat = mask.astype(np.uint8).ravel()
    edges = np.flatnonzero(np.diff(flat)) + 1
    bounds = np.concatenate([[0], edges, [flat.size]])
    lens = np.diff(bounds).tolist()
    if flat[0] == 1:
        lens = [0] + lens
    out = bytearray()
    for L in lens:
        while True:
            b = L & 0x7F
            L >>= 7
            if L:
                out.append(b | 0x80)
            else:
                out.append(b)
                break
    return base64.b64encode(bytes(out)).decode()


def debug_sheet(pid, i, crop_img, mask):
    os.makedirs(DEBUG, exist_ok=True)
    h, w = mask.shape
    ov = crop_img.copy()
    ov[mask] = (0.35 * ov[mask] + 0.65 * np.array([40, 230, 255])).astype(np.uint8)
    m = np.full_like(crop_img, 250)
    m[mask] = (30, 30, 30)
    sheet = np.concatenate([crop_img, ov, m], axis=1)
    s = 1800 / sheet.shape[1]
    if s < 1:
        sheet = cv2.resize(sheet, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(DEBUG, f'{pid}_{i}.jpg'), sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])


def panel_preview(pid, panel, layers_out):
    ppm = 200
    W, H = int(panel['pw'] * ppm), int(panel['ph'] * ppm)
    canvas = np.full((H, W), 235, np.uint8)
    for Lo in layers_out:
        m = decode_for_preview(Lo)
        mw, mh = int(Lo['wm'] * ppm), int(Lo['hm'] * ppm)
        if mw < 2 or mh < 2:
            continue
        m = cv2.resize(m, (mw, mh), interpolation=cv2.INTER_LINEAR)
        x0 = int((Lo['x'] + panel['pw'] / 2) * ppm - mw / 2)
        y0 = int((panel['ph'] / 2 - Lo['y']) * ppm - mh / 2)
        for yy in range(mh):
            Y = y0 + yy
            if 0 <= Y < H:
                xs = slice(max(0, x0), min(W, x0 + mw))
                row = m[yy, xs.start - x0:xs.stop - x0]
                canvas[Y, xs][row > 127] = 40
    cv2.rectangle(canvas, (0, 0), (W - 1, H - 1), 120, 2)
    cv2.imwrite(os.path.join(DEBUG, f'{pid}_panel.png'), canvas)


def decode_for_preview(Lo):
    return Lo['_mask'].astype(np.uint8) * 255


def panel_dims():
    """panel face sizes (pw × ph, metres) read straight from src/art/panels.js"""
    import re
    src = open(os.path.join(ROOT, 'src', 'art', 'panels.js')).read()
    dims = {}
    for m in re.finditer(r"\n  '([a-z-]+)': \{(.*?)\n  \},", src, re.S):
        body = m.group(2)
        pw = re.search(r'\bpw: ([\d.]+)', body); ph = re.search(r'\bph: ([\d.]+)', body)
        bw = re.search(r'\bbw: ([\d.]+)', body); bd = re.search(r'\bbd: ([\d.]+)', body)
        dais = "kind: 'dais'" in body
        dims[m.group(1)] = {'pw': float(pw.group(1)), 'ph': float(ph.group(1)), 'dais': dais}
    return dims


def main():
    only = set(sys.argv[1:])
    manifest = json.load(open(os.path.join(HERE, 'manifest.json')))
    sources = json.load(open(os.path.join(HERE, 'sources.json')))
    dims = panel_dims()
    old = {}
    if only and os.path.exists(STATE):
        old = json.load(open(STATE))
    result = dict(old)
    cache = {}
    for pid, P in manifest['panels'].items():
        if only and pid not in only:
            continue
        layers = P.get('layers', [])
        if not layers:
            result.pop(pid, None)
            continue
        panel = dims[pid]
        outs = []
        for i, L in enumerate(layers):
            key = L['file']
            if key not in cache:
                cache[key] = load_source(L, sources)
            c, mask, _ = extract_layer(cache[key], L)
            x, y, wm, hm = placement(L, mask.shape, panel)
            res_w = min(MAX_OUT, max(200, int(wm * L.get('ppm', PPM_OUT))))
            res_h = max(8, int(round(res_w * mask.shape[0] / mask.shape[1])))
            if res_h > MAX_OUT:
                res_h = MAX_OUT
                res_w = max(8, int(round(res_h * mask.shape[1] / mask.shape[0])))
            small = cv2.resize(mask.astype(np.float32), (res_w, res_h), interpolation=cv2.INTER_AREA) > L.get('cut', 0.42)
            if L.get('stroke'):
                small = restroke(small, L['stroke'] * res_w / wm)
            debug_sheet(pid, i, c, mask)
            outs.append({'x': round(x, 4), 'y': round(y, 4), 'wm': round(wm, 4), 'hm': round(hm, 4),
                         'w': res_w, 'h': res_h, 'depth': L.get('depth', 1.0), 'rle': rle(small), '_mask': small,
                         'src': key})
            cov = small.mean() * 100
            print(f'{pid}[{i}] {res_w}x{res_h} px  {wm:.2f}x{hm:.2f} m  coverage {cov:.1f}%  rle {len(outs[-1]["rle"])//1024} KB')
        panel_preview(pid, panel, outs)
        result[pid] = [{k: v for k, v in o.items() if not k.startswith('_')} for o in outs]
    json.dump(result, open(STATE, 'w'))
    total = 0
    with open(OUT_JS, 'w') as f:
        f.write('// GENERATED by scripts/glyphs/extract.py from the Wikimedia Commons reference\n'
                '// images listed in scripts/glyphs/sources.json — do not edit by hand.\n'
                '// Each layer: centre (x, y) and size (wm × hm) in metres on the panel face,\n'
                '// plus a w × h peck mask, run-length encoded (LEB128 varints, base64).\n'
                'export const GLYPHS = {\n')
        for pid in sorted(result):
            f.write(f'  {json.dumps(pid)}: [\n')
            for o in result[pid]:
                total += len(o['rle'])
                f.write('    ' + json.dumps({k: o[k] for k in ('x', 'y', 'wm', 'hm', 'w', 'h', 'depth', 'rle')}) + ',\n')
            f.write('  ],\n')
        f.write('};\n\n')
        # credits for every panel whose glyph came from a reference image
        credits = {}
        for pid, P in manifest['panels'].items():
            seen = []
            for L in P.get('layers', []):
                k = L['file']
                if k in [c.get('_k') for c in seen]:
                    continue
                if k.startswith('File:'):
                    m = sources[k]
                    seen.append({'_k': k, 'title': k[5:], 'author': m['author'][:120], 'license': m['license'], 'page': m['page']})
                else:
                    seen.append({'_k': k, 'title': os.path.basename(k), 'author': 'the curator (field photograph)', 'license': '', 'page': ''})
            if seen:
                credits[pid] = {'status': P.get('status', ''), 'traced': any(L.get('trace') for L in P['layers']),
                                'images': [{kk: vv for kk, vv in c.items() if kk != '_k'} for c in seen]}
        f.write('export const GLYPH_CREDITS = ' + json.dumps(credits, indent=1, ensure_ascii=False) + ';\n')
    print(f'wrote {os.path.relpath(OUT_JS, ROOT)} ({total // 1024} KB of mask data, {len(result)} panels)')


if __name__ == '__main__':
    main()
