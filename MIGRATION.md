# Moving omarbessi.com from Railway to GitHub Pages

Status as of 2026-10-22, about 20:30 UTC.

## Why

Railway published a security disclosure on 2026-10-21:
https://blog.railway.com/p/security-disclosure-wednesday-october-21st

The site is moving to GitHub Pages. It's free because the repo is public.

## How the site works now

Nothing runs on a server anymore. Flask is only used at build time:

- `freeze.py` runs every Flask route once through the test client and writes the results to `build/`:
  - the pages (`projects.html`, `amoki/index.html`, …)
  - `robots.txt`, `sitemap.xml`, `app-ads.txt` and `404.html`
  - the `static/` folder
  - a `CNAME` file
- The charts' data endpoints now live at `/data/*.json`, and `static/js/projects.js` and `static/js/translations.js` fetch those paths. `python app.py` still works locally with the same URLs.
- `.github/workflows/pages.yml` runs `freeze.py` and deploys `build/` to Pages on every push to `main`. To update the translations dashboard, edit `akfg/data/translations.csv` and push.
- The site URL is set by `SITE_URL` in `freeze.py` (default `https://omarbessi.com`). It controls the canonical links, og:url, the sitemap and `CNAME`.

To build and preview locally:

```sh
pip install -r requirements.txt
python freeze.py
cd build && python -m http.server 8000
```

`http.server` doesn't map `/projects` to `projects.html` the way Pages does, so open `/projects.html` directly there.

## Done

- [x] Built the static site on the `github-pages` branch and tested every page in Chromium. All returned 200 and the charts loaded data from the JSON files.
- [x] Turned on Pages in repo Settings → Pages, with Source set to **GitHub Actions**.
- [x] Merged into `main` (commit `46c9f3f`). The first deploy succeeded, with both the build and deploy jobs green.
- [ ] **In progress:** verifying the domain in GitHub account Settings → Pages (optional but recommended).

## Still to do

### 1. Finish domain verification (Porkbun)

In Porkbun, go to Domain Management, find `omarbessi.com`, click Details and then DNS, and add:

| Type | Host | Answer |
|---|---|---|
| TXT | `_github-pages-challenge-omarbessi04` | `2cd0d42ad170c6bb6583295c250f96` |

Porkbun adds `.omarbessi.com` itself, so type only the host shown above. Then click **Verify** on GitHub.

### 2. Point DNS at GitHub (Porkbun)

Delete the records that point at Railway, usually a CNAME or ALIAS on the bare domain and on `www`. Also delete Porkbun's defaults if they're there: the ALIAS to `pixie.porkbun.com` and the `*` wildcard. Keep the MX and email TXT records. Then add:

| Type | Host | Answer |
|---|---|---|
| A | *(blank)* | `185.199.108.153` |
| A | *(blank)* | `185.199.109.153` |
| A | *(blank)* | `185.199.110.153` |
| A | *(blank)* | `185.199.111.153` |
| CNAME | `www` | `omarbessi04.github.io` |

### 3. Set the custom domain on the repo

1. In repo Settings → Pages, enter `omarbessi.com` under Custom domain and save.
2. Wait for the DNS check to pass, then tick **Enforce HTTPS**. The certificate can take up to an hour.
3. Check that these load:
   - `https://omarbessi.com`
   - `https://omarbessi.com/translations` (the charts should show data)
   - `https://omarbessi.com/amoki/`
   - `https://omarbessi.com/app-ads.txt` (AdMob reads it at the root)
   - `https://www.omarbessi.com` (should redirect to the bare domain)

If the site should live on `www.omarbessi.com` instead, change `SITE_URL` in `freeze.py` and enter the `www` domain in step 3.

### 4. Shut down Railway

- [ ] Delete the Railway service once the GitHub version is live.
- [ ] If the disclosure affected environment variables, change the Spotify client secret in the Spotify developer dashboard. It was stored on Railway, and the static site doesn't use it.
- [ ] Remove the leftovers from the repo:
  - `Procfile`
  - the `gunicorn` line in `requirements.txt`
  - the Railway mention in `app.py`'s `load_dotenv` comment (it says "so it applies under gunicorn too")
- [ ] Delete the `github-pages` branch, since it's already merged.
- [ ] Delete this file.
