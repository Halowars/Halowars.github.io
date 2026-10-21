# Pricebook Studio: quick operating guide

1. Extract the delivery folder. Double-click `index.html` to open it in the accepted desktop browser. The first screen contains fictional sample products.
2. Import a full current product CSV, or open your private `.pricebook.json` project. A CSV needs SKU, name, category, list price, selling unit and internal cost. Export Excel as CSV UTF-8. Check the column selections, especially cost versus price.
3. Use USD amounts with a decimal point and at most two decimal places. Cost and price must use exactly the same selling unit. The program does not convert a cost per each to a price per case.
4. Set your minimum gross margin and dealer discounts. A dealer tier is a global percentage discount from the supplied list price. Prices round to cents, half up. The List tier has no discount.
5. Optionally import the previous full edition. A previous project preserves its exact source/mappings. A previous CSV needs recognized headers. Missing rows are treated as removed SKUs, so do not use a partial change file.
6. Add company details, approved local photos and logo. Match photo filenames exactly. A new CSV import clears photos; correcting pasted source retains photos for you to review. Missing photos remain explicitly marked.
7. Read the exceptions. Correct all blocking errors and review warnings. The program never invents source facts or changes prices automatically to make a rule pass. Changing a rule clears the previous audit until you check again.
8. Choose one tier under Publish. Export a draft catalog or price sheet. Open the downloaded HTML and inspect/search it. Print to PDF using A4, backgrounds on and browser headers/footers off. Inspect every page. Repeat for every tier.
9. Complete release review, including edition changes when present. Export the final files for each dealer tier. The customer CSV contains the selected tier's prices. Internal costs are excluded from customer exports.
10. Save a private project backup before closing. It includes exact source data, internal costs, rules, comparison and images. Keep it in your normal controlled backup location. Download the internal review record with the edition. Reopening a project requires fresh release review.

## Keep customer and internal files separate

Customer files are the catalog, price sheet and selected-tier CSV. Files prefixed `INTERNAL-` contain costs, changes, issues or source data and should stay within your business.

Use the program's project files for exact backups/comparisons. CSV output neutralizes formula-like cells with an apostrophe, and spreadsheet applications can reinterpret numeric-looking SKUs. Import the SKU column as text; do not rely on opening a CSV by double-clicking it to preserve leading zeros.

## When a check blocks export

Correct the source and validate again. If the rule itself is wrong, change it only after commercial approval, then recheck all products/tiers. For a missing or invalid previous edition, load a valid complete file or explicitly remove the comparison. Lowering a floor merely to silence a warning does not establish that a selling price is appropriate.

## Limits to remember

Up to 1,000 products and five tiers, USD only. No stock synchronization, taxes, quantity breaks, contract-pricing exceptions or unit conversion. Separate copies/computers do not synchronize. The workspace is temporary; downloaded backups are the durable record. The program does not encrypt those files or authenticate an approver. Use the operating environment and backup controls agreed at delivery.
