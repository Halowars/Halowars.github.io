# Verification status — 0.2.0 release candidate

The implemented software passes the checks below. This is not a zero-defect guarantee, a security certification or proof of willingness to pay.

## Identified build

- Source commit tested in CI: `ae9e7b699c1e9e611d0e6758fc3b0bc2eea42deb`
- Application SHA-256: `3c8fba20477f4e94c814fff411fefcb6eb81ecf5d02c2ca91b8890596c828da5`
- Successful run: https://github.com/Halowars/Halowars.github.io/actions/runs/39543392909
- CI platform: Ubuntu 24.04, Node 22.23.3, Playwright 1.56.1.
- CI browsers: Chromium 141.0.7390.37 and Firefox 142.0.1.
- Additional local platform: Linux, Node 24.19.0, Playwright 1.62.1, Chromium 153.0.8010.0.

## Results

| Check | Result | What it establishes |
| --- | --- | --- |
| Shared catalog engine | 75 / 75 passed | Parsing, normalization, HTML/CSV output and original engine edge cases |
| Legacy simulated interface | 18 / 18 passed | Existing operator prototype regressions; these do not test the new browser UI |
| Pricebook engine | 52 / 52 passed | Exact cents, half-up discounts, margin boundaries, all tiers, comparison, project restore and public-field whitelist |
| Actual browser interactions in CI | 41 / 41 passed | New Pricebook UI in Chromium and Firefox; includes downloads, images, restore, approval invalidation and stale async reads |
| Actual browser interactions in newer Chromium | 21 / 21 passed | The Chromium portion repeated in version 153; counted separately, not added to the 186 unique CI checks |
| PDF verification | 4 / 4 documents passed | A4 pages, expected pagination, no out-of-page text, exact sample SKU/price reconciliation and long-row header/footer retention |
| Build reproduction | Passed | CI rebuild has no diff against tracked standalone app and sample HTML |

**Unique CI total: 186 passing automated checks, plus four passing PDF document checks.** The engine suite includes a 1,000-product × five-tier audit and 20,000 varied arithmetic cases. The four PDF cases are the seven-page sample catalog, three-page sample price sheet, two-page maximum-text Latin catalog and two-page maximum-text Latin price sheet. Those stress cases are specified test inputs, not a proof that every permitted language/font or input combination fits every printer.

Actual browser checks cover malformed/duplicate source, missing/negative costs, below-floor prices, overprecise rules, PNG/JPEG/WebP decoding, corrupt/oversize/overwide image rejection, backup restore with photos, removal acknowledgement, failed previous-edition imports, no cost/other-tier data in customer exports, fictional watermark retention, strict UTF-8 file rejection, late reads, and no HTTP requests. Responsive widths checked: 390, 768, 1024 and 1440 pixels.

## Visual inspection

Inspected the desktop workspace and every page of both fictional sample PDFs. Also inspected the corrected maximum-text price-sheet pages. Headers, rows, footers, prices and page numbering remain together without clipping in those fixtures. Sample product images are intentionally absent and visibly marked; separate browser tests use real decoded raster fixtures.

Earlier print testing caught a long-row overflow. The fixed generator reduces long-text price pages to four rows rather than allowing a logical page's footer and last row to spill into an extra physical page. The passing run above includes the regression check and independent PDF validation.

## Before an actual commercial handover

Still required: approved customer data, independent reconciliation to supplier facts, the actual buyer's OS/browser, actual photos/fonts/printer settings, a self-service buyer run, and written acceptance. No customer trial, sale, savings figure or $12,500 willingness to pay has been established.

Windows/Edge, macOS/Safari, physical printers, other currencies, multilingual typography and simultaneous editing across computers have not been qualified by these runs. Browser printing is verified with the specified A4 digital-PDF settings, not as a universal prepress workflow. Every production edition needs source and visual review.

Projects and review records are ordinary editable local files. They are not encrypted, authenticated approvals or tamper-evident logs. There is no hosted service or remote code update to maintain; future compatibility or feature work still requires an owner after the fixed acceptance/correction period.
