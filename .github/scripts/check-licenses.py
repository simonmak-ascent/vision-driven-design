#!/usr/bin/env python3
"""Fail when a production dependency carries a disallowed licence."""
import json
import re
import sys

DENY = re.compile(
    "(?:^|[^L])GPL-|AGPL|SSPL|BUSL|Commons-Clause|CC-BY-NC|Elastic-2.0|RSALv2",
    re.IGNORECASE,
)
NOTICE = re.compile("LGPL|FSL|CC-BY-4.0", re.IGNORECASE)


def denied(expr: str) -> bool:
    """True only when every alternative in an OR expression is denied."""
    expr = expr.strip()
    while expr.startswith("(") and expr.endswith(")"):
        expr = expr[1:-1].strip()
    ors = re.split(" OR ", expr, flags=re.IGNORECASE)
    if len(ors) > 1:
        return all(denied(part) for part in ors)
    ands = re.split(" AND ", expr, flags=re.IGNORECASE)
    if len(ands) > 1:
        return any(denied(part) for part in ands)
    return bool(DENY.search(expr))


def main(path: str) -> int:
    data = json.load(open(path, encoding="utf-8"))
    if not isinstance(data, dict):
        print(f"{path}: expected a licence->packages object", file=sys.stderr)
        return 2
    denied_rows = []
    notices = []
    for licence, packages in data.items():
        names = ", ".join(sorted({p.get("name", "?") for p in packages}))
        if denied(licence):
            denied_rows.append(f"{licence}: {names}")
        elif NOTICE.search(licence):
            notices.append(f"{licence}: {names}")
    for line in notices:
        print(f"notice: {line}")
    if denied_rows:
        print("Disallowed production licences:", file=sys.stderr)
        for line in denied_rows:
            print(f"  {line}", file=sys.stderr)
        return 1
    print(f"license policy OK ({sum(len(v) for v in data.values())} packages)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
