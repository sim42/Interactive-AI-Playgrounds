"""Development-only static audit; student topic folders do not need Python."""
from pathlib import Path
from html.parser import HTMLParser
import re

ROOT = Path(__file__).resolve().parents[1]

class ResourceCheck(HTMLParser):
    def __init__(self, root):
        super().__init__()
        self.root = root
        self.count = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert not (tag == 'script' and attrs.get('type') == 'module'), self.root
        for key in ('src', 'href', 'poster', 'data'):
            if key not in attrs:
                continue
            value = attrs[key]
            if value.startswith('#'):
                continue
            if tag == 'a' and key == 'href' and re.match(r'^https?://', value):
                assert 'data-external' in attrs and attrs.get('target') == '_blank', (self.root, value)
                assert {'noopener', 'noreferrer'}.issubset(set(attrs.get('rel', '').split())), (self.root, value)
                continue  # Explicit user-activated reading link; never an automatic resource.
            assert not re.match(r'(^/|^[a-zA-Z]+:|^//)', value), (self.root, value)
            assert '..' not in value.split('/'), (self.root, value)
            resolved = (self.root / value).resolve()
            assert resolved.exists() and resolved.is_relative_to(self.root.resolve()), (self.root, value)
            self.count += 1

for topic in sorted((ROOT / 'topics').iterdir()):
    if not (topic / 'index.html').exists():
        continue
    check = ResourceCheck(topic)
    check.feed((topic / 'index.html').read_text())
    for file in topic.rglob('*'):
        assert not file.is_symlink(), file
        if file.suffix not in ('.js', '.html', '.css'):
            continue
        text = file.read_text()
        audit_text = text
        if file.name == 'katex.min.js' and file.parent.name == 'katex':
            # KaTeX's parser.fetch() reads its next in-memory TeX token.
            # It is a zero-argument parser method, not the browser Fetch API.
            # Keep actual fetch(url), XMLHttpRequest and other runtime checks.
            audit_text = audit_text.replace('.fetch()', '.nextToken()').replace('fetch(){', 'nextToken(){')
        assert not re.search(r'\b(fetch\s*\(|XMLHttpRequest|import\s*\(|new\s+Worker\s*\(|serviceWorker|eval\s*\(|new\s+Function\s*\()', audit_text), file
        assert not re.search(r'\bimport\s+.*?\bfrom\s*[\"\x27]', text), file
        for value in re.findall(r'url\([\s\"\x27]*([^\)\"\x27]+)', text):
            if value.startswith('#'):  # Inline SVG marker/filter reference, not a resource load.
                continue
            assert not re.match(r'(^/|^[a-zA-Z]+:|^//)', value), (file, value)
            assert '..' not in value.split('/') and (file.parent / value).exists(), (file, value)
    size = sum(f.stat().st_size for f in topic.rglob('*') if f.is_file())
    print(f'{topic.name}: PASS, {check.count} local references, {size} bytes')
