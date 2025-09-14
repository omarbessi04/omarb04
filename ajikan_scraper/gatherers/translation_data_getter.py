import csv

CSV_PATH = "static/assets/translations/AKFG_Translation_data.csv"

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
        self.songs_data = self.get_csv()
    
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
            if status == 'Fully Translated':
                comp += 1
            elif status == 'Working On It':
                working += 1
            else:
                not_comp += 1

        return {'remaining': not_comp, 'inProgress': working, 'completed': comp}

    def find_current_song(self):
        for song in self.songs_data[1:]:
            if song[SONG_OBJECT_TRANSLATOR['Translated']] == "Working On It":
                return song

    def get_songs_and_attribute(self, attribute):
        data = []
        for song in self.songs_data[1:]:
            if song[SONG_OBJECT_TRANSLATOR['Translated']] == 'Fully Translated':
                mytpl = (song[SONG_OBJECT_TRANSLATOR['Song Name']], song[SONG_OBJECT_TRANSLATOR[attribute]])
                data.append(mytpl)
        return data
