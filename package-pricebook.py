"""Create deterministic buyer software and separate seller business kits; verify every archived byte."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent
BASE = ROOT / 'catalog-studio'
APP = BASE / 'pricebook'
OUT = ROOT / 'releases'
OUT.mkdir(exist_ok=True)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write_package(name, files):
    files = dict(files)
    files['CHECKSUMS.sha256'] = ''.join(f'{digest(data)}  {name}\n' for name, data in sorted(files.items())).encode()
    target = OUT / name
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for filename, data in sorted(files.items()):
            info = zipfile.ZipInfo(filename, (2026, 10, 21, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, data)
    with zipfile.ZipFile(target) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(files)
        for filename, data in files.items():
            assert z.read(filename) == data, filename
    return {'name': name, 'bytes': target.stat().st_size, 'files': len(files), 'sha256': digest(target.read_bytes()), 'integrity': 'passed'}

buyer = {'index.html': (APP/'index.html').read_bytes(), 'README.md': (APP/'DELIVERY_README.md').read_bytes()}
for name in ['BUYER_GUIDE.md', 'ENGINEERING.md', 'QA_STATUS.md', 'ACCEPTANCE_AND_HANDOVER.md']:
    buyer[name] = (APP/name).read_bytes()
for name in ['core.cjs','studio.js','tests.cjs','ui-tests.cjs','build.cjs','ui/shell.html','ui/style.css','fixtures/demo-products.csv','fixtures/broken-products.csv']:
    buyer['source/catalog-studio/'+name] = (BASE/name).read_bytes()
source_files = ['pricebook.cjs','app.js','shell.html','style.css','build.cjs','tests.cjs','browser-tests.cjs','verify-pdf.py','ENGINEERING.md','test-results.json']
for name in source_files:
    buyer['source/catalog-studio/pricebook/'+name] = (APP/name).read_bytes()
buyer['source/catalog-studio/pricebook/README.md'] = b'# Pricebook Studio source\n\nFrom the parent catalog-studio folder, run node tests.cjs, node pricebook/tests.cjs and node pricebook/build.cjs. The last command creates pricebook/index.html and samples. See ENGINEERING.md and the operating guides at the delivery ZIP root.\n'
for path in (APP/'fixtures').glob('*'):
    if path.is_file(): buyer['source/catalog-studio/pricebook/fixtures/'+path.name] = path.read_bytes()
for name in ['trade-catalog.html','trade-prices.html','trade-catalog.pdf','trade-prices.pdf']:
    buyer['samples/'+name] = (APP/'samples'/name).read_bytes()
for name in ['engine-tests.json','browser-ci-results.json','pdf-ci-results.json','browser-current-results.json']:
    buyer['verification/'+name] = (APP/'verification'/name).read_bytes()

seller = {}
for name in ['TRISTAN_START_HERE.md','OFFER.md','ACCEPTANCE_AND_HANDOVER.md','SOURCES.md','QA_STATUS.md']:
    seller[name] = (APP/name).read_bytes()
seller['README.md'] = b'# Tristan: seller kit\n\nStart with TRISTAN_START_HERE.md. This package is for your sales and delivery process; do not send it as the buyer software package. Proposed price is $12,500, subject to sample fit and buyer validation. Software delivery is the separate Fieldnote_Pricebook_Studio_v0.2.zip file.\n'

report = [write_package('Fieldnote_Pricebook_Studio_v0.2.zip', buyer), write_package('Tristan_Pricebook_Business_Kit.zip', seller)]
(OUT/'package-verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
