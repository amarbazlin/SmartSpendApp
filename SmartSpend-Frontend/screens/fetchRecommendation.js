// screens/fetchRecommendation.js
import axios from 'axios';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import Constants from 'expo-constants';

const appExtra =
  (Constants?.expoConfig && Constants.expoConfig.extra) ||
  (Constants?.manifest2 && Constants.manifest2.extra) ||
  (Constants?.manifest && Constants.manifest.extra) ||
  {};

const AI_URL = 'https://0da41aa167cb.ngrok-free.app'; // Base URL for your Python/AI backend (no trailing slash)

/* ------------------------- session helper ------------------------- */
export const getCurrentUserId = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user?.id || null;
};

/* ------------------ effective budgeting income ------------------- */
/** Sum base users.monthly_income + this month's rows in `income` table (excluding BaseMonthly) */
export async function getBudgetingIncome(uid) {
  const { data: profile, error: pErr } = await supabase
    .from('users')
    .select('monthly_income, age')
    .eq('id', uid)
    .maybeSingle();
  if (pErr) throw pErr;

  const base = Number(profile?.monthly_income || 0);

  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayStr = firstDay.toISOString().slice(0, 10);

  const BASE_SOURCE = 'BaseMonthly';

  // Prefer logical date
  let { data: rows, error: iErr } = await supabase
    .from('income')
    .select('amount, date, created_at, source, note')
    .eq('user_id', uid)
    .gte('date', firstDayStr)
    .neq('source', BASE_SOURCE);
  if (iErr) throw iErr;

  // Fallback to created_at
  if (!rows || rows.length === 0) {
    const { data: rows2, error: iErr2 } = await supabase
      .from('income')
      .select('amount, created_at, source, note')
      .eq('user_id', uid)
      .gte('created_at', firstDayStr)
      .neq('source', BASE_SOURCE); // exclude baseline here too
    if (!iErr2 && rows2) rows = rows2;
  }

  const extra = (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  return { income: base + extra, age: profile?.age || null };
}

/* ----------------- this month spend weights by category ----------- */
/** Used by API to split canonical parents into custom children (e.g., Entertainment -> Shopping) */
async function getRecentSpendWeights(uid) {
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayStr = firstDay.toISOString().slice(0, 10);

  // Build a local map id -> name (for safety / fallback)
  const { data: catRows, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', uid)
    .eq('type', 'expense');
  if (catErr) throw catErr;
  const idToName = {};
  for (const c of catRows || []) idToName[c.id] = c.name;

  // Prefer joining the relation to read the category name
  const cols = 'amount, date, created_at, category_id, categories(name)';

  // Try filtering by logical `date` field first…
  let { data: rows, error } = await supabase
    .from('expenses')
    .select(cols)
    .eq('user_id', uid)
    .gte('date', firstDayStr);

  if (error) throw error;

  // …fallback to created_at if `date` is empty / unused in your data.
  if (!rows || rows.length === 0) {
    const { data: rows2, error: e2 } = await supabase
      .from('expenses')
      .select(cols)
      .eq('user_id', uid)
      .gte('created_at', firstDayStr);
    if (e2) throw e2;
    rows = rows2 || [];
  }

  // Aggregate spend per *category name*
  const weights = {};
  for (const r of rows) {
    const nameFromJoin = r?.categories?.name;        // via FK join
    const nameFromMap  = idToName?.[r?.category_id]; // via local map
    const name = (nameFromJoin || nameFromMap || '').trim();
    if (!name) continue;
    weights[name] = (weights[name] || 0) + Number(r.amount || 0);
  }

  return weights; // e.g. { Shopping: 12000, Food: 34000, ... }
}

/* ------------------- recommendation post-process ------------------ */
const norm = (s = '') => s.trim().toLowerCase();
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

// Essentials that must never be zero
const ESSENTIALS = ['Utilities', 'Food', 'Transport', 'Healthcare'];

function postProcessRecommendation({ rawRec, income, categories, age, weights }) {
  const userCats = (categories || []).map((c) => String(c));
  const names = new Set(userCats.map(norm));
  const out = {};

  // 1) Start with backend result
  for (const [k, v] of Object.entries(rawRec || {})) {
    const name = cap(k);
    out[name] = Number(v) || 0;
  }

  // 2) Ensure every user category exists
  for (const name of userCats) {
    const key = cap(name);
    if (out[key] === undefined) out[key] = 0;
  }

  // 3) Floors / Caps
  const floorsPct = { healthcare: 0.05, education: 0.03 }; // 5% / 3%
  const capsPct   = { savings: 0.20 };                      // <= 20% of income

  if (names.has('healthcare')) {
    const min = income * floorsPct.healthcare;
    if ((out['Healthcare'] || 0) < min) out['Healthcare'] = min;
  }
  if (names.has('education')) {
    const min = income * floorsPct.education;
    if ((out['Education'] || 0) < min) out['Education'] = min;
  }

  // 4) Cap Savings
  let freedFromSavings = 0;
  if (names.has('savings')) {
    const max = income * capsPct.savings;
    const before = out['Savings'] || 0;
    if (before > max) {
      out['Savings'] = max;
      freedFromSavings = before - max;
    }
  }

  // Helpers
  const sumAll = (o) => Object.values(o).reduce((s, v) => s + Number(v || 0), 0);
  const isTarget = (k) => {
    const kN = norm(k);
    // redistribute across ALL user categories except Savings/Buffer (if any)
    return names.has(kN) && kN !== 'savings' && kN !== 'buffer';
  };

  // 5) If over income, trim in a soft priority order
  let total = sumAll(out);
  if (total > income) {
    let excess = total - income;
    const trimOrder = ['Entertainment','Clothing','Utilities','Transport','Food','Education','Healthcare'];
    for (const key of trimOrder) {
      if (excess <= 0) break;
      if (!out[key]) continue;
      const take = Math.min(out[key], excess);
      out[key] -= take;
      excess -= take;
    }
    if (excess > 0) {
      const keys = Object.keys(out).filter((k) => out[k] > 0 && isTarget(k));
      const sum = keys.reduce((s, k) => s + out[k], 0);
      if (sum > 0) {
        for (const k of keys) {
          const take = Math.min(out[k], (out[k] / sum) * excess);
          out[k] -= take;
        }
      }
    }
  }

  // 6) Reallocate any money freed from Savings across targets (incl. customs)
  if (freedFromSavings > 0.01) {
    const targets = Object.keys(out).filter(isTarget);
    if (targets.length) {
      let w = {};
      let wsum = 0;
      if (weights && typeof weights === 'object') {
        const wLower = {};
        for (const [n, v] of Object.entries(weights)) wLower[n.toLowerCase()] = Number(v) || 0;
        for (const t of targets) {
          const v = wLower[norm(t)] || 0;
          w[t] = v; wsum += v;
        }
      }
      if (wsum <= 0) {
        for (const t of targets) { const v = Math.max(0, out[t] || 0); w[t] = v; wsum += v; }
      }
      if (wsum <= 0) {
        const each = freedFromSavings / targets.length;
        for (const t of targets) out[t] = (out[t] || 0) + each;
      } else {
        for (const t of targets) out[t] = (out[t] || 0) + (w[t] / wsum) * freedFromSavings;
      }
    }
  }

  // 7) If under income, top up NON Savings/Buffer proportionally
  total = sumAll(out);
  let leftover = income - total;
  if (leftover > 0.01) {
    const targets = Object.keys(out).filter(isTarget);
    if (targets.length) {
      const posSum = targets.reduce((s, k) => s + Math.max(0, out[k] || 0), 0);
      if (posSum > 0) {
        for (const k of targets) out[k] = (out[k] || 0) + (Math.max(0, out[k] || 0) / posSum) * leftover;
      } else {
        const each = leftover / targets.length;
        for (const k of targets) out[k] = (out[k] || 0) + each;
      }
    } else if (names.has('emergency')) {
      out['Emergency'] = (out['Emergency'] || 0) + leftover;
    }
  }

  // 8) Round all
  const rounded = {};
  for (const [k, v] of Object.entries(out)) rounded[k] = round2(v);

  // 9) Guarantee ESSENTIALS are never zero (set tiny floor 0.01 if present)
  //    Then rebalance by shaving the added tiny amount from non-essential buckets.
  const MIN_FLOOR = 0.01; // non-zero, minimal
  let added = 0;
  const essentialsPresent = ESSENTIALS.filter(k => rounded[k] !== undefined && names.has(norm(k)));
  for (const k of essentialsPresent) {
    if (rounded[k] < MIN_FLOOR) {
      const bump = MIN_FLOOR - rounded[k];
      rounded[k] = MIN_FLOOR;
      added += bump;
    }
  }

  if (added > 0) {
    // take from non-essentials proportionally, preferring Savings/Entertainment if present
    const donorsPref = ['Savings','Entertainment','Housing','Education','Emergency'];
    let remaining = added;

    // 9a) try preferred donors first
    for (const d of donorsPref) {
      if (remaining <= 0) break;
      const val = rounded[d] || 0;
      const give = Math.min(val, remaining);
      if (give > 0) {
        rounded[d] = round2(val - give);
        remaining = round2(remaining - give);
      }
    }

    // 9b) if still remaining, shave proportionally from all other non-essentials with positive amounts
    if (remaining > 0.0001) {
      const donorKeys = Object.keys(rounded).filter(
        (k) => !ESSENTIALS.includes(k) && (rounded[k] || 0) > 0
      );
      const donorSum = donorKeys.reduce((s, k) => s + (rounded[k] || 0), 0);
      if (donorSum > 0) {
        for (const k of donorKeys) {
          if (remaining <= 0) break;
          const share = (rounded[k] / donorSum) * remaining;
          const take = Math.min(rounded[k], share);
          rounded[k] = round2(rounded[k] - take);
        }
      }
    }
  }

  // 10) Final tiny remainder correction back into Emergency (or first key)
  const after = Object.values(rounded).reduce((s, v) => s + v, 0);
  const rem = round2(income - after);
  if (Math.abs(rem) >= 0.01) {
    const bumpPref = ['Emergency','Food','Transport','Utilities','Education','Entertainment','Healthcare'];
    const bumpKey = bumpPref.find((k) => rounded[k] !== undefined && names.has(norm(k))) || Object.keys(rounded)[0];
    rounded[bumpKey] = round2((rounded[bumpKey] || 0) + rem);
  }

  return rounded;
}

/* ---------------------- main: fetchRecommendation ----------------- */
export const fetchRecommendation = async () => {
  try {
    const uid = await getCurrentUserId();
    if (!uid) {
      Alert.alert('Please log in first.');
      return null;
    }

    const { income, age } = await getBudgetingIncome(uid);
    if (!(income > 0)) {
      Alert.alert('Income missing', 'Please add your income first.');
      return null;
    }

    // pull user's expense categories (names)
    const { data: cats, error: cErr } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', uid)
      .eq('type', 'expense');
    if (cErr) throw cErr;
    const categoryNames = (cats || []).map((c) => c.name);

    // this month's spend weights (helps split parent -> custom children)
    const weights = await getRecentSpendWeights(uid);

    // Call AI service
    const res = await axios.post(
      `${AI_URL}/recommend`,
      { age, income, categories: categoryNames, weights },
      { timeout: 15000 }
    );

    const recRaw = res.data?.recommendation;
    if (!recRaw) {
      Alert.alert('AI error', 'No recommendation returned.');
      return null;
    }

    // Post-process: floors, caps, non-zero essentials, rounding
    const rec = postProcessRecommendation({
      rawRec: recRaw,
      income,
      categories: categoryNames,
      age,
      weights,
    });

    // Persist to Supabase
    await Promise.all(
      Object.entries(rec).map(([name, amount]) =>
        supabase
          .from('categories')
          .update({ limit_: Number(amount) })
          .eq('user_id', uid)
          .eq('name', name)
          .eq('type', 'expense')
      )
    );

    return rec;
  } catch (e) {
    console.log('fetchRecommendation error:', e);
    Alert.alert('Failed', e.message || 'Unknown error.');
    return null;
  }
};
