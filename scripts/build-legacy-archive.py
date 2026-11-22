from datetime import date
from html import escape
from pathlib import Path
import re
import sys
from bs4 import BeautifulSoup

jobs, scholarships, root = map(Path, sys.argv[1:])
notice = f"<p><strong>Archived listings.</strong> Captured {date.today():%d %B %Y}. These listings may have closed.</p>"

def write(route, title, body):
    output = root / route.strip("/") / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(f"""<!doctype html><html lang="en-NG"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow">
<title>{escape(title)} | NaijaOpportunities</title><link rel="stylesheet" href="/archive.css"></head>
<body><header><nav aria-label="Archive"><a href="/">NaijaOpportunities</a>
<a href="/jobs/">Jobs</a><a href="/scholarships/">Scholarships</a></nav></header>
<main><h1>{escape(title)}</h1>{notice}{body}</main></body></html>""", encoding="utf-8")

sections = []
for category, path in (("jobs", jobs), ("scholarships", scholarships)):
    source = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    cards = {}
    for anchor in source.select(f'a[href^="/{category}/"]'):
        heading = anchor.find("h2")
        route = anchor["href"]
        if not heading or not re.fullmatch(rf"/{category}/[a-z0-9-]+", route):
            continue
        title = heading.get_text(" ", strip=True)
        panel = heading.parent
        tags = panel.find("div", recursive=False)
        fields = (tags.find_all("span") if tags else []) + panel.find_all("p")
        fields += panel.find_all("span", class_=lambda value: value and "bg-yellow-500/10" in value)
        facts = "".join(f"<p>{escape(field.get_text(' ', strip=True))}</p>" for field in fields)
        cards[route] = f'<li><h2><a href="{route}/">{escape(title)}</a></h2>{facts}</li>'
        write(route, title, f'<p><a href="/{category}/">Back to {category}</a></p><article>{facts}</article>'
              '<p>This archive preserves the listing summary. Check the provider for current application details.</p>')
    if not cards:
        raise ValueError(f"No cards found for {category}")
    listing = "".join(cards.values())
    write(category, f"Archived {category}", f'<p>{len(cards)} listings</p><ul>{listing}</ul>')
    sections.append(f'<li><h2><a href="/{category}/">{category.title()}</a></h2><p>{len(cards)} listings</p></li>')
    print(category, len(cards))
write("/", "Archived listings", "<ul>" + "".join(sections) + "</ul>")
