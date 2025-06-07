import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import matplotlib.pyplot as plt

def main(verbose = False):
    # load data
    data = data_loader(verbose)
    output = define_and_train(data, verbose)
    return output

def data_loader(verbose = False):
    if verbose: print("... Reading CSV")
    df = pd.read_csv("ajikan_scraper/data/song_features.csv")
    return df

def define_and_train(df, verbose = False):
    # Define features (X) and target (y)
    if verbose: print("Creating Columns")
    X = df.drop(columns=["song_name", "translation_time_in_minutes"])
    y = df["translation_time_in_minutes"]

    # Split into train/test sets
    if verbose: print("Splitting")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )

    # Train the model
    if verbose: print("Training Random Forest Regressor")
    model = RandomForestRegressor(random_state=42)
    model.fit(X_train, y_train)

    # Predict and evaluate
    y_pred = model.predict(X_test)
    
    output = {
        "R² score": r2_score(y_test, y_pred),
        "Mean Absolute Error (minutes)": mean_absolute_error(y_test, y_pred)}

    # Feature importance visualization
    if verbose:
        importances = model.feature_importances_
        feature_names = X.columns
        plt.figure(figsize=(10, 6))
        plt.barh(feature_names, importances, color="#36827F")
        plt.xlabel("Feature Importance")
        plt.title("Which features predict translation time?")
        plt.gca().invert_yaxis()
        plt.grid(True, axis='x', linestyle='--', alpha=0.7)
        plt.tight_layout()
        plt.show()

    return output

a = main(True)
[print(f"{b}: {a[b]}") for b in a.keys()]