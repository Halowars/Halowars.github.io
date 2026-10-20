# Architecture and automation boundaries

## Current implementation

No server, Firebase project, secret, external library, or browser network request is required.

Input CSV -> strict parser -> explicit column mapping -> audit -> product records with integer USD cents -> operator review -> standalone HTML exports -> browser print to PDF -> customer approval -> final release.

Local approved images are checked for type, signature, decoded dimensions, and size, then embedded as raster data URLs. SVG and remote image fetching are excluded. Image validation in a real browser is pending.

## Source files

- core.cjs: pure parsing, mapping, audit, price handling, output escaping, CSV/document creation, and manifest generation.
- studio.js: browser-only event handling and session state.
- ui/shell.html and ui/style.css: workbench presentation.
- tests.cjs: shared core test function and Node CLI wrapper.
- ui-tests.cjs: simulated DOM tests of source invalidation, release gates, and asynchronous imports.
- build.cjs: dependency-free standalone bundle creation.
- index.html: generated, complete operator application.

The generated bundle contains the same engine and core test function as the source modules. It needs no HTTP server, module loader, or CDN.

## Data handling

All session data stays in browser memory. Downloads contain the selected source data; the operator controls where those files go. Closing/reloading loses the session. This is not encrypted client-record storage or a file-sharing portal.

Cleaned CSV neutralizes spreadsheet formula prefixes but can be reinterpreted by spreadsheet software. Import SKU as text; retain JSON/original source as the reference. The manifest includes original parsed source rows, mapping, normalized products, warnings, and an operator acknowledgement. It excludes asset bytes and is not a cryptographic audit trail or customer signature.

HTML text and attribute values are escaped. Colors must be six-digit hex. Product images must be local approved rasters. Generated documents and the app have restrictive CSP with no network connections, base URI changes, form submission, or object embedding. Inline scripts/styles are allowed because these are standalone files.

Duplicate comparisons use Unicode compatibility/case normalization; displayed SKUs keep their source text except outer trim and NFC normalization. Non-USD rows and ambiguous prices block export. Source metadata is retained for reconciliation.

## Why Firebase is deferred

The first bottleneck is proving customers want the finished output and can supply clean data. A multi-tenant portal would add authentication, uploads, billing, retention, and operational work before that proof.

Firebase is a reasonable later option for unattended intake and job status, but the current files do not connect to it. If recurring demand is demonstrated:

1. Firebase Authentication for operator access and narrowly scoped customer upload sessions.
2. Private object storage for per-customer assets, short-lived access, size/MIME validation, and explicit retention.
3. Firestore job metadata with tenant ownership checks and server-enforced status transitions.
4. An idempotent queued renderer, per-job limits, retries, cost caps, and failure reporting.
5. Source-validation and visual-review stages before a release is eligible for customer approval.
6. Hosted payment flow with verified, idempotent payment events; no price or paid-state trust in the browser.
7. Recorded customer proof approval and a controlled final-delivery action.

Run the same input/audit engine in the renderer, but revalidate all data server-side. A browser review checkbox is not an authorization boundary. Arbitrary uploaded HTML, CSV URLs, and external image URLs must never become unrestricted server-side fetches.

Do not label the current prototype an automated SaaS or imply these future pieces already exist.
