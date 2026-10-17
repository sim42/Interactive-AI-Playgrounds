"""Prepare a whitelisted static release; never include private workspace files."""
from pathlib import Path
import hashlib
import json
import shutil
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
stage = Path(sys.argv[1]).resolve()
assert not stage.exists(), 'Choose a fresh release directory'
site = stage / 'IntroductionToAI'
site.mkdir(parents=True)
roots = ['index.html', 'README.md', 'TESTING.md', 'AGENTS.md',
         'DESIGN_RESEARCH.md', 'LLM_VISUALIZATION_ROADMAP.md',
         'topics', 'dist', 'docs']
blocked = {'.DS_Store', 'node_modules', '__pycache__', '.git'}
for relative in roots:
    source = ROOT / relative
    files = sorted(source.rglob('*')) if source.is_dir() else [source]
    for file in files:
        assert not file.is_symlink(), file
        if not file.is_file() or blocked.intersection(file.parts) or file.name.startswith('._'):
            continue
        dest = site / file.relative_to(ROOT)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, dest)
manifest = []
for file in sorted(site.rglob('*')):
    if file.is_file():
        data = file.read_bytes()
        manifest.append({'path': str(file.relative_to(site)), 'size': len(data),
                         'sha256': hashlib.sha256(data).hexdigest()})
(stage / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
archive = stage / 'IntroductionToAI.tar.gz'
with tarfile.open(archive, 'w:gz') as tar:
    tar.add(site, arcname='IntroductionToAI')
print(f'{len(manifest)} public files, {sum(i["size"] for i in manifest)} bytes')
print(archive)
print('Archive SHA-256:', hashlib.sha256(archive.read_bytes()).hexdigest())
