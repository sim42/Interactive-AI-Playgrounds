"""Build student ZIPs from the verified static artifacts (development only)."""
from pathlib import Path
import hashlib
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOPICS = (
    'machine-learning-algorithms', 'gradient-descent',
    'monte-carlo-optimization', 'mlp-playground', 'universal-approximation',
)
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)


def files(topic):
    for file in sorted((ROOT / 'topics' / topic).rglob('*')):
        assert not file.is_symlink(), file
        if file.is_file() and file.name != '.DS_Store':
            yield file


def add(archive, name, data):
    info = zipfile.ZipInfo(name, (2026, 10, 13, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    archive.writestr(info, data)


for topic in TOPICS:
    with zipfile.ZipFile(DIST / (topic + '.zip'), 'w') as archive:
        for file in files(topic):
            add(archive, topic + '/' + str(file.relative_to(ROOT / 'topics' / topic)), file.read_bytes())

# The offline entry keeps experiment links, and omits online ZIP download links.
entry = (ROOT / 'index.html').read_text()
entry = re.sub(r'<a\b[^>]*href="\./dist/[^"]+"[^>]*>.*?</a>', '', entry, flags=re.S)
entry = entry.replace('五个独立交互实验。', '五个独立离线交互实验。')
with zipfile.ZipFile(DIST / 'ai-interactive-courseware.zip', 'w') as archive:
    prefix = 'AI 交互课件/'
    add(archive, prefix + 'index.html', entry.encode())
    add(archive, prefix + '使用说明.txt', ('完整解压后，双击根部index.html选择实验；也可进入topics中的任一主题，双击其中index.html。\n'
        '分享单一课件时，只需复制对应主题的整个文件夹。所有主题可独立离线运行。\n'
        '不需要安装软件、启动服务器或访问网络。教学说明与兼容验证记录在每个主题README.md。\n').encode())
    for topic in TOPICS:
        for file in files(topic):
            add(archive, prefix + 'topics/' + topic + '/' + str(file.relative_to(ROOT / 'topics' / topic)), file.read_bytes())

checksums=[]
for file in sorted(DIST.glob('*.zip')):
    digest=hashlib.sha256(file.read_bytes()).hexdigest()
    checksums.append(digest+'  '+file.name)
    print(file.name, file.stat().st_size, 'bytes', digest)
(DIST / 'SHA256SUMS.txt').write_text('\n'.join(checksums)+'\n')
