"""Validate and extract deliverable ZIPs for browser acceptance."""
from pathlib import Path
import hashlib
import sys
import zipfile
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
DEST=Path(sys.argv[1])
assert not DEST.exists(), 'Choose a fresh extraction directory'
DEST.mkdir(parents=True)
blocked={'.DS_Store','node_modules','__pycache__','.git'}
for file in (ROOT/'dist').glob('*.zip'):
    with zipfile.ZipFile(file) as z:
        assert z.testzip() is None, file
        for info in z.infolist():
            p=Path(info.filename)
            assert not p.is_absolute() and '..' not in p.parts, info.filename
            assert not blocked.intersection(p.parts) and not p.name.startswith('._'), info.filename
            assert (info.external_attr>>16)&0o170000 != 0o120000, info.filename
        z.extractall(DEST/('总包' if file.name=='ai-interactive-courseware.zip' else '独立主题'))
count=0
for topic in (ROOT/'topics').iterdir():
    if not (topic/'index.html').exists():continue
    for source in topic.rglob('*'):
        if not source.is_file() or source.name=='.DS_Store':continue
        rel=source.relative_to(ROOT/'topics')
        assert source.read_bytes()==(DEST/'独立主题'/rel).read_bytes()==(DEST/'总包'/'AI 交互课件'/'topics'/rel).read_bytes(), rel
        count+=1
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key not in ('href','src') or not value or value.startswith(('#','http:','https:')):continue
            assert (DEST/'总包'/'AI 交互课件'/value).exists(), value
Links().feed((DEST/'总包'/'AI 交互课件'/'index.html').read_text())
for line in (ROOT/'dist'/'SHA256SUMS.txt').read_text().splitlines():
    digest,name=line.split('  ')
    assert hashlib.sha256((ROOT/'dist'/name).read_bytes()).hexdigest()==digest
print(f'PASS {count} topic files identical across source, individual ZIP and total ZIP; safe paths, checksums, complete offline entry.')
print(DEST/'独立主题')
