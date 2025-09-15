import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load your CSV
df = pd.read_csv("ajikan_scraper/data/song_features.csv")

# Correlation matrix with translation time
corr = df.corr(numeric_only=True)["translation_time_in_minutes"].sort_values(ascending=False)
print(corr)

# Plot heatmap of all correlations
plt.figure(figsize=(10,8))
sns.heatmap(df.corr(numeric_only=True), annot=True, fmt=".2f", cmap="coolwarm")
plt.title("Correlation Matrix")
plt.show()

# Scatter plots for strongest correlations
top_features = corr.index[1:6]  # top 5 excluding translation_time_in_minutes itself
for feature in top_features:
    plt.figure()
    sns.scatterplot(data=df, x=feature, y="translation_time_in_minutes")
    plt.title(f"{feature} vs Translation Time")
    plt.show()
