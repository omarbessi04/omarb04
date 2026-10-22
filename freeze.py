"""Render the whole site to static files for GitHub Pages.

    python freeze.py            # writes build/

Every GET route without URL parameters is requested through Flask's test
client and saved under build/. Extensionless pages get .html added (GitHub
Pages serves /projects from projects.html), and routes ending in / become
index.html. The site URL is set here, not taken from a request, so canonical
links, og:url and the sitemap point at the real domain.
"""

import os
import shutil
import sys
from urllib.parse import urlparse

from app import app

SITE_URL = os.environ.get("SITE_URL", "https://omarbessi.com").rstrip("/")
BUILD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")


def output_path(route):
    """Where a route's response lives inside build/."""
    path = route.lstrip("/")
    if path == "" or path.endswith("/"):
        return path + "index.html"
    if os.path.splitext(path)[1]:
        return path
    return path + ".html"


def static_routes():
    """Every GET route that can be rendered without arguments."""
    for rule in app.url_map.iter_rules():
        if rule.endpoint == "static" or rule.arguments or "GET" not in rule.methods:
            continue
        yield rule.rule


def write(relpath, data):
    dest = os.path.join(BUILD_DIR, relpath)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)


def main():
    shutil.rmtree(BUILD_DIR, ignore_errors=True)
    client = app.test_client()

    failed = []
    for route in sorted(static_routes()):
        response = client.get(route, base_url=SITE_URL)
        if response.status_code != 200:
            failed.append(f"{route} -> {response.status_code}")
            continue
        write(output_path(route), response.data)
        print(f"{route:32} {output_path(route)}")

    if failed:
        sys.exit("Routes that didn't render:\n  " + "\n  ".join(failed))

    # GitHub Pages serves this for any missing path.
    write("404.html", client.get("/__missing__", base_url=SITE_URL).data)

    shutil.copytree(app.static_folder, os.path.join(BUILD_DIR, "static"))

    # Tells GitHub Pages which custom domain this site answers on.
    write("CNAME", (urlparse(SITE_URL).hostname + "\n").encode())

    print(f"\nBuilt {SITE_URL} into {BUILD_DIR}")


if __name__ == "__main__":
    main()
