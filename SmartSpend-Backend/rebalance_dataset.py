import argparse
import csv
from math import isfinite

# Columns we expect (exactly as in your file)
COLUMNS = [
    "Age","Income","Food","Transport","Housing","Utilities",
    "Entertainment","Savings","Healthcare","Education","Emergency"
]

CRITICAL = {"Food","Transport","Housing","Utilities","Healthcare","Education","Emergency"}
FLEX     = {"Entertainment","Savings"}  # we cap these first

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

def clamp(v, lo=None, hi=None):
    if lo is not None and v < lo: v = lo
    if hi is not None and v > hi: v = hi
    return v

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
    # Savings a bit higher for young, tighter after 30
    SAV_CAP = 0.25 if band=="young" else 0.20
    CAPS = {
        "Savings":       SAV_CAP,
        "Entertainment": 0.12,
        "Housing":       0.35,   # avoid oversized housing in training data
    }
    return FLOORS, CAPS

def rebalance_row(row):
    # parse
    age    = float(row["Age"])
    income = float(row["Income"])
    if income <= 0:
        return row  # nothing to do, keep as-is

    cats = {k: float(row[k]) for k in COLUMNS if k not in ("Age","Income")}
    # If any NaN, coerce to 0
    for k in list(cats.keys()):
        v = cats[k]
        cats[k] = v if isfinite(v) and v>=0 else 0.0

    # If total already equals income (± small tolerance), still apply light caps/floors to fix extremes
    FLOORS, CAPS = floors_caps(age)

    # 1) compute percentages
    cur_total = sum(cats.values())
    if cur_total <= 0:
        # build a minimal baseline from floors then scale by income
        base = {}
        for k in cats:
            base[k] = FLOORS.get(k, 0.0)
        # normalize to <= 1.0 (if floors exceed 1, scale down uniformly)
        s = sum(base.values())
        if s > 1.0:
            for k in base:
                base[k] /= s
        for k in base:
            cats[k] = rupees(base[k], income)
        return {**row, **{k: f"{cats[k]:.2f}" for k in cats}}

    # Convert to pct
    pr = {k: pct(cats[k], income) for k in cats}

    # 2) First, if sum(pr) far from 1, normalize lightly to keep shape
    s = sum(pr.values())
    if s > 0:
        for k in pr: pr[k] = pr[k] / s

    # 3) Apply floors
    for k, fl in FLOORS.items():
        pr[k] = max(pr.get(k, 0.0), fl)

    # 4) Apply caps
    for k, cap in CAPS.items():
        pr[k] = min(pr.get(k, 0.0), cap)

    # 5) Ensure total = 1.0 adjusting FLEX first then CRITICAL proportionally
    #    If sum > 1 -> trim (Savings/Entertainment first), else top-up (Critical first)
    s = sum(pr.values())

    def trim_amount(amount, groups):
        """Trim 'amount' from these groups proportionally to their current share."""
        if amount <= 0: return 0.0
        mass = sum(pr[g] for g in groups if g in pr and pr[g] > 0)
        if mass <= 0: return amount
        for g in groups:
            if pr.get(g, 0) <= 0: continue
            take = amount * (pr[g] / mass)
            pr[g] = max(0.0, pr[g] - take)
        return 0.0

    def topup_amount(amount, groups):
        """Add 'amount' to these groups proportionally to their current share (or evenly if all 0)."""
        if amount <= 0: return 0.0
        mass = sum(pr.get(g, 0) for g in groups)
        if mass <= 0:
            # even split
            each = amount / max(1, len(groups))
            for g in groups:
                pr[g] = pr.get(g,0)+each
            return 0.0
        for g in groups:
            share = pr.get(g, 0) / mass if mass>0 else 1.0/len(groups)
            pr[g] = pr.get(g,0) + amount * share
        return 0.0

    if s > 1.0:
        over = s - 1.0
        # trim Savings + Entertainment first
        over = trim_amount(over, FLEX)
        s = sum(pr.values())
        if s > 1.0:
            # still over? trim non-housing critical proportionally (keep floors)
            crits = [c for c in CRITICAL if c in pr]
            over = s - 1.0
            mass = sum(max(0.0, pr[c] - floors_caps(age)[0].get(c,0.0)) for c in crits)
            if mass > 0:
                for c in crits:
                    free = max(0.0, pr[c] - FLOORS.get(c,0.0))
                    take = over * (free / mass)
                    pr[c] = max(FLOORS.get(c,0.0), pr[c] - take)
    elif s < 1.0:
        need = 1.0 - s
        # top up critical first (esp. Food/Housing/Healthcare/Utilities)
        pri_crit = ["Food","Housing","Healthcare","Utilities","Transport","Education","Emergency"]
        topup_amount(need, [c for c in pri_crit if c in pr])

    # 6) Re-check caps (just in case top-up broke them)
    for k, cap in CAPS.items():
        if pr[k] > cap:
            diff = pr[k] - cap
            pr[k] = cap
            # spill the excess to critical
            topup_amount(diff, [c for c in CRITICAL if c in pr])

    # Tiny float drift normalize
    s = sum(pr.values())
    if s > 0:
        for k in pr:
            pr[k] /= s

    # 7) back to rupees
    for k in cats:
        cats[k] = rupees(pr.get(k, 0.0), income)

    out = {**row}
    for k in cats:
        out[k] = f"{cats[k]:.2f}"
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in",  dest="incsv",  required=True, help="Input CSV path")
    ap.add_argument("--out", dest="outcsv", required=True, help="Output CSV path")
    args = ap.parse_args()

    rows = []
    with open(args.incsv, "r", encoding="utf-8-sig") as f:
        rdr = csv.DictReader(f)
        # Validate columns
        if [c.strip() for c in rdr.fieldnames] != COLUMNS:
            raise SystemExit(f"CSV header must be exactly:\n{', '.join(COLUMNS)}")
        for r in rdr:
            rows.append(r)

    out_rows = []
    for r in rows:
        out_rows.append(rebalance_row(r))

    with open(args.outcsv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for r in out_rows:
            w.writerow(r)

    print(f"✅ Wrote balanced dataset -> {args.outcsv}")

if __name__ == "__main__":
    main()
