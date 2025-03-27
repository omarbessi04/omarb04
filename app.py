from flask import Flask, jsonify, request, render_template, send_from_directory
from ajikan_scraper.playlist_scraper import playlist_scraper
from ajikan_scraper.sheets_getter import Sheets_Getter
from dotenv import load_dotenv
import os

try:
    API_KEY = os.environ.get('sheets_api_key')
except:
    load_dotenv()
    API_KEY = os.getenv('sheets_api_key')

app = Flask(__name__)

sheets = Sheets_Getter()
ps = playlist_scraper()

###### Helper functions ######
def wrap_up(item):
    response = jsonify(item)
    response.headers.add('Access-Control-Allow-Origin', '*')

    return response

###### Templates ######
@app.route('/', methods=['GET'])
def home():
    return render_template('index.html')

@app.route('/projects')
def projects():
    return render_template('projects.html')

@app.route('/translations')
def translations():
    return render_template('translations.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),'favicon.ico', mimetype='image/vnd.microsoft.icon')

###### Data returns ######
@app.route('/songs', methods=['GET'])
def get_songs():
    parameter = request.args.get('parameter')
    data = sheets.get_songs(parameter)

    return wrap_up(data)

@app.route('/timewriteup', methods=['GET'])
def get_timewriteup():
    parameter = request.args.get('parameter')
    data = sheets.get_timewriteup(parameter)

    return wrap_up(data)

@app.route('/get_total_study', methods=['GET'])
def get_hours_studied():
    data = sheets.get_hours_studied()
    return wrap_up(data)

@app.route('/get_current_song_id', methods=['GET'])
def get_current_song():

    sheets.reload()
    sheet_song = sheets.find_current_song()

    # 0 is the ID column in the google sheet
    csv_song_link = ps.get_song_by_id(sheet_song[0], only_link=True)

    # 4 is the link of the song, we're getting the id of the song, which is in the link
    spotify_song_id = {"song_id":csv_song_link}

    return wrap_up(spotify_song_id)

@app.route('/translation_progress', methods=['GET'])
def get_completion_count():
    data = sheets.get_completion_count()
    return wrap_up(data)

@app.route('/songs_and_times', methods=['GET'])
def get_songs_and_times():
    data = sheets.get_songs_and_attribute('Time taken')
    return wrap_up(data)

@app.route('/get_tttl', methods=['GET'])
def get_tttl():
    data = sheets.get_songs_and_attribute('Translation Total / Track length')
    return wrap_up(data)

@app.route('/get_UCCPC', methods=['GET'])
def get_pagecount_times():
    data = sheets.get_songs_and_attribute('Translation Total / UCC')
    return wrap_up(data)

if __name__ == '__main__':
    app.run()