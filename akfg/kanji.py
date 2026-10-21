"""Kanji analysis of the translated lyrics.

Run from the repo root after adding a song's lyrics to data/lyrics.txt:

    python -m akfg.kanji

It rewrites two files in data/:
  song_features.csv  per-song difficulty features, for poking at correlations
  kanji_levels.json  per-song kanji grouped by JLPT level, served to the
                     "kanji explorer" on /translations

kanji.json is only read by main(), never at request time — it is 5MB. The
site reads the small kanji_levels.json through load_levels().
"""

import csv
import json
import os
from collections import Counter
from math import log2

from akfg import data_path
from akfg.translations import TranslationDataGetter

LEVELS = ["N5", "N4", "N3", "N2", "N1"]
# Kanji with no JLPT level in kanji.json (rare, name-only or archaic ones).
UNLISTED = "none"


def is_kanji(char):
    code = ord(char)
    return 0x4E00 <= code <= 0x9FFF or 0x3400 <= code <= 0x4DBF


def load_lyrics(filename=data_path("lyrics.txt")):
    """{song name: [lyric lines]} from a file of "N. Song name" headed blocks."""
    songs = {}
    current = None
    with open(filename, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            head, sep, name = line.partition(". ")
            if sep and head.isdigit():
                current = name
                songs[current] = []
            elif current and line:
                songs[current].append(line)
    return songs


def load_kanji_info(filename=data_path("kanji.json")):
    with open(filename, encoding="utf-8") as f:
        return json.load(f)


def jlpt_level(info):
    level = info.get("jlpt_new") if info else None
    return f"N{level}" if level else UNLISTED


def entropy(counter):
    total = sum(counter.values())
    return -sum((n / total) * log2(n / total) for n in counter.values())


def song_features(name, lines, minutes, kanji_info):
    text = "".join(lines)
    # Matches the sheet's "Unique Character Count": every non-ASCII character,
    # kana included, since that is what has to be read.
    chars = Counter(c for c in text if not c.isascii() and not c.isspace())
    kanji = [c for c in text if is_kanji(c)]

    levels = Counter(jlpt_level(kanji_info.get(k)) for k in set(kanji))
    infos = [kanji_info[k] for k in kanji if k in kanji_info]

    def avg(field):
        values = [i[field] for i in infos if i.get(field)]
        return round(sum(values) / len(values), 2) if values else 0

    line_counts = Counter(lines)
    repeated = sum(n for n in line_counts.values() if n > 1)

    return {
        "song_name": name,
        "unique_char_count": len(chars),
        "unique_kanji": len(set(kanji)),
        "total_kanji": len(kanji),
        **{f"jlpt_{lvl.lower()}": levels[lvl] for lvl in LEVELS},
        "jlpt_unlisted": levels[UNLISTED],
        "avg_freq": avg("freq"),
        "avg_strokes": avg("strokes"),
        "avg_wk_level": avg("wk_level"),
        "char_entropy": round(entropy(chars), 4),
        "line_repetition_ratio": round(repeated / len(lines), 4) if lines else 0,
        "translation_time_in_minutes": minutes,
    }


def song_levels(name, order, lines, kanji_info):
    """Every kanji occurrence in the song, bucketed by JLPT level.

    `count` is occurrences (what reading the song actually costs) and `kanji`
    is the unique set, most frequent first, for the explorer's detail view.
    """
    counts = Counter(c for c in "".join(lines) if is_kanji(c))
    levels = {lvl: {"count": 0, "kanji": ""} for lvl in LEVELS + [UNLISTED]}
    for char, n in counts.most_common():
        bucket = levels[jlpt_level(kanji_info.get(char))]
        bucket["count"] += n
        bucket["kanji"] += char
    return {"name": name, "order": order, "levels": levels}


_levels = {"mtime": None, "data": []}


def load_levels(filename=data_path("kanji_levels.json")):
    """kanji_levels.json for the site, re-read only when the file changes."""
    try:
        mtime = os.path.getmtime(filename)
    except OSError:
        return []

    if mtime != _levels["mtime"]:
        with open(filename, encoding="utf-8") as f:
            _levels["data"] = json.load(f)
        _levels["mtime"] = mtime

    return _levels["data"]


def translated_minutes():
    """{song name: minutes} for every fully translated song, in sheet order."""
    def minutes(time_string):
        h, m, s = map(int, time_string.split(":"))
        return h * 60 + m + round(s / 60)

    return {
        name: minutes(time_string)
        for name, time_string in TranslationDataGetter().get_songs_and_attribute("Time taken")
    }


def main():
    lyrics = load_lyrics()
    kanji_info = load_kanji_info()

    features, levels = [], []
    for order, (name, minutes) in enumerate(translated_minutes().items(), start=1):
        lines = lyrics.get(name)
        if not lines:
            print(f"No lyrics for {name} in lyrics.txt, skipping")
            continue
        features.append(song_features(name, lines, minutes, kanji_info))
        levels.append(song_levels(name, order, lines, kanji_info))

    with open(data_path("song_features.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=features[0].keys())
        writer.writeheader()
        writer.writerows(features)

    with open(data_path("kanji_levels.json"), "w", encoding="utf-8") as f:
        json.dump(levels, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print(f"Wrote features and kanji levels for {len(levels)} songs")


if __name__ == "__main__":
    main()
