#!/usr/bin/env python3
"""Validate topics.json manifest and all internal Markdown links.

Checks:
  1. topics.json parses; every topic has en + id_lang entries with title/path.
  2. Every referenced path exists on disk.
  3. Every .md file under en/ and id/ is registered in the manifest.
  4. Every relative Markdown link inside an article resolves to an existing file.
  5. Section ids referenced by topics exist in sections.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")

errors = []

try:
    manifest = json.loads((ROOT / "topics.json").read_text(encoding="utf-8"))
except Exception as exc:  # noqa: BLE001
    print(f"topics.json is invalid: {exc}")
    sys.exit(1)

section_ids = {s["id"] for s in manifest.get("sections", [])}
declared = set()

for i, topic in enumerate(manifest.get("topics", [])):
    tid = topic.get("id", f"#{i}")
    if topic.get("section") not in section_ids:
        errors.append(f"topic {tid}: unknown section {topic.get('section')!r}")
    for lang in ("en", "id_lang"):
        entry = topic.get(lang)
        if not entry or not entry.get("title") or not entry.get("path"):
            errors.append(f"topic {tid}: missing {lang} title/path")
            continue
        path = ROOT / entry["path"]
        declared.add(entry["path"])
        if not path.is_file():
            errors.append(f"topic {tid}: file not found: {entry['path']}")

# every on-disk article must be registered
for md in sorted(list((ROOT / "en").rglob("*.md")) + list((ROOT / "id").rglob("*.md"))):
    rel = md.relative_to(ROOT).as_posix()
    if rel not in declared:
        errors.append(f"unregistered article (add to topics.json): {rel}")

# relative .md links must resolve
for md in sorted(list((ROOT / "en").rglob("*.md")) + list((ROOT / "id").rglob("*.md"))):
    text = md.read_text(encoding="utf-8")
    for match in LINK_RE.findall(text):
        if match.startswith(("http://", "https://", "mailto:", "#")):
            continue
        target = match.split("#")[0]
        if not target.endswith(".md"):
            continue
        resolved = (md.parent / target).resolve()
        if not resolved.is_file():
            errors.append(f"{md.relative_to(ROOT).as_posix()}: broken link -> {match}")

if errors:
    for e in errors:
        print(f"::error::{e}")
    print(f"\n{len(errors)} problem(s) found.")
    sys.exit(1)

n_topics = len(manifest.get("topics", []))
n_articles = len(declared)
print(f"OK: {n_topics} topics, {n_articles} article files, all links resolve.")
