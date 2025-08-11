import pandas as pd
from supabase_client import supabase

def fetch_profiles():
    response = supabase.table("users").select("id, age, monthly_income, gender, employment, dependents").execute()
    return pd.DataFrame(response.data)

def fetch_expenses_with_category_names():
    response = supabase.table("expenses").select("user_id, amount, category_id, categories(name)").execute()
    raw = pd.DataFrame(response.data)

    print("🔄 Raw response from Supabase:", raw.to_dict(orient="records"))

    # Ensure required fields exist and filter clean records
    if raw.empty:
        print("❌ No data returned from Supabase")
        return pd.DataFrame()

    required_fields = ["user_id", "amount", "categories"]
    raw = raw.dropna(subset=required_fields)
    
    # Extract category name
    raw["category"] = raw["categories"].apply(lambda x: x.get("name") if isinstance(x, dict) else None)
    raw = raw.dropna(subset=["category"])

    print("🔍 Cleaned expense columns:", raw.columns.tolist())
    print("🔍 Cleaned sample row:", raw.head(1).to_dict(orient="records"))

    return raw[["user_id", "category", "amount"]]

def prepare_training_data():
    print("🔄 Fetching from Supabase...")

    users_df = fetch_profiles()
    expenses_df = fetch_expenses_with_category_names()

    if users_df.empty or expenses_df.empty:
        print("⚠️ No user or expense data found.")
        return

    # Pivot expense data to get category-wise totals
    pivot = expenses_df.pivot_table(index="user_id", columns="category", values="amount", aggfunc="sum").fillna(0)
    pivot["total"] = pivot.sum(axis=1)

    # Add percentage columns
    for col in pivot.columns:
        if col != "total":
            pivot[col + "%"] = (pivot[col] / pivot["total"] * 100).round(1)

    # Merge user data with expenses
    merged = users_df.merge(pivot, left_on="id", right_on="user_id", how="inner")
    merged = merged.dropna(subset=["monthly_income", "age", "gender", "employment"])

    # Normalize categorical fields
    merged["Gender"] = merged["gender"].str.lower().map({"male": 0, "female": 1})
    merged["Employment"] = merged["employment"].str.lower().map({
        "unemployed": 0, "employed": 1, "student": 2
    })

    # Convert other fields
    merged["Income"] = pd.to_numeric(merged["monthly_income"], errors='coerce')
    merged["Age"] = pd.to_numeric(merged["age"], errors='coerce').astype(int)
    merged["Dependents"] = pd.to_numeric(merged["dependents"].fillna(0), errors='coerce').astype(int)

    features = ["Age", "Gender", "Income", "Employment", "Dependents"]
    targets = [col for col in merged.columns if col.endswith("%")]

    final_df = merged[features + targets]

    final_df.to_csv("real_training_data.csv", index=False)
    print("✅ Exported real_training_data.csv with", len(final_df), "rows.")

if __name__ == "__main__":
    prepare_training_data()
