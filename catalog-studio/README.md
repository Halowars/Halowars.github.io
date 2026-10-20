# Fieldnote Catalog Studio — v0.1

A working operator prototype for a **managed product-catalog production service**.

The customer sends an existing product spreadsheet, approved photos, and branding. Tristan produces the finished catalog, matching price sheet, cleaned data, and exceptions report. The customer does not operate this software or change their website.

**Status:** core and simulated interface checks pass. Real-browser, image-decoding, download, PDF-printing, and customer-data acceptance are still pending. This is not an unattended, customer-ready service.

## Open the prototype

1. Download and extract `Fieldnote_Catalog_Studio_v0.1.zip`.
2. Open `index.html` in a current desktop Chrome, Edge, Firefox, or Safari browser.
3. The fictional 12-product sample loads automatically. Click **Draft catalog HTML** and open the downloaded file.
4. Use that file's **Print / Save PDF** button. Select A4, disable browser headers/footers, and enable background graphics. Inspect all pages.
5. The studio's **Delivery checklist** and **Tristan's sales guide** tabs contain the operating and selling steps.

The bundled `sample-catalog.html` and `sample-price-sheet.html` are already-generated fictional examples. No development server or npm install is needed.

## What it does

- Imports strict UTF-8 CSV, TSV, or semicolon-separated text, including quoted fields and multiline descriptions.
- Maps common distributor-export headers; requires explicit selection when ambiguous.
- Keeps leading-zero SKUs as text, compares duplicates without case/compatibility differences, and records physical source lines.
- Requires SKU, product name, category, and selling unit; flags missing descriptions, photos, and prices.
- Parses a single USD price tier to integer cents. Rejects negative, ambiguous, non-USD, or overprecise prices.
- Matches local PNG/JPEG/WebP files by exact filename. Images are embedded into standalone exports.
- Produces searchable branded catalog HTML, matching price sheet HTML, cleaned CSV, exceptions CSV, and review-record JSON.
- Clears release approval when source, mapping, branding, or assets change. Pending image reads block export.
- Escapes imported HTML and neutralizes spreadsheet formula prefixes in CSV output.
- Runs entirely in memory. There are no server calls, analytics, accounts, payments, or outreach.

## Scope and limits

- Maximum 1,000 products, 80 columns, 5 million CSV characters; input file limited to 10 MB.
- One row per sellable SKU and one USD price tier. Price means **per supplied selling unit**, not an inferred each/case conversion.
- Optional blank price becomes “Price on request”; zero remains $0.00.
- Product photos must be approved and supplied locally, not scraped from arbitrary URLs.
- 10 MB per photo; maximum 6,000 pixels per dimension and 20 megapixels; total image data budget is 45 million base64 characters.
- Export guard rejects output above 55 million characters. For commercial delivery, resize images and check actual file size; an email-friendly size is not guaranteed.
- Text limits prevent uncontrolled layout: SKU 80, name 110, category 70, pack 65, brand 80, description 800 characters and at most 10 lines.
- Conservative pagination uses two catalog products or eight price-sheet rows per category page. Real PDF page fit still needs visual verification.
- Digital PDFs use browser print. This is not CMYK/prepress production, PDF/X output, or guaranteed accessible PDF.
- No XLSX/PDF extraction, OCR, automatic copywriting, online intake, server storage, payment checkout, or background processing.
- No saved session or restore: download source, records, and exports before closing. Revalidating edited CSV clears photos.
- Cleaned CSV is formula-safe. An apostrophe can be prefixed to risky cells; JSON retains the original source text. Import the SKU column as text in Excel to preserve zeros.
- The review JSON omits image bytes and is not a signed record of customer approval. Keep original images and written approval separately.

## Run the reproducible checks

Requires Node.js 20 or newer; no third-party dependencies.

```sh
node tests.cjs
node build.cjs
python3 verify-package.py
```

The first command runs 75 engine tests and 18 interface-state tests using a simulated DOM. The second rebuilds the standalone studio from its source files. The Python command checks ZIP integrity and exact source-file contents on a clean release checkout or extraction. Run `node tests.cjs` again only if source changes.

The 93 checks passed in both the available V8 runtime and GitHub Actions on Node.js 22.23.3 / Ubuntu 24.04. The generated bundle rebuilt identically. Verified CI run: https://github.com/Halowars/Halowars.github.io/actions/runs/39500814003. The local execution environment was unavailable, so real-browser, native image, download, and PDF appearance checks remain pending. See `test-report.json` and `BROWSER_ACCEPTANCE.md`.

## Files to read

| File | Purpose |
| --- | --- |
| `TRISTAN_START_HERE.md` | The decision, what to sell, exact actions and wording |
| `OFFER_AND_SCOPE.md` | Proposed pilot, scope, deliverables, change limits |
| `PRODUCTION_RUNBOOK.md` | Intake through approval and delivery |
| `BROWSER_ACCEPTANCE.md` | Mandatory manual release checks |
| `ARCHITECTURE.md` | Data flow, controls, and later automation boundaries |
| `SOURCES.md` | Competitor evidence and limits of commercial assumptions |
| `fixtures/` | Fictional good and deliberately broken CSV data |
| `core.cjs` | Reusable parser, audit rules, and document generation |
| `studio.js` | Operator interface behavior |
| `ui/` | Workbench layout and style |
| `tests.cjs`, `ui-tests.cjs` | Reproducible logic and simulated state tests |
| `build.cjs` | Builds `index.html` without dependencies |

All bundled product data, company names, prices, and sample content are fictional. This source repository is public. Keep real customer data and commercial project files in a private location.
