# app.py
from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# ---- Load model pack --------------------------------------------------------
PACK = joblib.load("budget_model.pkl")
MODEL = PACK["model"]

# canonical output categories saved during training
CANONICAL = PACK.get(
    "canonical",
    ["Food","Transport","Housing","Utilities","Savings",
     "Entertainment","Healthcare","Education","Other"]
)

# Which input features the model expects (we saved this in the new trainer).
# Fallback to Age+Income if not present.
FEATURES = PACK.get("features", ["Age", "Income"])

# For older packs that used Employment, emp_map may exist; otherwise None.
EMP_MAP = PACK.get("emp_map", None)

def _num(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return float(default)

def build_feature_vector(payload):
    """
    Build X row (1 x n_features) in the exact order used to train.
    Supports:
      - ["Age","Income"]   (newer pack)
      - ["Age","Employment","Income"] (backward compatible)
    """
    vals = []
    for f in FEATURES:
        f_low = f.lower()
        if f_low == "age":
            vals.append(_num(payload.get("age", 0)))
        elif f_low == "income":
            vals.append(_num(payload.get("income", 0)))
        elif f_low == "employment":
            # If model expects Employment but request doesn't send it,
            # default to "employed" (1) when emp_map exists; else 1.0
            emp = str(payload.get("employment", "employed")).lower()
            if EMP_MAP is not None:
                vals.append(float(EMP_MAP.get(emp, 1)))
            else:
                vals.append(1.0)
        else:
            # any unknown feature -> 0
            vals.append(0.0)
    return np.array([vals], dtype=float)

@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "features": FEATURES,
        "canonical": CANONICAL
    })

@app.post("/recommend")
def recommend():
    data = request.get_json(force=True) or {}

    # basic validation
    age = _num(data.get("age", 0))
    income = _num(data.get("income", 0))
    if age <= 0 or income <= 0:
        return jsonify({"error": "age and income must be > 0"}), 400

    # Build feature vector based on what the model expects
    X = build_feature_vector(data)

    # Predict
    pred = MODEL.predict(X)[0]
    # clean: non-negative & round
    pred = np.maximum(pred, 0).tolist()
    pred = [round(v, 2) for v in pred]

    # Full recommendation for canonical categories
    full_rec = dict(zip(CANONICAL, pred))

    # If client passes a subset of categories, filter to those
    requested = data.get("categories")
    if isinstance(requested, list) and requested:
        # keep original case if provided; fallback to title case lookup
        out = {}
        canon_lower = {c.lower(): c for c in CANONICAL}
        for name in requested:
            key = canon_lower.get(str(name).lower())
            if key is not None:
                out[name] = full_rec[key]
        # if nothing matched, return full
        if out:
            return jsonify({"recommendation": out})
    return jsonify({"recommendation": full_rec})

if __name__ == "__main__":
    # start API server
    app.run(host="0.0.0.0", port=5050)
