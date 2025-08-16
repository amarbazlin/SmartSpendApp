# train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import numpy as np

# Include Emergency so the model actually learns & predicts it.
CANONICAL = [
    "Food","Transport","Housing","Utilities","Savings",
    "Entertainment","Healthcare","Education","Emergency","Other"  # keep Other as a safety bucket
]

# Load your exported CSV
df = pd.read_csv("real_training_data.csv")

# Inputs/features (what app.py already supports)
FEATURES = ["Age", "Income"]
X = df[FEATURES].astype(float)

# Ensure all target columns exist; fill missing with 0
for c in CANONICAL:
    if c not in df.columns:
        df[c] = 0.0
y = df[CANONICAL].astype(float)

model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
model.fit(X, y)

# Save everything the API needs
joblib.dump(
    {"model": model, "canonical": CANONICAL, "features": FEATURES},
    "budget_model.pkl"
)
print("✅ Model saved to budget_model.pkl")
