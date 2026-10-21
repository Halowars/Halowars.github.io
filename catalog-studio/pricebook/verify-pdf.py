"""Inspect generated PDFs with an independent PDF engine, including text reconciliation."""
from pathlib import Path
import json
import pymupdf

base = Path(__file__).parent / 'qa'
results = []
for name, expected in [('sample-catalog', 7), ('sample-prices', 3), ('stress-catalog', 2), ('stress-prices', 1)]:
    pdf = pymupdf.open(base / f'{name}.pdf')
    assert len(pdf) == expected, f'{name}: expected {expected} pages, found {len(pdf)}'
    text = '\n'.join(page.get_text() for page in pdf)
    for n, page in enumerate(pdf):
        assert page.get_text().strip(), f'{name} page {n + 1} is blank'
        rect = page.rect
        assert abs(rect.width - 595.28) < 2 and abs(rect.height - 841.89) < 2
        for block in page.get_text('dict')['blocks']:
            if block['type'] != 0:
                continue
            for line in block['lines']:
                for span in line['spans']:
                    x0, y0, x1, y1 = span['bbox']
                    assert x0 >= -1 and y0 >= -1 and x1 <= rect.width + 1 and y1 <= rect.height + 1, f'{name}: text outside page'
        if n in [0, 1]:
            page.get_pixmap(matrix=pymupdf.Matrix(1.25, 1.25)).save(base / f'{name}-page-{n+1}.png')
    if name.startswith('sample'):
        for sku in ['000101','000102','000103','000104','000201','000202','000203','000204','000301','000302','000303','000304']:
            assert text.count(sku) == 1, f'{name}: SKU {sku} missing or repeated'
        assert '$7.65' in text and '$18.00' in text, f'{name}: expected tier prices missing'
        assert 'FICTIONAL DEMO' in text
    results.append({'file': f'{name}.pdf', 'pages': len(pdf), 'passed': True})
(base / 'pdf-results.json').write_text(json.dumps(results, indent=2) + '\n')
print('PDF inspection: 4/4 documents passed page counts, A4 dimensions, text bounds and sample SKU/price reconciliation.')
