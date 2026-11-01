#!/usr/bin/env python3
import argparse
import re
from pathlib import Path

parser = argparse.ArgumentParser(description="Promote an immutable Sky image digest in Helm values.")
parser.add_argument("--values", default="gitops/values/app-values.yaml")
parser.add_argument("--digest", required=True)
args = parser.parse_args()
if not re.fullmatch(r"sha256:[0-9a-f]{64}", args.digest):
    raise SystemExit("digest must have the form sha256:<64 lowercase hex characters>")
path = Path(args.values)
contents = path.read_text()
updated, count = re.subn(r"(?m)^(\s*digest:)\s*.*$", rf"\1 {args.digest}", contents, count=1)
if count != 1:
    raise SystemExit(f"expected one image.digest value in {path}")
path.write_text(updated)
