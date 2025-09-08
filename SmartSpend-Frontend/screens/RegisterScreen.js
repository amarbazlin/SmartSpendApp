// screens/RegisterScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../services/supabase';
import { fetchRecommendation } from '../screens/fetchRecommendation';

/* ----------------------------- Colors ----------------------------- */
const COLOR_SELECTED_BG = '#A8C8EC';
const COLOR_CORE_BORDER = '#FECACA';
const COLOR_OTHER_BORDER = '#E5E7EB';
const DEFAULT_COLOR = '#E8E8E8';

/* ----------------------------- Category config ----------------------------- */
const CORE = ['Healthcare', 'Food', 'Utilities', 'Transport'];
const OPTIONAL_CATEGORIES = [
  'Housing', 'Education', 'Savings', 'Entertainment', 'Shopping',
  'Clothing', 'Subscriptions', 'Personal Care',
  'Pets', 'Gifts', 'Insurance', 'Debt', 'Charity',
];
const ICONS = {
  Food: '🍛', Housing: '🏠', Transport: '🚗', Utilities: '💡',
  Savings: '💰', Entertainment: '🎉', Healthcare: '🏥', Education: '🎓',
  Shopping: '🛍️', Clothing: '👗', Subscriptions: '📺', 'Personal Care': '🧴',
  Pets: '🐾', Gifts: '🎁', Insurance: '🛡️', Debt: '🏦', Charity: '🎗️',
  Buffer: '🧰', Other: '🧩',
};
const iconFor = (name) => ICONS[name] || ICONS.Other;

/* ----------------------------- Helpers ----------------------------- */
const capWords = (s = '') => s.trim().split(/\s+/).map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')).join(' ');
const normalize = (s = '') => s.trim().toLowerCase();
const unique = (arr) => [...new Set(arr)];

/* ----------------------------- Component ----------------------------- */
export default function RegisterScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); 
  const [busy, setBusy] = useState(false);

  const [registrationData, setRegistrationData] = useState({
    name: '', email: '', password: '', age: '', monthly_income: '',
  });

  const [selectedCats, setSelectedCats] = useState(CORE);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateCurrentStep = () => {
    const { name, email, password, age, monthly_income } = registrationData;
    switch (currentStep) {
      case 0: return !!name.trim() || (Alert.alert('Please enter your name'), false);
      case 1:
        if (!email || !password) { Alert.alert('Please fill all fields'); return false; }
        if (!validateEmail(email)) { Alert.alert('Please enter a valid email'); return false; }
        if (password.length < 6) { Alert.alert('Password must be at least 6 characters'); return false; }
        return true;
      case 2:
        const n = parseInt(age, 10);
        if (!age || isNaN(n) || n < 13 || n > 100) { Alert.alert('Please enter a valid age (13-100)'); return false; }
        return true;
      case 3:
        const inc = parseFloat(monthly_income);
        if (!monthly_income || isNaN(inc) || inc <= 0) { Alert.alert('Please enter a valid monthly income'); return false; }
        return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < 5) setCurrentStep(s => s + 1);
    else handleRegister();
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
    else { setIsRegistering(false); setCurrentStep(0); }
  };

  async function ensureUserCategories(userId, namesToCreate) {
    if (!userId) return;
    const uniq = [...new Set((namesToCreate || []).map(n => n.trim()).filter(Boolean))];
    if (!uniq.length) return;

    const { data: existing, error: exErr } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', userId)
      .eq('type', 'expense');

    if (exErr) throw exErr;

    const existingNames = new Set(existing?.map(r => r.name) || []);
    const toInsert = uniq
      .filter(n => !existingNames.has(n))
      .map(n => ({
        user_id: userId, type: 'expense', name: n,
        icon: iconFor(n), color: DEFAULT_COLOR, limit_: 0,
      }));

    if (toInsert.length) await supabase.from('categories').insert(toInsert);
  }

  const handleRegister = async () => {
    try {
      setBusy(true);

      // 1) Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: { data: { name: registrationData.name, full_name: registrationData.name } },
      });
      if (authError) { Alert.alert('Sign up failed', authError.message); return; }

      if (authData?.user?.id) {
        const uid = authData.user.id;
        const age = parseInt(registrationData.age, 10);
        const income = parseFloat(registrationData.monthly_income);
        const categoriesToSave = unique([...selectedCats, 'Buffer']);

        // 2) Profile row — always insert monthly_income
        const { error: profileError } = await supabase.from('users').insert([{
          id: uid,
          email: registrationData.email,
          name: registrationData.name,
          age,
          monthly_income: income,   // ✅ salary stored here
          spending_categories: categoriesToSave,
          created_at: new Date().toISOString(),
        }]);
        if (profileError) { Alert.alert('Profile Error', profileError.message); return; }

        // 3) Categories
        await ensureUserCategories(uid, categoriesToSave);

        // 4) Initial budgets (non-blocking)
        try { await fetchRecommendation(uid); } catch (e) { console.log('Budget init failed', e.message); }
      }

      Alert.alert('Registration Successful!', 'Your account is ready.', [
        { text: 'OK', onPress: () => { 
          setIsRegistering(false); setCurrentStep(0);
          setRegistrationData({ name: '', email: '', password: '', age: '', monthly_income: '' });
          setSelectedCats(CORE);
        }},
      ]);
    } catch (e) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) { Alert.alert('Please fill all fields'); return; }
    if (!validateEmail(loginData.email)) { Alert.alert('Please enter a valid email'); return; }
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword(loginData);
      if (error) { Alert.alert('Login failed', error.message); return; }
    } catch (e) {
      Alert.alert('Login failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- UI render functions (keep your steps etc. unchanged) ---------------- */
  // renderRegistrationStep, renderProgressBar, renderLoginForm go here (unchanged from your code)

  // ...
}

/* --------------------------------- styles --------------------------------- */
// keep the same styles from your version
