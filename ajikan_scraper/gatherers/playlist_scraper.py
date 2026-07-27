import csv
import os

import requests
from dotenv import load_dotenv

# [0, 1, 2]
ALBUM_COVER_SIZE = 1

# Paths are resolved relative to this file, not the process CWD, so the app
# behaves the same whether it is started from the repo root or elsewhere.
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
SONGS_CSV_PATH = os.path.normpath(os.path.join(_DATA_DIR, "songs.csv"))

PLAYLIST_ID = "1rEDywcuxEpa5GZRaYIJJg"

# Column index of the Spotify track URL in songs.csv
LINK_COLUMN = 6


class Playlist_Scraper:
    """Reads the local songs.csv for request-time lookups.

    Talking to Spotify is only needed to *regenerate* that CSV, so it happens
    on demand in refresh_from_spotify() rather than on import. That keeps the
    site serving normally when Spotify is unreachable or credentials are unset.
    """

    def __init__(self):
        self._songs = None
        self._songs_mtime = None

    # ── Local CSV ──────────────────────────────────────────────────────────────
    def get_songs(self):
        """Return the parsed songs.csv, re-reading it only when it changes."""
        try:
            mtime = os.path.getmtime(SONGS_CSV_PATH)
        except OSError:
            return []

        if self._songs is None or mtime != self._songs_mtime:
            with open(SONGS_CSV_PATH, "r", newline="", encoding="utf-8") as songs:
                self._songs = list(csv.reader(songs))
            self._songs_mtime = mtime

        return self._songs

    def get_song_by_id(self, id, only_link=False):
        """Look up a song row by its 1-based id. Returns None if not found."""
        try:
            index = int(id) - 1
        except (TypeError, ValueError):
            return None

        songs = self.get_songs()
        if index < 0 or index >= len(songs):
            return None

        song = songs[index]
        if not only_link:
            return song

        # The Spotify track id is the last path segment of the track URL.
        try:
            return song[LINK_COLUMN].split("/")[-1]
        except IndexError:
            return None

    # ── Spotify (only needed to rebuild songs.csv) ────────────────────────────
    def refresh_from_spotify(self):
        """Fetch the playlist from Spotify. Only used to rebuild songs.csv."""
        token = self.get_token()
        playlist = self.get_playlist(token)
        return self.get_tracknames(playlist)

    def get_token(self):
        load_dotenv()
        my_client_id = os.environ.get("spotify_base_client")
        my_client_secret = os.environ.get("spotify_client_secret")

        if not my_client_id or not my_client_secret:
            raise RuntimeError(
                "Spotify credentials are not set "
                "(spotify_base_client / spotify_client_secret)."
            )

        access_token_request = requests.post(
            "https://accounts.spotify.com/api/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "client_credentials",
                "client_id": my_client_id,
                "client_secret": my_client_secret,
            },
            timeout=10,
        )
        access_token_request.raise_for_status()

        return access_token_request.json()

    def get_playlist(self, auth):
        playlist = requests.get(
            f"https://api.spotify.com/v1/playlists/{PLAYLIST_ID}",
            headers={"Authorization": f"{auth['token_type']} {auth['access_token']}"},
            timeout=10,
        )
        playlist.raise_for_status()

        return playlist.json()

    def get_tracknames(self, playlist):
        tracks = playlist["tracks"]["items"]

        tracklist = []

        for track in tracks:
            tracklist.append(track["track"])

        return tracklist

    def make_csv(self, tracknames):
        with open(SONGS_CSV_PATH, "w", newline="", encoding="utf-8") as songs:
            track_writer = csv.writer(songs, quoting=csv.QUOTE_MINIMAL)

            for i, track in enumerate(tracknames):
                track_writer.writerow(
                    [
                        i + 1,
                        track["name"],
                        ", ".join(a["name"] for a in track["artists"]),
                        track["album"]["name"],
                        self.ms_to_time(track["duration_ms"]),
                        track["album"]["images"][ALBUM_COVER_SIZE]["url"],
                        track["external_urls"]["spotify"],
                    ]
                )

        # The file just changed underneath us; drop the cache.
        self._songs = None
        self._songs_mtime = None

    def ms_to_time(self, millis):
        millis = int(millis)
        seconds = (millis / 1000) % 60
        seconds = int(seconds)
        minutes = (millis / (1000 * 60)) % 60
        minutes = int(minutes)
        hours = (millis / (1000 * 60 * 60)) % 24

        return "%d:%d:%d" % (hours, minutes, seconds)


if __name__ == "__main__":
    # Rebuild songs.csv from the Spotify playlist.
    scraper = Playlist_Scraper()
    scraper.make_csv(scraper.refresh_from_spotify())
