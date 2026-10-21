import csv
import os

from akfg import data_path

CSV_PATH = data_path("translations.csv")

# Values of the "Translated" column. Anything else counts as not started.
DONE = "Fully Translated"
WORKING = "Working On It"
# Queued for when the project picks back up; shown as "Next up" on the page.
UP_NEXT = "Up Next"

SONG_OBJECT_TRANSLATOR = {
    "ID": 0,
    "Song Name": 1,
    "Track length": 2,
    "Translated": 3,
    "Time taken": 4,
    "Unique Character Count": 5,
    "Translation Total / Track length": 6,
    "Translation Total / UCC": 7,
    "Notes": 8
}

class TranslationDataGetter():
    def __init__(self):
        self._rows = None
        self._mtime = None

    @property
    def songs_data(self):
        """Parsed CSV rows, re-read whenever the file changes on disk.

        The CSV is the whole point of the site and gets edited often, so
        caching it forever would mean a restart for every data update.
        """
        try:
            mtime = os.path.getmtime(CSV_PATH)
        except OSError:
            return []

        if self._rows is None or mtime != self._mtime:
            self._rows = self.get_csv()
            self._mtime = mtime

        return self._rows

    def get_csv(self):
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            return list(reader)

    def get_songs(self, parameter):
        if parameter and parameter in SONG_OBJECT_TRANSLATOR:
            data = [obj[SONG_OBJECT_TRANSLATOR[parameter]] for obj in self.songs_data[1:]]
        else:
            data = self.songs_data[1:]
        return data

    def get_hours_studied(self):
        hours = minutes = seconds = 0
        for song in self.songs_data[1:]:
            time_string = song[SONG_OBJECT_TRANSLATOR['Time taken']]
            if time_string == '':
                continue
            h, m, s = map(int, time_string.split(":"))
            hours += h
            minutes += m
            seconds += s

        minutes += seconds // 60
        seconds %= 60
        hours += minutes // 60
        minutes %= 60

        return {'hours': hours, 'minutes': minutes, 'seconds': seconds}

    def get_completion_count(self):
        not_comp = working = comp = 0
        for song in self.songs_data[1:]:
            status = song[SONG_OBJECT_TRANSLATOR['Translated']]
            if status == DONE:
                comp += 1
            elif status == WORKING:
                working += 1
            else:
                not_comp += 1

        return {'remaining': not_comp, 'inProgress': working, 'completed': comp}

    def find_current_song(self):
        """The row being worked on, else the one queued up next, else None."""
        for status in (WORKING, UP_NEXT):
            for song in self.songs_data[1:]:
                if song[SONG_OBJECT_TRANSLATOR['Translated']] == status:
                    return song
        return None

    def get_songs_and_attribute(self, attribute):
        data = []
        for song in self.songs_data[1:]:
            if song[SONG_OBJECT_TRANSLATOR['Translated']] == DONE:
                mytpl = (song[SONG_OBJECT_TRANSLATOR['Song Name']], song[SONG_OBJECT_TRANSLATOR[attribute]])
                data.append(mytpl)
        return data
