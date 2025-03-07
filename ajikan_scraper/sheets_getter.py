from flask import Flask, jsonify, request
from playlist_scraper import playlist_scraper
from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

# TODO total hours studies
# TODO description

try:
    API_KEY = os.environ.get('sheets_api_key')
except:
    load_dotenv()
    API_KEY = os.getenv('sheets_api_key')

SPREADSHEET_ID = "1d-EzIikQ1kvo58Gj6pHKr22lmSphXLe-siMwmwtruyo"
SONGS_RANGE = "songs!A1:H31"
TIMEWRITEUP_RANGE = "TimeWriteup!A1:E100"

app = Flask(__name__)

SONG_OBJECT_TRANSLATOR = {
    'ID': 0, 
    'Song Name': 1, 
    'Track length': 2, 
    'Translated': 3, 
    'Time taken': 4, 
    'Pages': 5, 
    'Translation Total / Track length': 6, 
    'Notes': 7 
}
TIME_WRITEUP_TRANSLATOR = {
    'ID': 0,
    'StartTime': 1, 
    'EndTime': 2, 
    'TotalTime': 3, 
    'Date': 4
}

class Sheets_Getter():
    def __init__(self):
        self.hidden_sheets = self.authenticate_sheets(API_KEY)
        self.songs_data = self.get_sheet(SONGS_RANGE)
        self.time_writeup_data = self.get_sheet(TIMEWRITEUP_RANGE)

    def reload(self):
        self.songs_data = self.get_sheet(SONGS_RANGE)
        self.time_writeup_data = self.get_sheet(TIMEWRITEUP_RANGE)

    def authenticate_sheets(self, api_key):
        return build('sheets', 'v4', developerKey=api_key).spreadsheets()

    def get_sheet(self, sheet_range):
        order_66 = self.hidden_sheets.values().get(spreadsheetId=SPREADSHEET_ID, range=sheet_range)
        results = order_66.execute()
        return results.get('values', [])
    
    def find_current_song(self):
        for song in self.songs_data:
            if song[3] == "Working On It":
                return song
            
sheets = Sheets_Getter()
ps = playlist_scraper()

def wrap_up(item):
    response = jsonify(item)
    response.headers.add('Access-Control-Allow-Origin', '*')

    return response

@app.route('/songs', methods=['GET'])
def get_songs():
    parameter = request.args.get('parameter')
    if parameter and parameter in SONG_OBJECT_TRANSLATOR:
        data = [obj[SONG_OBJECT_TRANSLATOR[parameter]] for obj in sheets.songs_data]
    else:
        data = sheets.songs_data

    return wrap_up(data)

@app.route('/timewriteup', methods=['GET'])
def get_timewriteup():
    parameter = request.args.get('parameter')
    if parameter and parameter in TIME_WRITEUP_TRANSLATOR:
        data = [obj[TIME_WRITEUP_TRANSLATOR[parameter]] for obj in sheets.time_writeup_data]
    else:
        data = sheets.time_writeup_data

    return wrap_up(data)

@app.route('/get_total_study', methods=['GET'])
def get_hours_studied():
    hours = 0
    minutes = 0
    seconds = 0

    for song in sheets.songs_data[1:]:
        time_string = song[SONG_OBJECT_TRANSLATOR['Time taken']]
        time_string = time_string.split(":")

        hours += int(time_string[0])
        minutes += int(time_string[1])
        seconds += int(time_string[2])

    if seconds > 59:
        minutes += seconds//60
        seconds = seconds%60

    if minutes > 59:
        hours += minutes//60
        minutes = minutes%60

    
    data = {'hours':hours, 'minutes':minutes, 'seconds':seconds}

    return wrap_up(data)

@app.route('/get_current_song_id', methods=['GET'])
def get_current_song():

    sheets.reload()
    sheet_song = sheets.find_current_song()

    # 0 is the ID column in the google sheet
    csv_song = ps.get_song_by_id(sheet_song[0])

    # 4 is the link of the song, we're getting the id of the song, which is in the link
    spotify_song_id = {"song_id":csv_song[4].split('/')[-1]}

    return wrap_up(spotify_song_id)

@app.route('/translation_progress', methods=['GET'])
def get_completion_count():

    songs = sheets.songs_data
    not_comp = 0
    working = 0
    comp = 0

    for song in songs[1:]:
        if song[SONG_OBJECT_TRANSLATOR['Translated']] == 'Fully Translated':
            comp += 1
        elif song[SONG_OBJECT_TRANSLATOR['Translated']] == 'Working On It':
            working += 1
        else:
            not_comp += 1

    data = {
        'remaining': not_comp, 
        'inProgress': working, 
        'completed': comp
    }
    
    return wrap_up(data)

if __name__ == '__main__':
    app.run()