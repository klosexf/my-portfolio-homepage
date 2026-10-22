#!/usr/bin/env python3
"""Keep the canonical homepage, asset versions and legacy entry in sync."""

import argparse
import hashlib
import re
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Report stale files without writing.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    homepage = root / 'index.html'
    legacy = root / 'portfolio-demos/demo-a-macos-desktop.html'
    original = homepage.read_text()

    def version(match):
        asset = match.group(1)
        digest = hashlib.sha256((root / asset).read_bytes()).hexdigest()[:10]
        return f'{asset}?v={digest}'

    updated = re.sub(r'(portfolio-demos/(?:homepage|gallery)/[^"?]+\.(?:css|js))(?:\?v=[^"\s]+)?(?=")', version, original)
    if '<head>' not in updated or '<base ' in updated:
        raise SystemExit('index.html must contain <head> and use relative URLs without a base tag.')
    expected_legacy = updated.replace('<head>', '<head>\n  <base href="../">', 1)
    stale = []
    if original != updated:
        stale.append('index.html asset versions')
    if not legacy.exists() or legacy.read_text() != expected_legacy:
        stale.append('portfolio-demos/demo-a-macos-desktop.html')

    if args.check:
        if stale:
            raise SystemExit('Homepage files are stale: ' + ', '.join(stale) + '. Run python3 scripts/sync-homepage.py.')
        print('Homepage asset versions and legacy entry are in sync.')
        return
    homepage.write_text(updated)
    legacy.write_text(expected_legacy)
    print('Homepage asset versions and legacy entry updated.')


if __name__ == '__main__':
    main()
