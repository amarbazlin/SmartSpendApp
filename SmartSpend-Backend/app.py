from flask import Flask, request, jsonify
import joblib
import os
from supabase import create_client
import google.generativeai as genai
from dotenv import load_dotenv
import numpy as np
import re

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = Flask(__name__)

# ML model
PACK = joblib.load("budget_model.pkl")
MODEL = PACK["model"]
FEATURES = PACK.get("features", ["Age", "Income"])


def _num(v, default=0.0):
    try:
        return float(v)
    except:
        return float(default)


# ---------- Clean response ----------
def clean_response(text: str) -> str:
    if not text:
        return ""

    out = str(text)

    # Remove code blocks
    out = re.sub(r"```[\s\S]*?```", "", out)
    out = re.sub(r"~~~[\s\S]*?~~~", "", out)
    out = re.sub(r"`([^`]+)`", r"\1", out)

    # Remove disclaimers / unwanted
    ban = [
        "not financial advice",
        "educational purposes",
        "consult a financial advisor",
        "general guidance",
        "json format",
        "benchmark",
        "assuming",
    ]
    out = "\n".join(
        line for line in out.splitlines()
        if not any(b.lower() in line.lower() for b in ban)
    )

    # Normalize bullets/numbers
    out = re.sub(r"^\s*[-*•]\s*", "- ", out, flags=re.M)
    out = re.sub(r"^\s*\d+\s*[\)\.]\s+", lambda m: f"{m.group(0).strip('.) ')}. ", out, flags=re.M)

    # Convert markdown headings into proper ## format
    out = re.sub(r"(?m)^#+\s*(.+)", r"## \1", out)
    out = re.sub(r"(?m)^Step\s*(\d+)", r"## Step \1", out)

    # Bold Rs + %
    out = re.sub(r"\b(?:LKR|Rs\.?)\s?\d[\d,]*(?:\.\d+)?\b",
                 lambda m: f"**{m.group(0)}**", out)
    out = re.sub(r"\b\d{1,3}(?:\.\d+)?\s?%\b",
                 lambda m: f"**{m.group(0)}**", out)

    # Compact blank lines
    out = re.sub(r"\n{3,}", "\n\n", out)

    return out.strip()


# ---------- Invalid input check ----------
def is_invalid_message(msg: str) -> bool:
    if not msg.strip():
        return True
    cleaned = re.sub(r"[^\w\s]", "", msg).strip()
    return len(cleaned) == 0


# ---------- Finance intent check ----------
FINANCE_KEYWORDS = [
    "save", "saving", "savings",
    "invest", "investment", "investing",
    "expense", "spending", "budget", "debt",
    "income", "salary", "loan", "finance", "financial",
    "target", "goal", "money",
    "මුදල්", "ඉතුරුම්", "ඉතුරුම් කිරීම", "වැය", "වියදම්",
    "ඇණවුම්", "ආදායම", "කැපවීම්", "වාරික", "ගෙවීම්", "ණය",
    "பணம்", "சம்பளம்", "சேமிப்பு", "முதலீடு", "செலவு",
    "பட்ஜெட்", "கடன்", "வருவாய்", "நிதி", "சம்பாதி"
]

def is_off_topic(msg: str) -> bool:
    text = msg.lower()
    return not any(word in text for word in FINANCE_KEYWORDS)


@app.post("/chatbot")
def chatbot():
    data = request.get_json(force=True)
    user_id = data.get("user_id")
    user_msg = (data.get("message") or "").strip()

    if not user_id:
        return jsonify({"message": "⚠️ No user ID provided."})

    if is_invalid_message(user_msg):
        return jsonify({
            "message": (
                "❌ I am unable to respond to this type of message.\n\n"
                "👉 Please ask a question related to **finance**, such as:\n"
                "- Savings\n"
                "- Investment advice\n"
                "- Financial planning"
            )
        })

    if is_off_topic(user_msg):
        return jsonify({
            "message": (
                "❌ Sorry, I can only help with **finance-related questions**.\n\n"
                "👉 Try asking about:\n"
                "- Savings target\n"
                "- Investments\n"
                "- Spending cuts\n"
                "- Budgeting"
            )
        })

    # -------------------------
    # 1. Fetch user profile
    # -------------------------
    user_row = supabase.table("users").select(
        "id, age, monthly_income").eq("id", user_id).execute()
    age = _num(user_row.data[0].get("age", 0)) if user_row.data else 0
    main_income = _num(user_row.data[0].get("monthly_income", 0)) if user_row.data else 0

    # -------------------------
    # 2. Fetch other tables
    # -------------------------
    income_records = supabase.table("income").select("*").eq("user_id", user_id).execute().data or []
    expense_records = supabase.table("expenses").select("*").eq("user_id", user_id).execute().data or []
    accounts = supabase.table("accounts").select("*").eq("user_id", user_id).execute().data or []
    transactions = supabase.table("transactions").select("*").eq("user_id", user_id).execute().data or []
    sms_records = supabase.table("sms_records").select("*").eq("user_id", user_id).execute().data or []
    categories = supabase.table("categories").select("*").eq("user_id", user_id).execute().data or []

    category_lookup = {cat["id"]: cat.get("name", "Other") for cat in categories}

    income_breakdown = {"main_income": main_income, "extras": [], "total": main_income}
    for inc in income_records:
        if inc.get("source") == "BaseMonthly":
            continue
        amt = _num(inc.get("amount", 0))
        income_breakdown["extras"].append({"source": inc.get("source", "Other"), "amount": amt})
        income_breakdown["total"] += amt

    expense_breakdown = {"items": [], "total": 0.0}
    for exp in expense_records:
        amt = _num(exp.get("amount", 0))
        cat_id = exp.get("category_id")
        cat_name = category_lookup.get(cat_id, exp.get("name", "Other"))
        expense_breakdown["items"].append({"name": cat_name, "amount": amt})
        expense_breakdown["total"] += amt

    total_income = income_breakdown["total"]
    total_expenses = expense_breakdown["total"]
    savings = total_income - total_expenses
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0

    bm_rows = supabase.table("benchmarks").select("*").execute().data or []
    best_row, best_diff = None, float("inf")
    for row in bm_rows:
        diff = abs(total_income - _num(row.get("mean_income")))
        if diff < best_diff:
            best_row, best_diff = row, diff
    benchmark = best_row or {}
    typical_rate = _num(benchmark.get("savings_rate", 7))

    try:
        pred_input = np.array([[age, total_income]])
        pred_savings = float(MODEL.predict(pred_input)[0])
    except Exception:
        pred_savings = None

    user_has_data = (
        total_income > 0 or total_expenses > 0 or accounts or transactions or sms_records or categories
    )

    if not user_has_data:
        fallback_prompt = f"""
        You are SmartSpend’s Finance Assistant 🤖💰.

        The user asked: "{user_msg}"
        """
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            resp = model.generate_content([fallback_prompt])
            return jsonify({"message": clean_response(resp.text), "grounding_used": {"benchmark": benchmark}})
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                return jsonify({
                    "message": "⚠️ Sorry, the daily request limit has been reached for the Finance Assistant. "
                               "Please try again tomorrow or upgrade the Gemini API plan."
                }), 429
            return jsonify({"message": "⚠️ Something went wrong while processing your request."}), 500

    grounding = {
        "age": age,
        "income": income_breakdown,
        "expenses": expense_breakdown,
        "accounts": accounts,
        "transactions": transactions,
        "sms_records": sms_records,
        "categories": categories,
        "savings": savings,
        "savings_rate": savings_rate,
        "benchmark": benchmark,
        "model_suggestion": pred_savings,
    }

    exp_list = "\n".join(
        [f"- {item['name']}: Rs. {item['amount']}" for item in expense_breakdown["items"]]
    ) if expense_breakdown["items"] else "No detailed expense items available."

    prompt = f"""
    You are SmartSpend’s friendly Finance Assistant 🤖💰.

    The user has asked: "{user_msg}"
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content([prompt])
        return jsonify({"message": clean_response(resp.text), "grounding_used": grounding})
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower():
            return jsonify({
                "message": "⚠️ Sorry, the daily request limit has been reached for the Finance Assistant. "
                           "Please try again tomorrow or upgrade the Gemini API plan."
            }), 429
        return jsonify({"message": "⚠️ Something went wrong while processing your request."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
