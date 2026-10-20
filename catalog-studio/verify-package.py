"""Verify this release ZIP with Python's standard library on a clean checkout."""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

root = Path(__file__).resolve().parent
package = root / "Fieldnote_Catalog_Studio_v0.1.zip"
expected = {
    path.relative_to(root).as_posix(): path.read_bytes()
    for path in root.rglob("*")
    if path.is_file() and path != package
}

with ZipFile(package) as archive:
    names = archive.namelist()
    if len(names) != len(set(names)):
        raise SystemExit("Duplicate names in release archive")
    if any(PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts for name in names):
        raise SystemExit("Unsafe release archive path")
    corrupt = archive.testzip()
    if corrupt is not None:
        raise SystemExit("ZIP integrity failure: " + corrupt)
    if set(names) != set(expected):
        raise SystemExit("ZIP file list differs from the clean project checkout")
    for name, content in expected.items():
        if archive.read(name) != content:
            raise SystemExit("ZIP content differs from source: " + name)

print(f"Verified ZIP integrity and exact content for {len(expected)} release files")
