import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import xgboost as xgb

# Load data
df = pd.read_csv("ajikan_scraper/data/song_features.csv")
X = df.drop(columns=["song_name", "translation_time_in_minutes"])
y = df["translation_time_in_minutes"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Define model
model = xgb.XGBRegressor(
    objective="reg:squarederror",  # for regression
    n_estimators=100,
    learning_rate=0.1,
    max_depth=4,
    random_state=42
)

# Train
print("Training XGBoost Regressor")
model.fit(X_train, y_train)

# Predict and evaluate
y_pred = model.predict(X_test)
print("R² score:", r2_score(y_test, y_pred))
print("Mean Absolute Error (minutes):", mean_absolute_error(y_test, y_pred))

# Feature importance (optional)
import matplotlib.pyplot as plt

xgb.plot_importance(model, importance_type='gain', height=0.5)
plt.title("XGBoost Feature Importance")
plt.tight_layout()
plt.show()
