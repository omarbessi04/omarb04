# import requests

# params = {
#     "artist_name": "Borislav Slavov",
#     "track_name": "I Want to Live",
#     "album_name": "Baldur's Gate 3 (Original Game Soundtrack)",
#     "duration": 233,
# }

# response = requests.get("https://lrclib.net/api/get", params=params)

# if response.status_code == 200:
#     data = response.json()
#     lyrics = data["plainLyrics"].split("\n")

#     print("\n".join(lyrics))


# def get_all_song_params():
#     import pandas

#     df = pandas.read_csv(
#         r"C:\HR\omarb04\ajikan_scraper\data\songs.csv",
#     )
#     print(df.iloc[0])


# get_all_song_params()
