# Tristan — start here

## The business I chose

**Finished catalog and price-sheet production for independent electrical and industrial distributors.**

The buyer sends the product spreadsheet, logo, and approved photos they already have. You return finished sales materials. They do not install software, learn a dashboard, give you website access, or migrate their systems.

Why this candidate: a bounded file-in/files-out workflow can reuse the same production engine for many customers. Selling finished work fits the no-training constraint. It still requires selling, source review, and customer approval. Calling it passive or fully automatic would be inaccurate.

Basic catalog generation is already competitive. The offer must earn its price through accurate data handling, source reconciliation, polished output, and reliable delivery. The software alone is not evidence that someone will pay $2,500.

## What has been built

A standalone browser workbench plus reusable JavaScript engine. It imports and maps CSV data, audits product facts, matches approved local images, and produces branded catalog and price-sheet HTML plus cleaned data and review records. PDFs are saved from those documents using browser printing.

The fictional sample is ready to open and explore. The source and 93 automated logic/state checks are included. Browser/PDF acceptance and real-customer validation are still incomplete.

## What you do next, in order

1. **Open index.html.** Try the preloaded fictional sample. Export both draft documents, open them, and save A4 PDFs.
2. **Run the manual browser checks.** Use BROWSER_ACCEPTANCE.md. Do not use paying customers as the first browser test.
3. **Find 10 suitable businesses manually.** Favor independent distributors whose current PDF is visibly outdated, has no consistent price sheet, or requires sales staff to assemble product pages repeatedly. Record the specific observed issue; do not invent a pain point.
4. **Ask for a permitted 10-product source sample.** Request the original exported file and approved photos. Avoid businesses that require technical specification writing or missing-data research to complete basic entries.
5. **Make one proof.** Preserve all source facts, return the exceptions, and show the source row beside its finished catalog entry.
6. **Offer a paid 50-product pilot after the quality gates pass.** Proposed test price: $750. Confirm the exact scope and date only after inspecting the source sample.
7. **Measure the work.** Track intake, cleaning, layout, review, revisions, delivery, and sales time separately. Seek three unrelated customer trials. Do not call quoted revenue profit.
8. **Repeat only if demand and delivery hold up.** If a 50-product job takes over four operator hours, reduce scope or increase price. Four hours is an internal test target, not an observed result.

## First message — customize the brackets

Hi [name] — I noticed [specific, verified issue with their current catalog]. I produce finished product catalogs and price sheets from an existing spreadsheet and approved photos. You receive the files; there is no new software for your staff to learn. Could I show you a small example using 10 products you approve?

This is a draft, not a message already sent. Review applicable outreach requirements before sending. No prospect list or outreach automation is enabled.

## What to say on a short call

“Here is the original source row, and here is the resulting catalog entry. The SKU, selling unit, and price are preserved. Anything missing is flagged for you instead of guessed. You send your existing files, approve one proof, and receive the finished catalog and matching price sheet.”

Then ask:

- Who makes your catalog or price sheet today, and what takes the most time?
- How often do product prices or selling units change?
- Is there one source spreadsheet, and who signs off its accuracy?
- Do you have permission to use the photos and brand materials?
- Would a finished package solve enough of a problem to justify a paid pilot?

If they already solve this cheaply and well, move on. Do not argue them into needing a catalog.

## The pilot close

“The proposed pilot is $750 for up to 50 products, one approved visual layout, one USD price tier, and one revision round. I inspect your sample first, then confirm the deliverables and date in writing. Missing source information needs your approval before final release.”

Do not promise a specific sales increase. Do not promise one-click ingestion of arbitrary PDFs or fully automatic delivery.

## What the customer supplies

One CSV export with SKU, product name, category, selling unit, optional USD price, optional description, optional manufacturer, and optional image filename. Approved product photos, a logo if wanted, contact line, edition name, and sales terms.

If the customer only has Excel, they can export CSV or you can convert it in your own private workflow. This prototype does not read XLSX directly.

## Your success gates

- All automated checks and the manual browser matrix pass.
- Product count and every SKU/price/selling unit reconcile with the approved source.
- Every delivered PDF page has been inspected.
- A customer acknowledges the unresolved exceptions in writing.
- At least three unrelated trials show a repeatable input format and manageable production effort.
- At least one actual paid pilot establishes willingness to pay.

The current result is a built prototype and operating kit, not a validated business or a guarantee against failure.
