import statistics
import json
import csv
from collections import Counter
from math import log2

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
    '々', 'ー', '」', '「', '、', '？'
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
            '転がる岩、君に朝が降る',
            'さよならロストジェネレイション',
            '架空生物のブルース',
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
            
            print("---------- JLPT difficulties ----------")
            curve, unknowns = self.get_difficulty_curve_of_song(kanji_in_song, 'jlpt_new')
            print('?: ', "="*unknowns, unknowns)
            for kkey in sorted(curve.keys()):
                print(f"{kkey}: ", "="*curve[kkey], curve[kkey])

            print("---------- Strokes ----------")
            curve, unknowns = self.get_difficulty_curve_of_song(kanji_in_song, 'strokes')
            print('?: ', "="*unknowns, unknowns)
            for kkey in sorted(curve.keys()):
                print(f"{kkey}: ", "="*curve[kkey], curve[kkey])

            

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

    def get_difficulty_curve_of_song(self, kanji_in_song, category):
        """Calculate kanji frequency and difficulty of a song."""
        jlpts = {}
        unknowns = 0
        
        for kanji in kanji_in_song:
            if (kanji in self.kanji_dict) and (self.kanji_dict[kanji][category] != None):
                Kjlpt = self.kanji_dict[kanji][category]
                
                if Kjlpt not in jlpts:
                    jlpts[Kjlpt] = 0
                
                jlpts[Kjlpt] += 1

            else:
                unknowns += 1

        return jlpts, unknowns

    def calculate_entropy(self, counter):
        """Calculate entropy from a Counter of character frequencies."""
        total = sum(counter.values())
        return -sum((count/total) * log2(count/total) for count in counter.values())

    def generate_feature_csv(self, lyrics_filename, output_csv='ajikan_scraper/data/song_features.csv'):
        rows = []

        for song_name in self.songs:

            song_lyrics = self.find_lyrics(song_name, lyrics_filename)
            song_time_in_minutes = self.get_song_time(song_name)
            if not song_time_in_minutes:
                print("Missing song in song_time_dict", song_name)
                continue

            if not song_lyrics:
                print("Missing song lyrics:", song_name)
                continue

            lyrics_text = " ".join(song_lyrics)
            lines = [line.strip() for line in song_lyrics if line.strip()]
            line_counter = Counter(lines)
            repeated_lines = sum(count for line, count in line_counter.items() if count > 1)
            repetition_ratio = repeated_lines / len(lines) if lines else 0

            unique_chars = set()
            kanji_in_song = []
            char_counter = Counter()

            for char in lyrics_text:
                if not char.isascii():
                    unique_chars.add(char)
                    char_counter[char] += 1
                    if char not in hiragana_and_katakana:
                        kanji_in_song.append(char)

            unique_char_count = len(unique_chars)
            total_kanji = len(kanji_in_song)

            jlpt_counts = {'N5': 0, 'N4': 0, 'N3': 0, 'N2': 0, 'N1': 0}
            unknown_kanji = 0
            freq_list = []
            wk_list = []
            stroke_list = []

            for kanji in kanji_in_song:
                if kanji in self.kanji_dict:
                    info = self.kanji_dict[kanji]
                    jlpt = info.get('jlpt_new')
                    freq = info.get('freq')
                    wk_level = info.get('wk_level')
                    strokes = info.get('strokes')

                    if f"N{jlpt}" in jlpt_counts:
                        jlpt_counts[f"N{jlpt}"] += 1
                    else:
                        unknown_kanji += 1

                    if freq: freq_list.append(freq)
                    if wk_level: wk_list.append(wk_level)
                    if strokes: stroke_list.append(strokes)
                else:
                    unknown_kanji += 1

            entropy = self.calculate_entropy(char_counter)



            row = {
                'song_name': song_name,
                'unique_char_count': unique_char_count,
                'jlpt_n5': jlpt_counts['N5'],
                'jlpt_n4': jlpt_counts['N4'],
                'jlpt_n3': jlpt_counts['N3'],
                'jlpt_n2': jlpt_counts['N2'],
                'jlpt_n1': jlpt_counts['N1'],
                'unknowns': unknown_kanji,
                'avg_freq': round(sum(freq_list) / len(freq_list), 2) if freq_list else 0,
                'sum_freq': sum(freq_list) if freq_list else 0,
                'avg_strokes': round(sum(stroke_list) / len(stroke_list), 2) if stroke_list else 0,
                'sum_strokes': sum(stroke_list) if stroke_list else 0,
                'avg_wk_level': round(sum(wk_list) / len(wk_list), 2) if wk_list else 0,
                'total_kanji': total_kanji,
                'kanji_entropy': round(entropy, 4),
                'line_repetition_ratio': round(repetition_ratio, 4),
                'translation_time_in_minutes': song_time_in_minutes
            }

            for item in row:
                if item == 'song_name':
                    print(row[item])
                    print("--"*len(row[item]))
                else:
                    print(f"   - {item}: {row[item]}")

            print()
                

            rows.append(row)

        # Save to CSV
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

    def get_song_time(self, song_name):
        song_time_dict = {
            '新世紀のラブソング': '04:45:00', 
            'E': '01:41:00', 
            '24時': '02:51:00', 
            '真夜中と真昼の夢': '01:46:00', 
            'タイトロープ': '01:34:00', 
            'ネオテニー': '03:15:00', 
            '或る街の群青': '02:53:00',
            '転がる岩、君に朝が降る': '02:30:00',
            'さよならロストジェネレイション': '02:09:00',
            '架空生物のブルース': '02:00:00'
        }

        if song_name in song_time_dict:
            hours, minutes, _ = song_time_dict[song_name].split(':')
            minute_sum = (60 * int(hours)) + int(minutes)
            return minute_sum
        else:
            return None

a = Lyric_Controller()
a.generate_feature_csv("ajikan_scraper/data/lyrics.txt")



"""
    def get_difficulty_of_song(self, kanji_in_song):
        ""Calculate kanji frequency and difficulty of a song.""
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
"""