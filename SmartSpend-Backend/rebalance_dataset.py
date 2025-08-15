import argparse
import csv
from math import isfinite

# Columns we expect (exactly as in your file)
COLUMNS = [
    "Age","Income","Food","Transport","Housing","Utilities",
    "Entertainment","Savings","Healthcare","Education","Emergency"
]

ESSENTIALS = ["Food","Housing","Healthcare","Utilities","Transport"]
CRITICAL   = {"Food","Transport","Housing","Utilities","Healthcare","Education","Emergency"}
FLEX       = {"Entertainment","Savings"}  # trimmed first

def pct(x, income):
    if income <= 0: return 0.0
    try:
        v = float(x)
        if not isfinite(v): return 0.0
        return max(0.0, v / income)
    except:
        return 0.0

def rupees(p, income):
    return round(max(0.0, p) * income, 2)

def age_band(age):
    a = int(round(float(age)))
    if a <= 30: return "young"
    if a <= 55: return "mid"
    return "old"

def floors_caps(age):
    band = age_band(age)

    # Floors (as % of income) – light but realistic
    edu_floor = 0.03 if int(float(age)) <= 30 else 0.00
    health_floor = 0.04 if band=="young" else (0.06 if band=="mid" else 0.08)

    FLOORS = {
        "Food":        0.18,    # >= 18%
        "Transport":   0.06,    # >= 6%
        "Utilities":   0.05,    # >= 5%
        "Healthcare":  health_floor,
        "Education":   edu_floor,
        "Emergency":   0.03     # >= 3%
    }

    # Caps (as % of income)
    SAV_CAP = 0.25 if band=="young" else 0.20
    CAPS = {
        "Savings":       SAV_CAP,
        "Entertainment": 0.12,
        "Housing":       0.35,
    }
    return FLOORS, CAPS

def rebalance_row(row, target_sav=0.17, min_target=0.15, max_target=0.20):
    changed = False

    age    = float(row["Age"])
    income = float(row["Income"])
    if income <= 0:
        return row, changed  # nothing to do

    cats = {k: float(row[k]) for k in COLUMNS if k not in ("Age","Income")}
    # coerce bad values to 0
    for k in list(cats.keys()):
        v = cats[k]
        cats[k] = v if isfinite(v) and v>=0 else 0.0

    FLOORS, CAPS = floors_caps(age)

    # Convert to pct of income
    pr = {k: pct(cats[k], income) for k in cats}
    s = sum(pr.values())
    if s > 0:
        for k in pr: pr[k] = pr[k] / s  # light normalization

    # --- NEW: Force Savings into target band (default 17%, clamped 15–20%) ---
    forced_target = max(min_target, min(max_target, float(target_sav)))
    before_sav = pr.get("Savings", 0.0)
    pr["Savings"] = min(forced_target, CAPS["Savings"])  # respect age-based cap
    if abs(pr["Savings"] - before_sav) > 1e-9:
        changed = True
    # -----------------------------------------------------------------------

    # Apply floors for critical
    for k, fl in FLOORS.items():
        if pr.get(k, 0.0) < fl:
            pr[k] = fl
            changed = True

    # Apply caps
    for k, cap in CAPS.items():
        if pr.get(k, 0.0) > cap:
            pr[k] = cap
            changed = True

    # Balance to 1.0 (trim FLEX first, then top-up CRITICAL)
    def total():
        return sum(pr.values())

    def trim_from(groups, amount):
        if amount <= 0: return
        pool = sum(pr.get(g,0) for g in groups)
        if pool <= 0: return
        for g in groups:
            share = pr.get(g,0)/pool if pool>0 else 0
            pr[g] = max(0.0, pr.get(g,0) - amount*share)

    def add_to(groups, amount):
        if amount <= 0: return
        pool = sum(pr.get(g,0) for g in groups)
        if pool <= 0:
            # even split
            each = amount / max(1, len(groups))
            for g in groups:
                pr[g] = pr.get(g,0) + each
            return
        for g in groups:
            share = pr.get(g,0)/pool
            pr[g] = pr.get(g,0) + amount*share

    s = total()
    if s > 1.0:
        trim_from(FLEX, s-1.0)
        s = total()
        if s > 1.0:
            # trim critical above floors
            over = s-1.0
            free_pool = sum(max(0.0, pr[c]-FLOORS.get(c,0.0)) for c in CRITICAL)
            if free_pool > 0:
                for c in CRITICAL:
                    free = max(0.0, pr[c]-FLOORS.get(c,0.0))
                    take = over * (free/free_pool)
                    pr[c] = max(FLOORS.get(c,0.0), pr[c]-take)
    elif s < 1.0:
        # Top-up essentials first
        add_to(ESSENTIALS, 1.0 - s)

    # Re-check caps after top-up
    for k, cap in CAPS.items():
        if pr.get(k,0.0) > cap:
            spill = pr[k] - cap
            pr[k] = cap
            add_to(ESSENTIALS, spill)

    # Final normalize (tiny drift)
    s = total()
    if s > 0:
        for k in pr: pr[k] /= s

    # Back to rupees
    for k in cats:
        cats[k] = rupees(pr.get(k, 0.0), income)

    out = {**row}
    for k in cats:
        # keep 2dp strings like your file
        new_val = f"{cats[k]:.2f}"
        if new_val != row[k]:
            changed = True
        out[k] = new_val
    return out, changed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input",  dest="incsv",  required=True, help="Input CSV path")
    ap.add_argument("--output", dest="outcsv", required=True, help="Output CSV path")
    ap.add_argument("--target-savings", type=float, default=0.17,
                    help="Target savings rate (0.15–0.20 recommended). Default 0.17")
    args = ap.parse_args()

    rows = []
    with open(args.incsv, "r", encoding="utf-8-sig") as f:
        rdr = csv.DictReader(f)
        # Strict header check
        if [c.strip() for c in rdr.fieldnames] != COLUMNS:
            raise SystemExit(f"CSV header must be exactly:\n{', '.join(COLUMNS)}")
        for r in rdr:
            rows.append(r)

    out_rows = []
    changed_count = 0
    for r in rows:
        out, changed = rebalance_row(r, target_sav=args.target_savings)
        out_rows.append(out)
        if changed: changed_count += 1

    with open(args.outcsv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for r in out_rows:
            w.writerow(r)

    print(f"✅ Wrote balanced dataset -> {args.outcsv}")
    print(f"   Rows changed: {changed_count}/{len(rows)}")

if __name__ == "__main__":
    main()
