# train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import numpy as np

"""
Training CSV requirements (example columns):
Age,Gender,Employment,Income,Food,Transport,Housing,Utilities,Savings,Entertainment,Healthcare,Education,Other

- Gender: Male/Female
- Employment: unemployed/employed/student (lower/any case OK; we map)
- Income: monthly income in LKR
- Targets (Food,...,Other) are absolute LKR amounts (not percentages).
"""

CANONICAL = [
    "Food", "Transport", "Housing", "Utilities", "Savings",
    "Entertainment", "Healthcare", "Education", "Other"
]

df = pd.read_csv("real_training_data.csv")

# Clean & encode
df["Gender"] = df["Gender"].str.lower().map({"male": 0, "female": 1})
emp_map = {"unemployed": 0, "employed": 1, "student": 2}
df["Employment"] = df["Employment"].str.lower().map(emp_map)

# Basic sanity (drop rows with missing essentials)
df = df.dropna(subset=["Age", "Gender", "Employment", "Income"])

X = df[["Age", "Gender", "Employment", "Income"]].astype(float)

# Ensure all target columns exist; missing ones become 0
for c in CANONICAL:
    if c not in df.columns:
        df[c] = 0.0
y = df[CANONICAL].astype(float)

# Train
model = RandomForestRegressor(
    n_estimators=300,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)
model.fit(X, y)

# Save model + metadata we need later
joblib.dump(
    {"model": model, "emp_map": emp_map, "canonical": CANONICAL},
    "budget_model.pkl"
)
print("✅ Model saved to budget_model.pkl")
