# Source and maintenance handover

In a delivery ZIP, begin in `source/catalog-studio`. The root `index.html` is the ready-to-run copy; `node pricebook/build.cjs` regenerates it as `source/catalog-studio/pricebook/index.html`.

## Runtime

The application is a single generated HTML file with embedded CSS and JavaScript. It uses File/FileReader, Blob downloads, TextDecoder, image decoding and BigInt. No third-party package runs in the delivered application. The Content Security Policy disallows network connections, remote assets, form submission and object embedding. Inline script/style are allowed for local standalone operation.

The legacy `../core.cjs` implements CSV parsing, common normalization, HTML/CSV escaping, product auditing and catalog rendering. `pricebook.cjs` implements exact pricing rules, cost checks, tier projections, comparisons and project serialization. `app.js` implements the browser workflow. `shell.html` and `style.css` implement presentation. `build.cjs` creates `index.html` and fictional sample documents.

## Rebuild and test

From the `catalog-studio` directory, with Node.js 22:

```sh
node tests.cjs
node pricebook/tests.cjs
node pricebook/build.cjs
```

For real-browser acceptance in a clean development checkout:

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install --with-deps chromium firefox
node pricebook/browser-tests.cjs
python3 -m pip install pymupdf==1.26.4
python3 pricebook/verify-pdf.py
```

The optional browser/PDF dependencies are development tools, not buyer runtime dependencies. The GitHub workflow is `.github/workflows/pricebook-checks.yml`. Test and QA output contains fictional data only. The browser suite covers actual downloads, image decoding, project restore, release gates, stale async imports, UTF-8 rejection, responsive widths and lack of HTTP requests. The independent PDF check covers page counts, A4 dimensions, text bounds and reconciliation of sample SKUs/prices. Visual inspection remains separate.

## Monetary arithmetic

Amounts are parsed to nonnegative integer USD cents. Discounts and percentage rules use integer basis points. Discounted price is `floor((listCents × (10000 − discountBps) + 5000) / 10000)` using BigInt. A price passes the minimum margin if `sellCents × (10000 − marginBps) >= costCents × 10000`; zero selling price blocks publishing. The floor price shown in an exception rounds upward to the next cent. No markup/margin equivalence, foreign exchange or selling-unit conversion is inferred.

## Data boundaries

Customer output is built from a whitelist of public product fields plus the selected tier price. Source rows, costs, margins, other tiers, issues and saved projects are not embedded into customer HTML/CSV. Imported strings are escaped in HTML. CSV export neutralizes formula-like prefixes. Only approved raster data URLs enter output images; local uploads and restored assets receive signature, type, size and native decode checks.

The project format is `fieldnote-pricebook`, version 2. It stores the original source text rather than rebuilding from spreadsheet-safe CSV. Saved approval claims and unknown top-level properties are dropped on restore, and the data is audited again. The internal review record is an ordinary editable JSON record, not a signature or tamper-evident log. There is no authentication or authorization boundary within a local copy of the app.

Async file reads use revision tokens. New source loads, resets and restores invalidate superseded work. Photo batches commit only after validation, with export blocked while reads are pending. A failed previous-edition import does not silently produce a release without comparison.

## Release procedure

Rebuild after any source change, run meaningful affected checks, then the full acceptance workflow for a release candidate. Inspect current browser screenshots and PDF renders. Identify the delivered source and HTML hashes. Never replace a customer's accepted copy with an unreviewed build or silently migrate a saved project to a different schema.

The source remains available in the dedicated `pricebook-studio-v2` branch of the existing repository. Main hosting is unchanged. Buyer inputs, license documents and costs belong in private delivery records, not the source branch.
