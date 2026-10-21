# Fieldnote Pricebook Studio

Version 0.2.0 — evaluation release candidate

1. Extract the complete ZIP into a folder on your computer.
2. Open `index.html` in the desktop browser identified in the acceptance record. No installation or internet connection is needed to run the app.
3. Start with the fictional example. Use the in-app Quick Guide or `BUYER_GUIDE.md`.
4. Save a private project backup before closing. Costs, source data and photos are contained in that backup. Customer exports are separate.

The `samples` folder contains fictional Trade-tier HTML and PDFs. They are examples, not a real product offer. The `source/catalog-studio` folder contains maintainable source and test/build instructions. `verification` contains recorded automated results. `CHECKSUMS.sha256` identifies every packaged file.

The application checks source structure and configured pricing rules, creates List plus up to four dealer tiers, compares full editions, and generates separate customer books. It supports up to 1,000 SKUs, USD, simple global percentage discounts and the supplied layouts. Costs and list prices must refer to the same selling unit.

There is no server, login, subscription, ERP synchronization, unit conversion, tax calculation or multiuser merging. Closing a tab loses unsaved work. The delivered version does not update itself. Source is included for agreed internal maintenance; commercial rights and any included correction period must be agreed separately.

Automated tests and fictional samples do not establish that your supplied business data is correct. Complete the actual-data and buyer-device checks in `ACCEPTANCE_AND_HANDOVER.md` before production use. `QA_STATUS.md` states what has and has not been verified. Inspect every published PDF using A4, background graphics on and browser headers/footers off.
