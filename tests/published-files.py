"""Development-only HTTPS byte verification of a prepared lesson release."""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import sys
import time
import urllib.parse
import urllib.request

stage=Path(sys.argv[1])
base=sys.argv[2] if len(sys.argv)>2 else 'https://ftp.dtsci.cn/IntroductionToAI/'
items=json.loads((stage/'manifest.json').read_text())

def check(item):
    url=base+urllib.parse.quote(item['path'])
    error=None
    for attempt in range(3):
        try:
            request=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'AI-courseware-release-verification'})
            with urllib.request.urlopen(request,timeout=30) as response:
                data=response.read()
                assert response.status==200,(response.status,url)
            assert len(data)==item['size'],('size',item['path'],len(data),item['size'])
            assert hashlib.sha256(data).hexdigest()==item['sha256'],('SHA256',item['path'])
            return None
        except Exception as exc:
            error=repr(exc)
            if attempt<2:time.sleep(0.5*(attempt+1))
    return {'path':item['path'],'error':error}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    errors=[result for result in pool.map(check,items) if result]
if errors:
    print(json.dumps(errors,ensure_ascii=False,indent=2));sys.exit(1)
print(f'PASS {len(items)}/{len(items)} public HTTPS files match local bytes and SHA-256; {sum(i["size"] for i in items)} bytes.')
