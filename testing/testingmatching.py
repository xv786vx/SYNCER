import pandas as pd
from fuzzywuzzy import fuzz
import re
from Levenshtein import distance
from fuzzywuzzy import fuzz
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import jaccard_score



#region
# def fuzzy_match(str1, str2):
#     # Define common filler words to ignore
#     stopwords = {"feat", "featuring", "official", "music", "video"}
    
#     # Function to remove stopwords and non-alphanumeric characters
#     def preprocess(text):
#         tokens = re.sub(r'[^a-zA-Z0-9\s]', '', text).lower().split()
#         return " ".join([token for token in tokens if token not in stopwords])
    
#     # Preprocess both input strings
#     str1_processed = preprocess(str1)
#     str2_processed = preprocess(str2)
    
#     # Calculate similarity score with fuzzywuzzy
#     similarity_score = fuzz.ratio(str1_processed, str2_processed)
    
#     # Set a threshold for similarity match
#     return similarity_score, similarity_score > 50



# def fuzzy_match_alternative_levenshtein(str1, str2):
#     # Calculate Levenshtein distance between both strings
#     dist = distance(str1.lower(), str2.lower())
#     avg_len = (len(str1) + len(str2)) / 2
#     similarity_score = 100 * (1 - (dist / avg_len))
    
#     # print(f"Levenshtein similarity score: {similarity_score}")
#     return similarity_score, similarity_score > 50  # Adjust threshold based on acceptable similarity level





# # Prepare the data for iteration
# str1_list = [
#     "broccoli", "waka feat a boogie wit da hoodie", "new patek", "rubiks intro", "rich sad",
#     "123", "balenciaga ft 21 savage", "glockwin feat bigwinnn", "posse", "gun em down feat diego landlord",
#     "baby", "asmr", "hoodricch", "shenanigans feat yung bans", "at all cost", "bummer", "ricch forever",
#     "joggers", "blow the pickle"
# ]

# str2_list = [
#     "another late night (feat. lil yachty)", "keke", "patek", "crash bandicoot main theme",
#     "cooped up with roddy ricch", "nephew feat lil pump", "cupid balenciaga", "cash route", "gas gas gas",
#     "goons", "fuk dat nia", "spin bout u", "every season", "eye 2 eye", "money", "fuk dat nia",
#     "everywhere i go", "die young", "topic", "blow the whistle"
# ]

# # Dictionary to collect results
# results = {
#     "Song Pair": [],
#     "Weighted Token Similarity": [],
#     "Weighted Result": [],
#     "Levenshtein Similarity": [],
#     "Levenshtein Result": [],

# }

# # Process each pair
# for s1, s2 in zip(str1_list, str2_list):
#     # Collect song pair for readability
#     song_pair = f"{s1} - {s2}"
#     results["Song Pair"].append(song_pair)
    
#     # Run each fuzzy matching function
#     weighted_score, weighted_result = fuzzy_match(s1, s2)
#     levenshtein_score, levenshtein_result = fuzzy_match_alternative_levenshtein(s1, s2)

    
#     # Store results
#     results["Weighted Token Similarity"].append(weighted_score)
#     results["Weighted Result"].append(weighted_result)
#     results["Levenshtein Similarity"].append(levenshtein_score)
#     results["Levenshtein Result"].append(levenshtein_result)


# # Convert to DataFrame for display
# results_df = pd.DataFrame(results)
# print(results_df)
#endregion