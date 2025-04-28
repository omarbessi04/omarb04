import statistics
import json

# Global variables
count = 0

#json file paths
BASE_KANJI_FILEPATH = "ajikan_scraper/data/kanji.json"
JISHO_KANJI_FILEPATH = "ajikan_scraper/data/jisho_kanji.json"

hiragana_and_katakana = [
    # Hiragana
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん',
    
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
    
    'ぇ', 'っ', 'ゃ', 'ゅ', 'ょ',

    # Katakana
    'ア', 'イ', 'ウ', 'エ', 'オ',
    'カ', 'キ', 'ク', 'ケ', 'コ',
    'サ', 'シ', 'ス', 'セ', 'ソ',
    'タ', 'チ', 'ツ', 'テ', 'ト',
    'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
    'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
    'マ', 'ミ', 'ム', 'メ', 'モ',
    'ヤ', 'ユ', 'ヨ',
    'ラ', 'リ', 'ル', 'レ', 'ロ',
    'ワ', 'ヲ', 'ン',
    
    'ガ', 'ギ', 'グ', 'ゲ', 'ゴ',
    'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ',
    'ダ', 'ヂ', 'ヅ', 'デ', 'ド',
    'バ', 'ビ', 'ブ', 'ベ', 'ボ',
    'パ', 'ピ', 'プ', 'ペ', 'ポ',
    
    'ッ', 'ャ', 'ュ', 'ョ', 'ェ', 'ィ',

    # Other stuff I don't want to count
    '々', 'ー', '」', '「', '、'
]

class Lyric_Controller:
    """
    A class to analyze lyrics of songs, extracting unique characters, identifying kanji,
    and determining song difficulty based on kanji frequency and learning level.
    """
    
    def __init__(self):
        self.songs = [
            '新世紀のラブソング', 
            'E', 
            '24時', 
            '真夜中と真昼の夢', 
            'タイトロープ', 
            'ネオテニー', 
            '或る街の群青',
            'さよならロストジェネレイション'
            ]
        self.kanji_dict, self.jisho_kanji_dict = self.get_kanji_files()

    def get_kanji_files(self, filename = BASE_KANJI_FILEPATH, betterfilename = JISHO_KANJI_FILEPATH):
        """Load kanji data from JSON files."""

        with open(filename) as f:
            file = json.load(f)

        with open(betterfilename) as bf:
            Jfile = json.load(bf)

        return file, Jfile


    def main(self, filename="ajikan_scraper/data/lyrics.txt", verbose=False):
        """Process each song in the list, extract unique characters and kanji, 
        and determine difficulty level."""

        for song_name in self.songs:

            song_lyrics = self.find_lyrics(song_name, filename)
            lyrics_text = " ".join(song_lyrics)

            ############################################## JISHO KANJI ###############################################
            jisho_kanji_in_song = [self.jisho_kanji_dict[item] for item in self.jisho_kanji_dict if item in lyrics_text]
            #########################################################################################################

            unique_characters = set()
            kanji_in_song = set()
            
            for char in lyrics_text:
                if not char.isascii():  # Only japanese chars
                    if verbose:
                        print('--New Unique Character:', char)
                    unique_characters.add(char)
                    
                    if char not in hiragana_and_katakana:
                        kanji_in_song.add(char)  # Add kanji to a separate set
                else:
                    if verbose:
                        print('Rejected:', char)
            

            print(f"\n\n\n-------------------------------- '{song_name}' --------------------------------")
            print(len(unique_characters), "unique characters")
            self.get_difficulty_of_song(kanji_in_song)
            print(len(jisho_kanji_in_song), "jisho kanji found\n")
            #print(jisho_kanji_in_song)

    def find_lyrics(self, song_name, filename):
        """Retrieve the lyrics of a song from the lyric file."""
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

    def get_difficulty_of_song(self, kanji_in_song):
        """Calculate kanji frequency and difficulty of a song."""
        freqs = []
        wk_levels = []
        jlpts = []

        missedkanji = []
        
        for kanji in kanji_in_song:
            if kanji in self.kanji_dict:

                Kfreq = self.kanji_dict[kanji]['freq']
                Klevel = self.kanji_dict[kanji]['wk_level']
                Kjlpt = self.kanji_dict[kanji]['jlpt_new']
                
                if not (Kfreq and Klevel and Kjlpt):
                    missedkanji.append(f"{kanji}, {Kfreq=}, {Klevel=}, {Kjlpt=}")
                else:
                    freqs.append(Kfreq)
                    wk_levels.append(Klevel)
                    jlpts.append(Kjlpt)
            else:
                print("Not in Dict: ", kanji)
        
        print(f"Missing data for {len(missedkanji)} Kanji:")
        for thing in missedkanji:
            print(f"    {thing}")

        print(f'\n| Average Frequency: {round(statistics.mean(freqs), 2)} | Average WK Level: {round(statistics.mean(wk_levels), 2)} | Most common JLPT level: {statistics.mode(jlpts)} |')

a = Lyric_Controller()
a.main()
