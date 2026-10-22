#!/usr/bin/env python3
"""Check local homepage/demo dependencies, including catalog-driven resources."""

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
checked = set()
parsed = set()
missing = []


def reference(value, owner, follow=True):
    url = urlsplit(html.unescape(value))
    if url.scheme or url.netloc or not url.path:
        return
    path = (ROOT / unquote(url.path).lstrip('/')) if url.path.startswith('/') else owner.parent / unquote(url.path)
    path = path.resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        missing.append(f'{owner.relative_to(ROOT)} -> {value}')
        return
    checked.add(path)
    if follow:
        inspect(path)


class Resources(HTMLParser):
    def __init__(self, owner):
        super().__init__()
        self.owner = owner

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base':
            raise ValueError('Canonical homepage and demos must not change the resource base.')
        for key in ['src', 'href']:
            if key in attrs:
                reference(attrs[key], self.owner, follow=tag != 'a')


def inspect(path):
    if path in parsed:
        return
    parsed.add(path)
    if path.suffix == '.html':
        Resources(path).feed(path.read_text())
    elif path.suffix == '.css':
        for match in re.finditer(r'url\(\s*([\'"]?)(.*?)\1\s*\)', path.read_text()):
            reference(match.group(2), path)


def object_literal(path):
    source = path.read_text()
    return json.JSONDecoder().raw_decode(source[source.index('=') + 1:].lstrip())[0]


inspect(ROOT / 'index.html')
catalog = object_literal(ROOT / 'portfolio-demos/gallery/products.js')
for product in catalog.values():
    for field in ['image', 'icon', 'demo', 'href']:
        reference(product[field], ROOT / 'index.html', follow=field != 'href')

data_file = ROOT / 'portfolio-demos/uipicks-animation/data.js'


def data_images(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'image' and isinstance(item, str):
                reference(item, ROOT / 'portfolio-demos/embed-uipicks.html')
            else:
                data_images(item)
    elif isinstance(value, list):
        for item in value:
            data_images(item)


data_images(object_literal(data_file))
if missing:
    raise SystemExit('Missing gallery dependencies:\n' + '\n'.join(missing))
print(f'Gallery dependencies complete: {len(checked)} local files checked.')
