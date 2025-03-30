################ Place Lyrics in A, output the letter count ################
a = "a"
a = a.split()
count = 0
known_letters = []


print(count)

def count_unique_characters(song_name, filename="ajikan_scraper\lyrics.txt", verbose=False):
    song_lyrics = find_lyrics(song_name, filename)
    
    lyrics_text = " ".join(song_lyrics)
    unique_characters = set()
    
    for char in lyrics_text:
        if not char.isascii():  # Consider only non-ASCII characters
            if verbose:
                print('--good:', char)
            unique_characters.add(char)
        else:
            if verbose:
                print('bad',char)
    
    print(f"'{song_name}': {len(unique_characters)}")
    
def find_lyrics(song_name, filename):

    with open(filename, "r", encoding="utf-8") as file:
        lines = file.readlines()
    
    song_lyrics = []
    found = False
    for line in lines:
        line = line.strip()
        
        if line and line[0].isdigit() and ". " in line:
            current_song = line.split(". ", 1)[1]
            
            if found:
                break
            
            if current_song == song_name:
                found = True
                continue
        
        if found:
            song_lyrics.append(line)
    
    if not song_lyrics:
        print("Song not found.")
        return None
    
    return song_lyrics

songs = ['新世紀のラブソング', 'E', '24時', '真夜中と真昼の夢', 'タイトロープ', 'ネオテニー', '或る街の群青']

for song in songs:
    count_unique_characters(song)
