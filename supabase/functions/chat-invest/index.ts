// supabase/functions/chat-invest/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- env ----
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY")!;

// Admin client (server-side reads)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------- utils ----------
function startOfMonthISO() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2,"0")}-01`;
}
const lkr = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

// ---------- data loaders ----------
async function loadProfile(uid: string) {
  const { data } = await admin
    .from("users")
    .select("monthly_income, age")
    .eq("id", uid)
    .maybeSingle();

  return {
    monthly_income: Number((data as any)?.monthly_income || 0),
    age: (data as any)?.age ?? null,
  };
}

async function loadIncomeThisMonth(uid: string) {
  const first = startOfMonthISO();
  // prefer the "date" field, fallback to created_at
  let { data } = await admin
    .from("income")
    .select("amount, date, created_at")
    .eq("user_id", uid)
    .gte("date", first);

  if (!data?.length) {
    ({ data } = await admin
      .from("income")
      .select("amount, date, created_at")
      .eq("user_id", uid)
      .gte("created_at", first));
  }
  return (data || []).reduce((s: number, r: any) => s + Number(r?.amount || 0), 0);
}

async function loadBudgets(uid: string) {
  const { data } = await admin
    .from("categories")
    .select("name, type, limit_")
    .eq("user_id", uid)
    .eq("type", "expense");

  const out: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    const name = String(r?.name || "").trim();
    if (name) out[name] = Number(r?.limit_ || 0);
  });
  return out;
}

async function loadMtdActuals(uid: string) {
  const first = startOfMonthISO();
  let { data } = await admin
    .from("expenses")
    .select("amount, date, created_at, categories(name)")
    .eq("user_id", uid)
    .gte("date", first);

  if (!data?.length) {
    ({ data } = await admin
      .from("expenses")
      .select("amount, date, created_at, categories(name)")
      .eq("user_id", uid)
      .gte("created_at", first));
  }

  const byCat: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    const cat = r?.categories?.name ?? "Uncategorized";
    byCat[cat] = (byCat[cat] || 0) + Number(r?.amount || 0);
  });
  return byCat;
}

async function load90dTotal(uid: string) {
  const d90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  const { data } = await admin
    .from("expenses")
    .select("amount, created_at")
    .eq("user_id", uid)
    .gte("created_at", d90);
  return (data || []).reduce((s: number, r: any) => s + Number(r?.amount || 0), 0);
}

// ---------- rules ----------
const DISCRETIONARY = new Set(["Entertainment","Eating Out","Shopping","Clothing","Travel","Gifts"]);
const SEMI_FLEX = new Set(["Transport","Groceries","Food"]);

function computeRules(
  incomeEffective: number,
  mtd: number,
  exp90: number,
  budgets: Record<string, number>,
  actuals: Record<string, number>
) {
  const avgMonth = exp90 ? exp90 / 3 : mtd;
  const emergency = Math.max(0, avgMonth * 3);

  let savingsBudget = 0;
  for (const [k, v] of Object.entries(budgets)) {
    if (k.trim().toLowerCase() === "savings") {
      savingsBudget = Number(v || 0);
      break;
    }
  }
  const savingsTarget = incomeEffective > 0
    ? savingsBudget || Math.max(0, 0.18 * incomeEffective)
    : savingsBudget;

  const cuts: any[] = [];
  for (const [name, planned] of Object.entries(budgets)) {
    const actual = Number(actuals[name] || 0);
    if (planned > 0 && actual > planned) {
      const suggest = Math.min(0.15 * planned, actual - planned);
      const tip = (name === "Food" || name === "Eating Out")
        ? "Set a weekly cap & mid-week review"
        : "Enable alerts and use price anchors";
      cuts.push({ category: name, amount_lkr: Math.round(suggest * 100) / 100, tip });
    }
  }
  if (!cuts.length) {
    for (const [name, val] of Object.entries(actuals).sort((a, b) => Number(b[1]) - Number(a[1]))) {
      if (DISCRETIONARY.has(name) || SEMI_FLEX.has(name)) {
        cuts.push({
          category: name,
          amount_lkr: Math.round(0.1 * Number(val) * 100) / 100,
          tip: "Micro-cut 10% via price anchors",
        });
      }
      if (cuts.length >= 5) break;
    }
  }

  return {
    emergency_buffer_lkr: emergency,
    monthly_savings_target_lkr: savingsTarget,
    cut_candidates: cuts.slice(0, 5),
  };
}

function buildPrompt(
  userQ: string,
  incomeEffective: number,
  budgets: Record<string, number>,
  actuals: Record<string, number>,
  rules: any,
  targetLang = "English"
) {
  const bLines =
    Object.entries(budgets)
      .map(([k, v]) => `- ${k}: planned ${lkr(v)}, actual ${lkr(actuals[k] || 0)}`)
      .join("\n") || "- (no budgets)";

  return `
System: You are SmartSpend’s financial assistant for Sri Lankan users.
Always use LKR, be conservative and actionable. Use the user's budgets and month-to-date actuals.
If a number is missing, ask for it — never make one up.

Answer in: ${targetLang}

User question:
${userQ}

Financial snapshot (authoritative)
- Estimated monthly income to use: ${lkr(incomeEffective)}

Budgets (this month)
${bLines}

Rule layer
- Emergency buffer target: ${lkr(rules.emergency_buffer_lkr)}
- Monthly savings target: ${lkr(rules.monthly_savings_target_lkr)}
- Cut candidates: ${JSON.stringify(rules.cut_candidates)}

Return:
1) A friendly, step-by-step answer tailored to these budgets and actuals.
2) A JSON block named SUGGESTIONS with:
{
  "monthly_savings_target_lkr": number,
  "emergency_buffer_lkr": number,
  "category_cuts": [{"category": string, "amount_lkr": number, "tip": string}],
  "investment_outline": [{"option": string, "rationale": string}]
}
Keep options accessible/low-complexity for Sri Lanka (buffer first; conservative instruments). No promises of returns.
`.trim();
}

function extractSuggestions(text: string) {
  const m = text.match(/SUGGESTIONS[\s\S]*?({[\s\S]*?})/i);
  if (!m) return {};
  try { return JSON.parse(m[1]); } catch { return {}; }
}

// ---------- HTTP handler ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const body: any = await req.json().catch(() => ({}));
    const targetLang: string = String(body?.targetLang || "English");
    const userMessage: string =
      (Array.isArray(body?.messages) ? body.messages : [])
        .reverse()
        .find((m: any) => m?.role === "user")?.content ||
      "Advise me on saving and investing this month.";

    // Resolve user id from auth (preferred) or explicit body.userId
    let uid: string = String(body?.userId || "");
    if (!uid) {
      const auth = req.headers.get("Authorization") || "";
      if (auth.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const anonKey = req.headers.get("apikey") || undefined;
        const client = createClient(SUPABASE_URL, anonKey ?? SERVICE_ROLE, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data } = await client.auth.getUser();
        uid = data.user?.id || "";
      }
    }
    if (!uid) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Load data
    const [profile, incomeMTD, budgets, actuals, exp90] = await Promise.all([
      loadProfile(uid),
      loadIncomeThisMonth(uid),
      loadBudgets(uid),
      loadMtdActuals(uid),
      load90dTotal(uid),
    ]);

    // *** KEY FIX: choose ONE income source (no double-counting) ***
    const baseIncome = Number((profile as any).monthly_income || 0);
    const incomeEffective = incomeMTD > 0 ? incomeMTD : baseIncome;
    const incomeSource = incomeMTD > 0 ? "income_table_mtd" : "users.monthly_income";

    const mtdTotal = Object.values(actuals).reduce((s, v) => s + (Number(v) || 0), 0);
    const rules = computeRules(incomeEffective, mtdTotal, exp90, budgets, actuals);

    // --- Gemini ---
    const prompt = buildPrompt(userMessage, incomeEffective, budgets, actuals, rules, targetLang);

    const model = "gemini-1.5-flash";
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } };

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const gemJson: any = await gemRes.json();

    let text = "";
    try {
      const cand = gemJson?.candidates?.[0];
      const parts = cand?.content?.parts;
      if (Array.isArray(parts)) text = parts.map((p: any) => p?.text).filter(Boolean).join("\n").trim();
    } catch {}
    if (!text) text = gemJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      const reason =
        gemJson?.candidates?.[0]?.finishReason ||
        gemJson?.promptFeedback?.blockReason ||
        gemJson?.error?.message ||
        "unknown";
      text = `I couldn't generate a reply just now (reason: ${reason}). Try rephrasing your question or ask for a savings plan for this month.`;
    }

    const suggestions = extractSuggestions(text);
    const displayText = (text || "")
      .replace(/```json[\s\S]*?```/gi, "")
      .replace(/\*\*SUGGESTIONS:\*\*[\s\S]*$/i, "")
      .trim();

    return new Response(
      JSON.stringify({
        message: displayText,
        suggestions,
        snapshot: {
          income_source: incomeSource,
          income_effective: incomeEffective,     // <= the value used (either MTD or base)
          income_base: baseIncome,
          income_mtd: incomeMTD,
          budgets,
          actuals_mtd: actuals,
          rules,
        },
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
