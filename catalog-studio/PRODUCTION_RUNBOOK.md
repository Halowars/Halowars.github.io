# Production runbook

## 1. Qualify and preserve

Inspect an authorized 10-product sample before quoting. Confirm one row per SKU, a single USD price tier, and a stated selling unit. Confirm assets are approved. Keep the original source unchanged in a private customer folder.

Suggested private folder structure:

- 01-originals — original export, images, logo, supplied terms
- 02-working — edits with change notes and the exceptions report
- 03-proof — proof HTML/PDF and approval correspondence
- 04-release — final HTML/PDF, normalized CSV, exceptions, review JSON
- 05-updates — later editions and their new approvals

Do not place customer data, pricing, images, or approval correspondence in the public code repository.

## 2. Normalize only what is safe

Import CSV. Inspect the source mapping, especially SKU, price, category, and selling unit. Text gets Unicode NFC normalization and outer whitespace trimming; numbers in SKUs are not converted. Duplicate detection uses case/compatibility normalization for comparison only.

Resolve all hard errors. Send the customer the exceptions that require facts. Do not infer certifications, dimensions, material ratings, selling-unit conversions, or prices.

Warnings are explicit: blank price means “Price on request”; missing description stays blank; missing image shows a placeholder. Agree on which warnings are acceptable.

If correcting pasted source, revalidate it and reload approved images. Revalidation intentionally starts a new source review.

## 3. Reconcile

For every product:

- Compare SKU text, including leading zeros.
- Compare product name and category.
- Compare original price against displayed USD and normalized cents. Check zero separately from blank.
- Compare selling unit, such as each, box of 10, or bag of 25.
- Verify the image filename and the actual photo subject.
- Preserve the approved description. No new specifications are generated.

Reconcile the source row count with product counts and unique SKUs in both outputs. Reconcile normalized CSV by importing SKU as text. Formula-safe CSV can include a leading apostrophe for risky cells; JSON retains original text.

## 4. Make and inspect the proof

Set the approved brand, edition, contact, accent color, terms, and optional logo. Export draft catalog HTML and draft price-sheet HTML. Open them as local files.

Check search, all categories, all images, line wrapping, and every item. Use Print / Save PDF: A4, browser headers/footers off, background graphics on. Inspect every PDF page for clipping, overflow, blank pages, and missing text or photos. Two products per catalog page and eight rows per price page are conservative templates, not a substitute for this check.

Digital PDF is the current scope. Commercial print production, CMYK, bleed, and PDF/X are not supported.

## 5. Obtain customer approval

Send proof files and a short summary of unresolved warnings. Ask the designated customer approver to confirm content, images, current prices, selling units, and acceptable missing fields in writing.

Keep the written approval separately. The studio checkbox is the operator's release acknowledgement; it does not send, authenticate, or verify customer approval.

Any source, mapping, brand, or image change clears the tool's final approval. New factual changes require a new customer proof where relevant.

## 6. Release

Check the release acknowledgement after completing review. Export final HTML documents. Save new PDFs and inspect them again. Save normalized CSV, exceptions CSV, and the current review JSON.

Use consistent filenames with company, edition date, document type, and revision. The studio's suggested filenames omit edition dates; rename delivered files intentionally.

A short delivery draft:

“Attached are the approved [edition] catalog, matching price sheet, reusable HTML files, and product data package. This edition contains [count] products. The agreed exceptions are [list / none]. Prices are per the stated selling unit and reflect the source approved on [date]. Future updates require a new approved export.”

Check attachment count, file size, and whether any document still carries a draft mark. Fictional samples must always retain their demo mark.

## 7. Close and measure

Record actual time for intake, cleaning, asset matching, proofing, customer revisions, and final delivery. Record source quality and repeated failure causes. Keep the client files in the agreed private location and retention period. The browser itself keeps no permanent session.

Do not automate final delivery until browser acceptance, source reconciliation, and approvals are reliable across unrelated customers.
