"""The AKFG translation project: data and helpers behind /translations.

    akfg/
      translations.py  reads data/translations.csv (exported from the Google Sheet)
      playlist.py      reads data/playlist.csv; rebuilds it from Spotify on demand
      kanji.py         offline: lyrics + kanji.json -> song_features.csv, kanji_levels.json
      data/            every file the project reads or writes
"""

import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def data_path(filename):
    return os.path.join(DATA_DIR, filename)
