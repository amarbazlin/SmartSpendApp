// fetchRecommendation.js
import axios from 'axios';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

const AI_URL = 'http://172.20.10.2:5050'; // keep whatever you already use

/* ------------------------- session helper ------------------------- */
export const getCurrentUserId = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user?.id || null;
};

/* ------------------ effective budgeting income ------------------- */
/** Sum base users.monthly_income + this month's rows in `income` table */
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

  // If your table uses created_at instead of date, the fallback below will catch it.
  let { data: rows, error: iErr } = await supabase
    .from('income')
    .select('amount, date, created_at')
    .eq('user_id', uid)
    .gte('date', firstDayStr);

  if (iErr) throw iErr;

  if (!rows || rows.length === 0) {
    const { data: rows2, error: iErr2 } = await supabase
      .from('income')
      .select('amount, created_at')
      .eq('user_id', uid)
      .gte('created_at', firstDayStr);
    if (!iErr2 && rows2) rows = rows2;
  }

  const extra = (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  return { income: base + extra, age: profile?.age || null };
}

/* ------------------- recommendation post-process ------------------ */
const norm = (s = '') => s.trim().toLowerCase();
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

function postProcessRecommendation({
  rawRec,               // AI rec object e.g. { Food: 20000, ... }
  income,               // effective monthly income
  categories,           // array of existing category names
  age,                  // from users table (if you use it)
}) {
  const names = new Set(categories.map(norm));
  const out = {};

  // Normalize keys -> Title Case and ensure numeric
  for (const [k, v] of Object.entries(rawRec || {})) {
    const name = cap(k);
    out[name] = Number(v) || 0;
  }

  // ---- Floors (only if category exists) --------------------------
  // You can tune these:
  const floors = {
    healthcare: 0.05,    // 5%
    education : 0.03,    // 3% (bump to 5% if student — adjust on your side if needed)
  };

  // Example: if you stored employment status “student” you could bump education:
  // if (norm(employment) === 'student') floors.education = Math.max(floors.education, 0.05);

  if (names.has('healthcare')) {
    const min = income * floors.healthcare;
    if ((out['Healthcare'] || 0) < min) out['Healthcare'] = min;
  }
  if (names.has('education')) {
    const min = income * floors.education;
    if ((out['Education'] || 0) < min) out['Education'] = min;
  }

  // ---- If AI didn’t include a present category at all, give it tiny seed ----
  ['Food','Transport','Utilities','Savings','Entertainment','Clothing','Healthcare','Education','Emergency','Buffer']
    .forEach((n) => {
      if (names.has(norm(n)) && out[n] === undefined) out[n] = 0;
    });

  // ---- Rounding + make sure we don't exceed income after floors ----
  let total = Object.values(out).reduce((s, v) => s + Number(v || 0), 0);

  if (total > income) {
    // Trim in this order: Savings -> Entertainment -> Clothing -> Buffer -> Other flexy buckets
    const trimOrder = ['Savings','Entertainment','Clothing','Buffer'];
    let excess = total - income;

    for (const key of trimOrder) {
      if (excess <= 0) break;
      if (out[key] > 0) {
        const take = Math.min(out[key], excess);
        out[key] -= take;
        excess -= take;
      }
    }
    // If still excess, proportionally reduce all positive buckets (safety)
    if (excess > 0) {
      const posKeys = Object.keys(out).filter((k) => out[k] > 0);
      const posSum = posKeys.reduce((s, k) => s + out[k], 0);
      for (const k of posKeys) {
        const take = Math.min(out[k], (out[k] / posSum) * excess);
        out[k] -= take;
      }
    }
  }

  // ---- Sweep leftover to Savings/Emergency/Buffer so totals == income ----
  total = Object.values(out).reduce((s, v) => s + Number(v || 0), 0);
  let leftover = income - total;

  // Split leftover if it’s meaningful (> Rs. 1)
  if (leftover > 1) {
    // default split: 50% savings, 30% emergency, 20% buffer
    const want = [
      { name: 'Savings',   w: 0.5 },
      { name: 'Emergency', w: 0.3 },
      { name: 'Buffer',    w: 0.2 },
    ].filter(({ name }) => names.has(norm(name))); // only buckets the user actually has

    const wsum = want.reduce((s, x) => s + x.w, 0) || 1;
    for (const { name, w } of want) {
      out[name] = (out[name] || 0) + leftover * (w / wsum);
    }
  }

  // ---- Final rounding and remainder fix (avoid -0.01) ----
  // Round every bucket, then add small remainder to Savings or first category.
  let rounded = {};
  for (const [k, v] of Object.entries(out)) rounded[k] = round2(v);

  const after = Object.values(rounded).reduce((s, v) => s + v, 0);
  let rem = round2(income - after);

  if (Math.abs(rem) >= 0.01) {
    const bumpKey = names.has('savings') ? 'Savings' : Object.keys(rounded)[0];
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

    // Effective income for the current month
    const { income, age } = await getBudgetingIncome(uid);
    if (!(income > 0)) {
      Alert.alert('Income missing', 'Please add your income first.');
      return null;
    }

    // User categories (expense only)
    const { data: cats, error: cErr } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', uid)
      .eq('type', 'expense');
    if (cErr) throw cErr;

    const categoryNames = (cats || []).map(c => c.name);

    // Ask AI
    const body = { age, income, categories: categoryNames };
    const res = await axios.post(`${AI_URL}/recommend`, body, { timeout: 15000 });
    const recRaw = res.data?.recommendation;
    if (!recRaw) {
      Alert.alert('AI error', 'No recommendation returned.');
      return null;
    }

    // Post-process: floors + leftover sweep + rounding
    const rec = postProcessRecommendation({
      rawRec: recRaw,
      income,
      categories: categoryNames,
      age,
    });

    // Persist: update each category limit_
    await Promise.all(
      Object.entries(rec).map(async ([name, amount]) => {
        await supabase
          .from('categories')
          .update({ limit_: Number(amount) })
          .eq('user_id', uid)
          .eq('name', name)
          .eq('type', 'expense');
      })
    );

    return rec;
  } catch (e) {
    console.log('fetchRecommendation error:', e);
    Alert.alert('Failed', e.message || 'Unknown error.');
    return null;
  }
};
