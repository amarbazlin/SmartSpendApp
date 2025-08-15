# train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import numpy as np

CANONICAL = ["Food","Transport","Housing","Utilities","Savings",
             "Entertainment","Healthcare","Education","Other"]

df = pd.read_csv("real_training_data.csv")

# NO Gender. If you kept Employment, map it; otherwise drop it too.
# If you only use Age + Income:
X = df[["Age", "Income"]].astype(float)

for c in CANONICAL:
    if c not in df.columns:
        df[c] = 0.0
y = df[CANONICAL].astype(float)

model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
model.fit(X, y)

joblib.dump({"model": model, "canonical": CANONICAL}, "budget_model.pkl")
print("✅ Model saved to budget_model.pkl")
