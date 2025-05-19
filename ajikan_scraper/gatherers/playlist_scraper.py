import requests
import csv
from dotenv import load_dotenv
import os

# [0, 1, 2]
ALBUM_COVER_SIZE = 1

def configure():
    load_dotenv()


class playlist_scraper():
    def __init__(self):
        configure()
        token = self.get_token()
        playlist = self.get_playlist(token)
        self.tracknames = self.get_tracknames(playlist)
        self.make_csv(self.tracknames)

    def get_token(self):

        try:
            my_client_id = os.environ.get('spotify_base_client')
            my_client_secret = os.environ.get('spotify_client_secret')
        except:
            configure()
            my_client_id = os.getenv('spotify_base_client')
            my_client_secret = os.getenv('spotify_client_secret')

        access_token_request = requests.post("https://accounts.spotify.com/api/token", 
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}, 
                    data={
                            'grant_type':'client_credentials',
                            'client_id':my_client_id,
                            'client_secret':my_client_secret
                    })

        token = access_token_request.json()
        return token

    def get_playlist(self, auth):
        playlist_id = "1rEDywcuxEpa5GZRaYIJJg"
        playlist = requests.get(f"https://api.spotify.com/v1/playlists/{playlist_id}",
                    headers={'Authorization': f'{auth["token_type"]} {auth["access_token"]}'})
        
        return playlist.json()

    def get_tracknames(self, playlist):
        tracks = playlist['tracks']['items']

        tracklist = []

        for track in tracks:
            tracklist.append(track['track'])

        return tracklist

    def make_csv(self, tracknames):
        with open('ajikan_scraper/data/songs.csv', 'w', newline='', encoding='utf-8') as songs:
            track_writer = csv.writer(songs, quoting=csv.QUOTE_MINIMAL)

            for i, track in enumerate(tracknames):
                track_writer.writerow([i+1, track['name'], self.ms_to_time(track['duration_ms']), track['album']['images'][ALBUM_COVER_SIZE]['url'], track['external_urls']['spotify']])

    def ms_to_time(self, millis):
        millis = int(millis)
        seconds=(millis/1000)%60
        seconds = int(seconds)
        minutes=(millis/(1000*60))%60
        minutes = int(minutes)
        hours=(millis/(1000*60*60))%24

        return ("%d:%d:%d" % (hours, minutes, seconds))
    
    def get_song_by_id(self, id: int, only_link=False):
        try:
            id = int(id) - 1
        except ValueError:
            return f"Id {id} is not a number"
        
        with open('ajikan_scraper/data/songs.csv', 'r', newline='', encoding='utf-8') as songs:
            track_writer = csv.reader(songs)

            if not only_link:
                # Make it into a list, then index into it
                return [point for point in track_writer][id]
            else:
                # 4 is the link of the song, we're getting the id of the song, which is the last item in the link
                return [point for point in track_writer][id][4].split('/')[-1]
            

a = playlist_scraper()
print(a.tracknames)