# Fieldnote Pricebook Studio 0.2.0

A standalone distributor pricebook application designed for a one-time software handover. This replaces the earlier plan to operate a catalog production service for customers.

Open `index.html` in a desktop browser. The application has no runtime installation, account, API key, network request, server, subscription or remote license check. It starts with clearly marked fictional data. Source code and reproducible tests are supplied for internal maintenance.

**Commercial status:** release candidate. The proposed $12,500 organization license is an asking price to validate, not an established market price. No customer has bought or accepted this release. Complete a real-data trial and buyer-device acceptance before taking final payment or describing the product as proven.

## What is implemented

- Import CSV, TSV or semicolon-delimited UTF-8 text, with explicit column mapping.
- Preserve leading-zero SKUs, flag normalized duplicates and reject ambiguous amounts.
- Require list prices and internal costs per the same stated selling unit, in USD.
- Generate List plus up to four named dealer tiers using explicit percentage discounts.
- Calculate prices with integer cents and integer basis points, using half-up rounding.
- Block customer exports when any product/tier is below the configured gross-margin floor.
- Compare full editions for added, changed and removed SKUs; flag large price and unit changes.
- Generate separate catalog HTML, price-sheet HTML and CSV for the selected tier. Costs and other tiers are excluded through a field whitelist.
- Import and decode approved local PNG, JPEG and WebP photos and logos.
- Save and reopen private project files including exact source, mappings, rules, comparison, branding and images. Restoring always clears release approval.
- Export internal issues, changes, master data and review records. Customer files and internal files have separate controls and names.

## Boundaries

One full snapshot, up to 1,000 products, at most five global percentage tiers, one USD currency and one fixed layout per output type. Margin rules are checked, not used to silently change prices. No unit conversion, quantity breaks, tax calculation, accounting entry, ERP synchronization or arbitrary spreadsheet formulas.

Input CSV files are limited to 10 MB and five million characters. Costs/prices allow up to $9,999,999.99 and two decimal places. Photos are limited to 10 MB each, 6,000 pixels per side and 20 megapixels. Combined encoded photos/logo are capped at 45 million characters. Project files are capped at 65 MB; customer HTML at 55 million characters. Resize images for practical distribution.

PDFs are produced through browser Print / Save PDF. Use A4, backgrounds on and browser headers/footers off. Inspect every production PDF; automatic tests cannot verify a customer's source facts or future browser/driver changes. Digital output only; no PDF/X, CMYK or prepress guarantee.

Workspace contents are held in memory. Closing the tab loses unsaved work. Project backups contain costs and are not encrypted by this program; handle them using the buyer's normal device access and backup controls. Separate computers/copies do not synchronize or merge changes.

## Read these files

| File | Audience / purpose |
| --- | --- |
| `TRISTAN_START_HERE.md` | The offer, target buyer, exact actions and sales wording |
| `OFFER.md` | Proposed fixed commercial scope and license model |
| `ACCEPTANCE_AND_HANDOVER.md` | A finite delivery and acceptance process |
| `BUYER_GUIDE.md` | Self-service operating instructions |
| `ENGINEERING.md` | Build, source layout, test commands and maintenance |
| `QA_STATUS.md` | Verified checks and remaining real-customer/device validation |
| `SOURCES.md` | Primary market evidence, dates and limitations |

The legacy catalog prototype remains one directory above for reference. Its older service pricing and operating model do not describe this product.
