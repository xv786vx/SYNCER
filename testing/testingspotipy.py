from src.functions.helpers.sp_provider import SpotifyProvider

sp = SpotifyProvider()

print(sp.get_playlist_by_name('rigea'))
# spotify:track:3lLT1GM0h5bJXv0lToc4zw


# jasiah yung bans shenanigans wshh exclusive 



# TEST 1 (FUZZY GATE = 65, NONG = 68)
# TEST 2 (FUZZY GATE = 10, NONG = 3)
# TEST 3 (FUZZY GATE = 25, NONG = 12)
# TEST 4 (FUZZY GATE = 20, NONG = 6)

# INTERESTING SONGS TO TEST: <FROM YT> (FROM SP):
#region

# MATCH FOUND FOR smokepurpp x murda beatz  123 official video BY lyrical lemonade
# audi BY ['smokepurpp']
# MATCH FOUND FOR smokepurpp x murda beatz  123 official video BY lyrical lemonade
# what i please feat denzel curry BY ['smokepurpp', 'denzel curry']
# MATCH FOUND FOR smokepurpp x murda beatz  123 official video BY lyrical lemonade
# murda she wrote BY ['sleepy hallow']
# final song title (sp): murda she wrote, song title (yt): smokepurpp x murda beatz  123 official video
# final artist names (sp): ['sleepy hallow'], artist names (yt): lyrical lemonade
# spotify:track:3lLT1GM0h5bJXv0lToc4zw

# MATCH FOUND FOR euro gotit  posse ft lil baby official audio BY king euro gotit
# ready feat gunna BY ['lil baby', 'gunna']
# MATCH FOUND FOR euro gotit  posse ft lil baby official audio BY king euro gotit
# 3 headed goat feat lil baby  polo g BY ['lil durk', 'lil baby', 'polo g']
# final song title (sp): 3 headed goat feat lil baby  polo g, song title (yt): euro gotit  posse ft lil baby official audio
# final artist names (sp): ['lil durk', 'lil baby', 'polo g'], artist names (yt): king euro gotit
# spotify:track:6Tguhaf2uAe6OjRLsR2Tql

# # err: NO MATCH FOUND FOR gun em down feat diego landlord  dame luchi BY dae dae  topic
# # CLOSEST IS goons BY ['burna bandz']
# # Press Enter to continue...
# # err: NO MATCH FOUND FOR gun em down feat diego landlord  dame luchi BY dae dae  topic
# # CLOSEST IS at the pot BY ['burna bandz']
# # Press Enter to continue...
# # err: NO MATCH FOUND FOR gun em down feat diego landlord  dame luchi BY dae dae  topic
# # CLOSEST IS pop out BY ['burna bandz']
# # Press Enter to continue...
# # MATCH FOUND FOR gun em down feat diego landlord  dame luchi BY dae dae  topic
# # your homie BY ['top5', 'drakeo the ruler', '6ixbuzz']

# MATCH FOUND FOR 21 savage  asmr official audio BY 21 savage
# asmr BY ['21 savage']
# MATCH FOUND FOR 21 savage  asmr official audio BY 21 savage
# cant leave without it BY ['21 savage']
# MATCH FOUND FOR 21 savage  asmr official audio BY 21 savage
# glock in my lap BY ['21 savage', 'metro boomin']
# final song title (sp): glock in my lap, song title (yt): 21 savage  asmr official audio
# final artist names (sp): ['21 savage', 'metro boomin'], artist names (yt): 21 savage
# spotify:track:6pcywuOeGGWeOQzdUyti6k

# MATCH FOUND FOR roddy ricch  hoodricch prod by bearonthebeat dir by skyyliinevisualz starring hoodricch BY roddy ricch
# every season BY ['roddy ricch']
# MATCH FOUND FOR roddy ricch  hoodricch prod by bearonthebeat dir by skyyliinevisualz starring hoodricch BY roddy ricch
# ballin with roddy ricch BY ['mustard', 'roddy ricch']
# MATCH FOUND FOR roddy ricch  hoodricch prod by bearonthebeat dir by skyyliinevisualz starring hoodricch BY roddy ricch
# walk em down feat roddy ricch BY ['nle choppa', 'roddy ricch']
# final song title (sp): walk em down feat roddy ricch, song title (yt): roddy ricch  hoodricch prod by bearonthebeat dir by skyyliinevisualz starring hoodricch
# final artist names (sp): ['nle choppa', 'roddy ricch'], artist names (yt): roddy ricch
# spotify:track:1Z0cZI0UzNbP9L8MzzGxqf

# MATCH FOUND FOR tayk  bummer ft lil kolya official audio BY hip hop all star
# all ten feat lil baby  sped up BY ['tay b', 'lil baby']
# final song title (sp): all ten feat lil baby  sped up, song title (yt): tayk  bummer ft lil kolya official audio
# final artist names (sp): ['tay b', 'lil baby'], artist names (yt): hip hop all star
# spotify:track:4cL5m8Zzxk5CRmn5xLD2XY

# MATCH FOUND FOR roddy ricch  ricch forever music video BY hip hoprb lyrics
# every season BY ['roddy ricch']
# MATCH FOUND FOR roddy ricch  ricch forever music video BY hip hoprb lyrics
# ballin with roddy ricch BY ['mustard', 'roddy ricch']
# final song title (sp): ballin with roddy ricch, song title (yt): roddy ricch  ricch forever music video
# final artist names (sp): ['mustard', 'roddy ricch'], artist names (yt): hip hoprb lyrics
# spotify:track:3QzAOrNlsabgbMwlZt7TAY
#!!!DOESN'T EXIST ON SPOTIFY!!!

#endregion

str1 = ["broccoli", 
        "waka feat a boogie wit da hoodie", 
        "new patek", 
        "rubiks intro", 
        "rich  sad", 
        "123", 
        "balenciaga ft 21 savage", 
        "glockwin feat bigwinnn", 
        "posse", 
        "gun em down feat diego landlord", 
        "baby", 
        "asmr", 
        "hoodricch", 
        "shenanigans feat yung bans", 
        "at all cost", 
        "bummer", 
        "ricch forever", 
        "joggers", 
        "blow the pickle"]

str2 = ["another late night (feat. lil yachty)", 
        "keke", 
        "patek", 
        "crash bandicoot main theme", 
        "cooped up with roddy ricch", 
        "nephew feat lil pump", 
        "cupid balenciaga",
        "cash route", 
        "gas gas gas", 
        "goons", 
        "fuk dat nia", 
        "spin bout u", 
        "every season", 
        "eye 2 eye", 
        "money", 
        "fuk dat nia", 
        "everywhere i go", 
        "die young", 
        "topic", 
        "blow the whistle"]