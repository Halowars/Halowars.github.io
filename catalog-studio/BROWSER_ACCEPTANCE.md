# Browser and delivery acceptance — NOT YET EXECUTED

Date prepared: October 20, 2026.

The local execution environment was unavailable. GitHub Actions verified the Node test runner and bundle build, but real browsers, screenshots, native image decoding, downloads, and PDF printing have not been exercised. Do not mark those checks passed without executing them.

## Required browser matrix

| Platform | Browser | Status |
| --- | --- | --- |
| Windows desktop | Current Chrome or Edge | Pending |
| macOS desktop | Current Safari | Pending |
| Desktop | Current Firefox | Pending |
| Phone / narrow window | Layout and navigation only | Pending |

Record browser version, operating system, test date, result, and any defect. Desktop is the production target; phone PDF generation is not promised.

## Studio smoke test

1. Extract the ZIP and open index.html directly from disk.
2. Verify the fictional 12-product sample loads, with 0 blocking issues and 13 warnings.
3. Confirm both final export buttons start disabled.
4. Change the selling-unit mapping to SKU. Confirm it blocks exports; restore it.
5. Load fixtures/broken-products.csv. Confirm 7 blocking issues and that draft/final exports are disabled.
6. Load fixtures/demo-products.csv. It is fictional even when imported as a file: keep fictional branding and use draft mode for this test. A real file import does not identify demo provenance automatically.
7. Paste an unclosed quoted field. Confirm that the old dataset cannot still be exported.
8. Edit source text, mappings, branding, and images after approval. Confirm each clears approval.
9. Read a large file and immediately load the demo or clear the session. Confirm the older asynchronous read cannot overwrite newer data.
10. Navigate each guide tab and return. Check keyboard access, focus outlines, labels, horizontal table scrolling, and 375 px / 768 px / desktop layouts.
11. Click Run core engine checks in the delivery tab; expect 75 / 75. The simulated interface suite runs through Node separately.

## Images

1. Supply a real, approved PNG, JPEG, and WebP with distinctive content; enter matching filenames in CSV.
2. Confirm decoded image content appears for exactly the intended SKU in the exported document.
3. Test an approved logo.
4. Test an image named with spaces, Unicode, and uppercase letters. Matching is exact and case sensitive.
5. Test a missing image: expect a warning and visible placeholder.
6. Reject SVG, renamed non-image bytes, over-10-MB images, over-6,000-pixel dimensions, and over-20-megapixel images.
7. Select two files with the same filename: expect rejection without partially replacing existing assets.
8. Attempt approval/export while image reading is pending. Confirm export is blocked; approval remains cleared when import finishes.
9. Confirm exported document contains embedded photos and works with network disconnected.

## Downloads and PDF

1. Export draft catalog, draft price sheet, cleaned CSV, exceptions CSV, and review JSON.
2. Open each downloaded file, not merely its source code view.
3. Check every source SKU and price against both documents; check the blank sample price stays “on request”.
4. Search for an SKU; confirm matching products display. Clear search and recover all products.
5. Search for one product, then print. Confirm printing includes the whole catalog, not only filtered results.
6. Print to A4 PDF, disable browser headers/footers, and enable background graphics.
7. Inspect every page: cover, category headers, long names, Unicode, max-length fields, long SKUs, descriptions, image aspect ratios, pack sizes, page numbers, terms, and blank extra pages.
8. Use values at the supported text limits to test the worst-case layout. Short sample content alone is not acceptance.
9. Check foreground text remains legible with backgrounds disabled; otherwise document or fix the defect.
10. Approve the release after external customer approval, then generate and inspect final PDFs again.
11. Confirm final mode removes draft marks; the built-in fictional demo always keeps its demo mark.
12. Open CSV with the SKU column explicitly set to text. Confirm leading zeros and formula-safe prefixes.
13. Compare final review JSON source rows and issue counts with the approved source.
14. Test blocked popups/download restrictions, and confirm the app gives a useful workflow rather than claiming a download was delivered to a customer.
15. Refresh/close the studio: confirm no data persistence is promised. Test the unsaved-work prompt for a real import.

## Scale and isolation

- 50 products with realistic photos: measure processing time, actual HTML/PDF sizes, memory behavior, and review effort.
- 250 products: same measurements; check commercial package feasibility.
- 1,000 products without images: confirm counts and file usability. Automated string generation alone is insufficient.
- Exceed row/character/asset budgets: confirm clear rejection without exporting stale data.
- Inspect the browser's network panel: customer files should make no network requests.
- Open imported strings containing HTML and script-closing text: confirm they display as text and execute nothing.

## Business gates

- Authorized samples from three unrelated distributors.
- At least one actual paid pilot at an agreed price.
- Measured delivery time and revision count.
- No unresolved accuracy, image-rights, or source-format problem inside the promised package.
- Written proof approval and complete final package on every pilot.

Until these gates pass, describe the result as an operator prototype and proposed service.
