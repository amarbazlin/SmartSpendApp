# app.py
from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# -------- Load model --------
PACK = joblib.load("budget_model.pkl")
MODEL = PACK["model"]
EMP_MAP = PACK["emp_map"]
CANONICAL = PACK["canonical"]

# -------- Helpers --------
def encode_inputs(age, gender, employment, income):
    g = 0 if str(gender).strip().lower() == "male" else 1
    e = EMP_MAP.get(str(employment).strip().lower(), 1)  # default employed
    x = np.array([[float(age), float(g), float(e), float(income)]], dtype=float)
    return x

def predict_base(age, gender, employment, income):
    """
    Returns a dict of canonical -> LKR amounts (non-negative, scaled to income if needed).
    """
    x = encode_inputs(age, gender, employment, income)
    pred = MODEL.predict(x)[0]  # absolute LKR per canonical
    # Guard: no negatives
    pred = np.clip(pred, 0, None)

    # Optional: If total > income, softly scale down; if total << income, keep as is.
    total = float(pred.sum())
    if total > 0 and total > income:
        pred = pred * (income / total)

    return {k: float(round(v, 2)) for k, v in zip(CANONICAL, pred)}

def map_to_user_categories(base_alloc, user_categories, historical_weights=None):
    """
    base_alloc: dict canonical->amount
    user_categories: list[str] (category names the user currently has)
    historical_weights: optional dict name->weight (0..1), used to weight discretionary split

    Returns dict user_category->LKR amount
    """
    # Case-insensitive match for canonical names → direct mapping
    canon_lower = {k.lower(): k for k in CANONICAL}
    user_lower = [c.lower().strip() for c in user_categories]

    # Start everyone at 0
    result = {name: 0.0 for name in user_categories}

    # 1) Direct matches
    matched = set()
    for ui, uname in enumerate(user_lower):
        if uname in canon_lower:
            k = canon_lower[uname]
            result[user_categories[ui]] += base_alloc.get(k, 0.0)
            matched.add(ui)

    # 2) Discretionary pool (Entertainment + Other)
    discretionary = base_alloc.get("Entertainment", 0.0) + base_alloc.get("Other", 0.0)

    # Unmatched custom categories
    unmatched_idxs = [i for i in range(len(user_categories)) if i not in matched]

    if unmatched_idxs:
        if historical_weights:
            # Normalize weights only for unmatched set
            weights = np.array([max(0.0, float(historical_weights.get(user_categories[i], 0.0))) for i in unmatched_idxs], dtype=float)
            s = weights.sum()
            if s <= 0:
                # fall back to equal split
                share = discretionary / len(unmatched_idxs)
                for i in unmatched_idxs:
                    result[user_categories[i]] += share
            else:
                weights = weights / s
                for w, i in zip(weights, unmatched_idxs):
                    result[user_categories[i]] += discretionary * float(w)
        else:
            # Equal split
            share = discretionary / len(unmatched_idxs) if len(unmatched_idxs) else 0.0
            for i in unmatched_idxs:
                result[user_categories[i]] += share

    # 3) Return rounded
    return {k: float(round(v, 2)) for k, v in result.items()}

# -------- Routes --------
@app.route("/", methods=["GET"])
def root():
    return "SmartSpend Budgeting API (no dependents) ✅"

@app.route("/recommend", methods=["POST"])
def recommend():
    """
    Expected JSON:
    {
      "age": 21,
      "income": 60000,
      "gender": "male",
      "employment": "student",
      "categories": ["Food","Rent","Groceries","Savings","Gym","CustomCat"],
      // optional:
      "historical_weights": {"Gym": 0.6, "CustomCat": 0.4}
    }
    """
    try:
        data = request.get_json(force=True) or {}
        age = int(data.get("age"))
        income = float(data.get("income") or data.get("monthly_income"))
        gender = data.get("gender", "male")
        employment = data.get("employment", "employed")
        categories = data.get("categories") or []  # list of strings
        hist = data.get("historical_weights") or None

        base = predict_base(age, gender, employment, income)

        if categories:
            mapped = map_to_user_categories(base, categories, hist)
            return jsonify({"recommendation": mapped, "base": base, "categories": categories})

        # If client didn’t send user categories, just return canonical
        return jsonify({"recommendation": base, "categories": CANONICAL})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    # Use 0.0.0.0 for device access; port 5050 to match your RN code
    app.run(host="0.0.0.0", port=5050, debug=True)
