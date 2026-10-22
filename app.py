import os

from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    jsonify,
    render_template,
    request,
    send_from_directory,
    url_for,
)

from akfg import kanji
from akfg.playlist import Playlist_Scraper
from akfg.translations import TranslationDataGetter

# Load .env at import time so it applies under gunicorn too, not just when this
# module is run directly.
load_dotenv()

app = Flask(__name__)

# Static assets are fingerprinted by asset() below, so they can be cached hard.
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 31536000  # 1 year

try:
    from flask_compress import Compress

    Compress(app)
except ImportError:
    # Compression is a nice-to-have; the site works without it.
    pass

sheets = TranslationDataGetter()
ps = Playlist_Scraper()

# GoatCounter site code. Not a secret — it ships in the page source on every
# request — so it lives here rather than in the environment, where a missing
# value would silently disable analytics on a deploy. Override only if the site
# ever moves to a different GoatCounter account.
GOATCOUNTER_CODE = os.environ.get("GOATCOUNTER_CODE", "omarbessi").strip()

# Amoki's App Store listing, linked from /projects and /amoki. No storefront
# segment (/is/, /us/…) so Apple sends each visitor to their own country's store.
AMOKI_APP_STORE_URL = "https://apps.apple.com/app/amoki-shared-memory-journal/id6790505969"

# Served at /app-ads.txt so AdMob can verify Amoki's ad inventory. The second
# field is the AdMob publisher id (pub-…), not the app id; the last is Google's
# fixed certification authority id.
APP_ADS_TXT = "google.com, pub-8167890306220440, DIRECT, f08c47fec0942fa0\n"

# Hosts whose traffic shouldn't be counted (local development).
LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"}


def analytics_enabled():
    """True only for real visitors — never for local development."""
    if not GOATCOUNTER_CODE or app.debug or app.testing:
        return False
    return request.host.split(":")[0] not in LOCAL_HOSTS

# Pages that belong in the sitemap, with their change frequency.
SITEMAP_ROUTES = [
    ("home", "monthly"),
    ("job_history", "monthly"),
    ("projects", "monthly"),
    ("translations", "weekly"),
    ("contact", "yearly"),
    ("amoki", "monthly"),
    ("amoki_privacy", "yearly"),
    ("amoki_support", "yearly"),
]


###### Helper functions ######
def wrap_up(item):
    return jsonify(item)


def asset(filename):
    """static URL with an mtime cache-buster, so a long max-age is safe."""
    path = os.path.join(app.static_folder, filename)
    try:
        version = int(os.path.getmtime(path))
    except OSError:
        return url_for("static", filename=filename)
    return url_for("static", filename=filename, v=version)


@app.context_processor
def inject_globals():
    return {
        "asset": asset,
        "amoki_app_store_url": AMOKI_APP_STORE_URL,
        "goatcounter_code": GOATCOUNTER_CODE if analytics_enabled() else "",
    }


###### Templates ######
@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/projects")
def projects():
    return render_template("projects.html")


@app.route("/translations")
def translations():
    return render_template("translations.html")


@app.route("/job-history")
def job_history():
    return render_template("job_history.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


###### Amoki ######
@app.route("/amoki/")
def amoki():
    return render_template("amoki/index.html")


@app.route("/amoki/privacy")
def amoki_privacy():
    return render_template("amoki/privacy.html")


@app.route("/amoki/support")
def amoki_support():
    return render_template("amoki/support.html")


# AdMob only ever crawls the domain root for this file; the /amoki copy is just
# so it sits with the rest of the app's pages.
@app.route("/app-ads.txt")
@app.route("/amoki/app-ads.txt")
def app_ads_txt():
    return Response(APP_ADS_TXT, mimetype="text/plain")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


@app.route("/robots.txt")
def robots():
    lines = [
        "User-agent: *",
        "Allow: /",
        "",
        f"Sitemap: {url_for('sitemap', _external=True)}",
    ]
    return Response("\n".join(lines) + "\n", mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap():
    entries = []
    for endpoint, changefreq in SITEMAP_ROUTES:
        entries.append(
            "  <url>\n"
            f"    <loc>{url_for(endpoint, _external=True)}</loc>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            "  </url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(xml, mimetype="application/xml")


@app.errorhandler(404)
def page_not_found(error):
    return render_template("404.html"), 404


@app.errorhandler(500)
def internal_error(error):
    return render_template("500.html"), 500


###### Data returns ######
@app.route("/songs", methods=["GET"])
def get_songs():
    parameter = request.args.get("parameter")
    data = sheets.get_songs(parameter)

    return wrap_up(data)


@app.route("/get_total_study", methods=["GET"])
def get_hours_studied():
    data = sheets.get_hours_studied()
    return wrap_up(data)


@app.route("/get_current_song_id", methods=["GET"])
def get_current_song():
    sheet_song = sheets.find_current_song()

    # Nothing is marked "Working On It".
    if not sheet_song:
        return wrap_up({"song_id": None, "status": None})

    # 1 is the Song Name column, 3 is Translated in the google sheet
    return wrap_up({"song_id": ps.get_track_id(sheet_song[1]), "status": sheet_song[3]})


@app.route("/translation_progress", methods=["GET"])
def get_completion_count():
    data = sheets.get_completion_count()
    return wrap_up(data)


@app.route("/songs_and_times", methods=["GET"])
def get_songs_and_times():
    data = sheets.get_songs_and_attribute("Time taken")
    return wrap_up(data)


@app.route("/get_tttl", methods=["GET"])
def get_tttl():
    data = sheets.get_songs_and_attribute("Translation Total / Track length")
    return wrap_up(data)


@app.route("/get_UCCPC", methods=["GET"])
def get_pagecount_times():
    data = sheets.get_songs_and_attribute("Translation Total / UCC")
    return wrap_up(data)


@app.route("/get_ucc", methods=["GET"])
def get_ucc():
    data = sheets.get_songs_and_attribute("Unique Character Count")
    return wrap_up(data)


@app.route("/kanji_levels", methods=["GET"])
def get_kanji_levels():
    return wrap_up(kanji.load_levels())


if __name__ == "__main__":
    port_num = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port_num)
