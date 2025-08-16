# app.py
from flask import Flask, request, jsonify
import joblib
import numpy as np

# ----------------------- Canonical Parents -----------------------
# Must match your model columns/order (per your CSV):
# Age,Income,Food,Transport,Housing,Utilities,Entertainment,Savings,Healthcare,Education,Emergency
CANONICAL_ORDER = [
    "Food",
    "Transport",
    "Housing",
    "Utilities",
    "Entertainment",
    "Savings",
    "Healthcare",
    "Education",
    "Emergency",
    "Other",  # convenience; model may not output this, we keep it in maps
]

# ------------------------ Keyword Mapping ------------------------
# 1) Exact/substring keywords -> canonical parent
# 2) We also do heuristic contains() matching below.
KEYWORD_MAP = {
    # Food
    "food": "Food", "groceries": "Food", "grocery": "Food", "supermarket": "Food",
    "restaurant": "Food", "dining": "Food", "eat out": "Food", "eating out": "Food",
    "snack": "Food", "coffee": "Food", "tea": "Food", "bakery": "Food", "lunch": "Food", "dinner": "Food",

    # Transport
    "transport": "Transport", "fuel": "Transport", "petrol": "Transport", "diesel": "Transport",
    "gas": "Transport", "taxi": "Transport", "uber": "Transport", "pickme": "Transport",
    "bus": "Transport", "train": "Transport", "parking": "Transport", "toll": "Transport",

    # Housing
    "rent": "Housing", "lease": "Housing", "mortgage": "Housing", "housing": "Housing",
    "apartment": "Housing", "furniture": "Housing", "home repair": "Housing",
    "repairs": "Housing", "maintenance": "Housing", "property tax": "Housing",

    # Utilities
    "utilities": "Utilities", "utility": "Utilities",
    "electricity": "Utilities", "power": "Utilities", "water": "Utilities",
    "internet": "Utilities", "wifi": "Utilities", "broadband": "Utilities",
    "phone": "Utilities", "mobile": "Utilities", "data": "Utilities",
    "gas bill": "Utilities", "sewer": "Utilities", "trash": "Utilities",

    # Entertainment
    "entertainment": "Entertainment", "movie": "Entertainment", "cinema": "Entertainment",
    "netflix": "Entertainment", "spotify": "Entertainment", "youtube": "Entertainment",
    "stream": "Entertainment", "streaming": "Entertainment", "games": "Entertainment",
    "gaming": "Entertainment", "hobby": "Entertainment", "gifts": "Entertainment",
    "party": "Entertainment", "shopping": "Entertainment", "apparel": "Entertainment",
    "clothes": "Entertainment", "clothing": "Entertainment", "subscriptions": "Entertainment",
    "subscription": "Entertainment", "gym": "Entertainment", "fitness": "Entertainment",
    "sport": "Entertainment", "sports": "Entertainment", "salon": "Entertainment",

    # Savings
    "savings": "Savings", "save": "Savings", "investment": "Savings",
    "invest": "Savings", "retirement": "Savings", "pf": "Savings", "fd": "Savings",

    # Healthcare
    "health": "Healthcare", "healthcare": "Healthcare", "medical": "Healthcare",
    "medicine": "Healthcare", "pharmacy": "Healthcare", "doctor": "Healthcare",
    "hospital": "Healthcare", "clinic": "Healthcare", "dental": "Healthcare",
    "dentist": "Healthcare", "vision": "Healthcare", "insur": "Healthcare",  # health insurance

    # Education
    "education": "Education", "school": "Education", "school fee": "Education",
    "school fees": "Education", "fees": "Education", "tuition": "Education",
    "course": "Education", "class": "Education", "classes": "Education",
    "lesson": "Education", "lessons": "Education", "stationery": "Education",
    "books": "Education",

    # Emergency / Buffer
    "emergency": "Emergency", "buffer": "Emergency", "rainy day": "Emergency",

    # Other (fallback group)
    "pet": "Other", "pets": "Other", "charity": "Other", "donation": "Other",
    "travel": "Other", "vacation": "Other", "flight": "Other", "hotel": "Other",
}

# If not matched anywhere, map to Other
DEFAULT_PARENT = "Other"

def guess_parent_canonical(name: str) -> str:
    n = (name or "").strip().lower()
    if not n:
        return DEFAULT_PARENT

    # 1) exact/near-exact key match
    if n in KEYWORD_MAP:
        return KEYWORD_MAP[n]

    # 2) contains heuristic (order matters a bit; keep specific words earlier)
    for k, parent in KEYWORD_MAP.items():
        if k in n:
            return parent

    return DEFAULT_PARENT

# ------------------------ Split Helpers -------------------------
def split_parent_amount(parent_amount: float, child_names, weights=None):
    """
    Split 'parent_amount' across 'child_names'.
    If 'weights' is provided as dict[name -> weight >= 0], use proportional split.
    Otherwise, split evenly.
    """
    if not child_names:
        return {}
    if weights:
        wsum = sum(max(0.0, float(weights.get(c, 0.0))) for c in child_names)
        if wsum > 0:
            return {c: parent_amount * (max(0.0, float(weights.get(c, 0.0))) / wsum) for c in child_names}
    each = parent_amount / len(child_names)
    return {c: each for c in child_names}

# ------------------------ Seed Policy ---------------------------
# When a canonical parent = 0 from the model but the user requested
# custom children under that parent, seed a small % of income from Savings.
# Essentials default to 0% (we won't auto-seed Food/Housing/Transport/Utilities).
SEED_PCT_BY_PARENT = {
    "Education": 0.02,       # 2% of income
    "Healthcare": 0.01,      # 1%
    "Entertainment": 0.01,   # 1%
    "Emergency": 0.03,       # 3% → ensures Emergency never stays at 0
    "Other": 0.005,          # 0.5%
    # Essentials will fall back to 0 unless you want otherwise:
    # "Food": 0.0, "Transport": 0.0, "Housing": 0.0, "Utilities": 0.0,
    # "Savings": 0.0
}

def seed_children_from_savings(parent_key, children, income_val, full_rec, requested):
    """
    Seed a parent whose model allocation is 0 by deducting from Savings.
    """
    if not children:
        return {}

    pct = SEED_PCT_BY_PARENT.get(parent_key, 0.0)
    if pct <= 0:
        # No seeding policy for this parent
        return {c: 0.0 for c in children}

    savings_key = "Savings" if "Savings" in full_rec else None
    savings_amt = float(full_rec.get(savings_key, 0.0)) if savings_key else 0.0
    if income_val <= 0 or savings_amt <= 0:
        return {c: 0.0 for c in children}

    seed_total = min(pct * income_val, savings_amt)
    if seed_total <= 0:
        return {c: 0.0 for c in children}

    each = seed_total / len(children)
    split = {c: float(round(each, 2)) for c in children}

    # Deduct from Savings and reflect if Savings was requested in payload
    full_rec[savings_key] = max(0.0, float(round(savings_amt - seed_total, 2)))
    for raw in (requested or []):
        if raw.lower() == savings_key.lower():
            # surface the new savings value into response
            # (the caller may or may not have included "Savings" explicitly)
            pass
    return split

# ------------------------ App & Model ---------------------------
app = Flask(__name__)
PACK = joblib.load("budget_model.pkl")
MODEL = PACK["model"]

# canonical outputs saved during training (fallback to the CSV-based list you shared)
CANONICAL = PACK.get(
    "canonical",
    ["Food","Transport","Housing","Utilities","Entertainment","Savings","Healthcare","Education","Emergency"]
)

FEATURES = PACK.get("features", ["Age", "Income"])
EMP_MAP = PACK.get("emp_map", None)  # optional legacy

def _num(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return float(default)

def build_feature_vector(payload):
    vals = []
    for f in FEATURES:
        f_low = f.lower()
        if f_low == "age":
            vals.append(_num(payload.get("age", 0)))
        elif f_low == "income":
            vals.append(_num(payload.get("income", 0)))
        elif f_low == "employment":
            emp = str(payload.get("employment", "employed")).lower()
            if EMP_MAP is not None:
                vals.append(float(EMP_MAP.get(emp, 1)))
            else:
                vals.append(1.0)
        else:
            vals.append(0.0)
    return np.array([vals], dtype=float)

@app.get("/health")
def health():
    return jsonify({"ok": True, "features": FEATURES, "canonical": CANONICAL})

@app.post("/recommend")
def recommend():
    data = request.get_json(force=True) or {}
    age = _num(data.get("age", 0))
    income = _num(data.get("income", 0))
    if age <= 0 or income <= 0:
        return jsonify({"error": "age and income must be > 0"}), 400

    # Optional: user-provided weights for child splits
    weights = data.get("weights")
    if not isinstance(weights, dict):
        weights = None

    # Model predict
    X = build_feature_vector(data)
    pred = MODEL.predict(X)[0]
    pred = np.maximum(pred, 0).tolist()
    pred = [round(v, 2) for v in pred]

    # Pack predictions in dict
    # Note: some packs may not include "Other" — we'll keep it at 0 unless present.
    full_rec = dict(zip(CANONICAL, pred))
    if "Other" not in full_rec:
        full_rec["Other"] = 0.0

    requested = data.get("categories")
    if not (isinstance(requested, list) and requested):
        # Return all canonical buckets if nothing specific requested
        return jsonify({"recommendation": full_rec})

    # Step 1: Separate explicit canonical vs custom
    canon_lower = {c.lower(): c for c in CANONICAL + (["Other"] if "Other" not in CANONICAL else [])}
    out = {}
    custom = []
    for raw in requested:
        key = canon_lower.get(str(raw).lower())
        if key is not None:
            out[raw] = float(full_rec.get(key, 0.0))
        else:
            custom.append(raw)

    if not custom:
        return jsonify({"recommendation": out})

    # Step 2: Group customs by inferred parent
    by_parent = {}
    for name in custom:
        parent = guess_parent_canonical(name)
        by_parent.setdefault(parent, []).append(name)

    # Step 3: For each parent, split parent allocation to its children
    for parent, children in by_parent.items():
        parent_key = parent if parent in full_rec else "Other"
        parent_amt = float(full_rec.get(parent_key, 0.0))

        if parent_amt <= 0:
            # Seed from Savings per policy (works for ANY parent per SEED_PCT_BY_PARENT)
            split = seed_children_from_savings(parent_key, children, income, full_rec, requested)
            for ch in children:
                out[ch] = float(round(split.get(ch, 0.0), 2))
            continue

        # Parent has money → split across children
        child_weights = {ch: weights.get(ch, 0.0) for ch in children} if weights else None
        split = split_parent_amount(parent_amt, children, child_weights)

        # Assign to children
        for ch in children:
            out[ch] = float(round(split.get(ch, 0.0), 2))

        # Deduct from the parent to conserve total
        allocated_sum = sum(split.values())
        full_rec[parent_key] = max(0.0, float(round(parent_amt - allocated_sum, 2)))

        # If user explicitly asked for this parent by name, surface the reduced value
        for raw in requested:
            if raw.lower() == parent_key.lower():
                out[raw] = full_rec[parent_key]

    # Optional: ensure Emergency never ends at 0 (even if not requested as a custom)
    if full_rec.get("Emergency", 0) <= 0 and "Emergency" in full_rec:
        # seed Emergency if zero using same policy
        seeded = seed_children_from_savings("Emergency", ["__tmp__"], income, full_rec, requested)
        bump = float(seeded.get("__tmp__", 0.0))
        full_rec["Emergency"] = bump  # keep canonical consistent
        if any(r.lower() == "emergency" for r in (requested or [])):
            out["Emergency"] = bump

    return jsonify({"recommendation": out})

# ------------------------ Main ------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
