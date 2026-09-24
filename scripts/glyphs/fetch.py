#!/usr/bin/env python3
"""Stage 1 of the glyph pipeline: download reference images from Wikimedia Commons.

Reads scripts/glyphs/manifest.json, and for every layer's `file` (a Commons
"File:" title) asks the Commons API for the image URL + licence metadata,
then downloads a scaled rendition (default 2400 px wide, never upscaled) into
reference/glyph-sources/ (gitignored). Credits are written to
scripts/glyphs/sources.json, which IS tracked, and feed the README + labels.

Only plain HTTPS GETs to commons.wikimedia.org / upload.wikimedia.org.

usage: python3 scripts/glyphs/fetch.py [--force] [File:Title ...]
"""
import json, os, re, sys, time, urllib.parse, urllib.request, html

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.join(ROOT, 'scripts', 'glyphs')
CACHE = os.path.join(ROOT, 'reference', 'glyph-sources')
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'FirstMarksGlyphPipeline/1.0 (https://github.com/brezgis/petroglyph-gallery)'
ALLOWED = ('commons.wikimedia.org', 'upload.wikimedia.org')
WIDTH = 2400


def upload_url(url):
    # Commons may hand back thumbnails on thumb.wikimedia.org; the same file is
    # served from the classic upload.wikimedia.org/.../thumb/ path.
    u = urllib.parse.urlparse(url)
    if u.hostname == 'thumb.wikimedia.org':
        return 'https://upload.wikimedia.org' + u.path
    return url.split('?')[0]


def get(url):
    host = urllib.parse.urlparse(url).hostname
    assert host in ALLOWED, f'refusing to contact {host}'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except Exception as e:  # 429 / transient
            if attempt == 4:
                raise
            time.sleep(4 * (attempt + 1))


def strip(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    s = re.sub(r'^(Unknown author)\s*\1', r'\1', s)       # Commons repeats this one
    return s


def slug(title):
    base = title.split(':', 1)[1]
    base = re.sub(r'\.[A-Za-z]+$', '', base)
    out = re.sub(r'[^A-Za-z0-9]+', '_', base).strip('_')[:80]
    if len(out) < 6:  # non-Latin titles: keep them distinct and filesystem-safe
        import hashlib
        out = (out + '_' if out else '') + 'commons_' + hashlib.sha1(title.encode()).hexdigest()[:10]
    return out


def info(title):
    q = urllib.parse.urlencode({
        'action': 'query', 'titles': title, 'prop': 'imageinfo', 'format': 'json',
        'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': WIDTH})
    page = next(iter(json.loads(get(f'{API}?{q}'))['query']['pages'].values()))
    ii = page['imageinfo'][0]
    em = ii.get('extmetadata', {})
    val = lambda k: strip(em.get(k, {}).get('value'))
    use_thumb = bool(ii.get('thumburl')) and (ii['width'] > WIDTH or ii.get('mime') in ('image/svg+xml', 'image/tiff'))
    return {
        'title': title,
        'page': ii['descriptionurl'],
        'original': ii['url'],
        'download': upload_url(ii['thumburl'] if use_thumb else ii['url']),
        'width': ii['width'], 'height': ii['height'],
        'author': val('Artist') or val('Credit'),
        'credit': val('Credit'),
        'license': val('LicenseShortName'),
        'licenseUrl': val('LicenseUrl'),
        'description': val('ImageDescription')[:300],
    }


def main():
    force = '--force' in sys.argv
    titles = [a for a in sys.argv[1:] if a.startswith('File:')]
    manifest = json.load(open(os.path.join(HERE, 'manifest.json')))
    if not titles:
        titles = sorted({l['file'] for p in manifest['panels'].values() for l in p.get('layers', []) if l.get('file', '').startswith('File:')})
    os.makedirs(CACHE, exist_ok=True)
    src_path = os.path.join(HERE, 'sources.json')
    sources = json.load(open(src_path)) if os.path.exists(src_path) else {}
    for t in titles:
        s = slug(t)
        ext = '.png' if t.lower().endswith(('.svg', '.png', '.gif', '.tif', '.tiff')) else '.jpg'
        out = os.path.join(CACHE, s + ext)
        if os.path.exists(out) and t in sources and not force:
            continue
        meta = info(t)
        data = get(meta['download'])
        open(out, 'wb').write(data)
        meta['cache'] = os.path.relpath(out, ROOT)
        sources[t] = meta
        print(f'{t}\n   -> {meta["cache"]} ({len(data)//1024} KB) · {meta["license"]} · {meta["author"][:70]}')
        time.sleep(1.0)
    if not sys.argv[1:] or '--prune' in sys.argv:
        # keep credits only for images the manifest actually uses
        used = {l['file'] for p in manifest['panels'].values() for l in p.get('layers', [])}
        sources = {k: v for k, v in sources.items() if k in used}
    json.dump(dict(sorted(sources.items())), open(src_path, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
