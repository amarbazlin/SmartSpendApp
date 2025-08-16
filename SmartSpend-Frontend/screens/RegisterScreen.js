// screens/AuthScreen.js
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
const COLOR_SELECTED_BG = '#A8C8EC'; // light blue
const COLOR_CORE_BORDER = '#FECACA'; // light red
const COLOR_OTHER_BORDER = '#E5E7EB'; // ash gray
const DEFAULT_COLOR = '#E8E8E8';

/* ----------------------------- Category config ----------------------------- */
// Core (shown first, with red outline when unselected)
const CORE = ['Healthcare', 'Food', 'Utilities', 'Transport'];

// Other options (gray outline when unselected)
const OPTIONAL_CATEGORIES = [
  'Housing', 'Education', 'Savings', 'Entertainment', 'Shopping',
  'Clothing', 'Subscriptions', 'Dining Out', 'Personal Care',
  'Pets', 'Gifts', 'Insurance', 'Debt', 'Charity',
];

// Default icon per category
const ICONS = {
  Food: '🍛',
  Housing: '🏠',
  Transport: '🚗',
  Utilities: '💡',
  Savings: '💰',
  Entertainment: '🎉',
  Healthcare: '🏥',
  Education: '🎓',
  
  Shopping: '🛍️',
  Clothing: '👗',
  Subscriptions: '📺',
  'Dining Out': '🍽️',
  'Personal Care': '🧴',
  Pets: '🐾',
  Gifts: '🎁',
  Insurance: '🛡️',
  Debt: '🏦',
  Charity: '🎗️',
  Buffer: '🧰',
  Other: '🧩',
};
const iconFor = (name) => ICONS[name] || ICONS.Other;

/* ----------------------------- Helpers ----------------------------- */
const capWords = (s = '') => s.trim().split(/\s+/).map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')).join(' ');
const normalize = (s = '') => s.trim().toLowerCase();
const unique = (arr) => [...new Set(arr)];

/* ----------------------------- Component ----------------------------- */
export default function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 name, 1 email/pw, 2 age, 3 income, 4 categories, 5 confirm
  const [busy, setBusy] = useState(false);

  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    monthly_income: '',
  });

  // Start with core pre-selected (user can deselect any)
  const [selectedCats, setSelectedCats] = useState(CORE);

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateCurrentStep = () => {
    const { name, email, password, age, monthly_income } = registrationData;
    switch (currentStep) {
      case 0:
        if (!name.trim()) { Alert.alert('Please enter your name'); return false; }
        return true;
      case 1:
        if (!email || !password) { Alert.alert('Please fill all fields'); return false; }
        if (!validateEmail(email)) { Alert.alert('Please enter a valid email'); return false; }
        if (password.length < 6) { Alert.alert('Password must be at least 6 characters'); return false; }
        return true;
      case 2: {
        const n = parseInt(age, 10);
        if (!age || isNaN(n) || n < 13 || n > 100) { Alert.alert('Please enter a valid age (13-100)'); return false; }
        return true;
      }
      case 3: {
        const inc = parseFloat(monthly_income);
        if (!monthly_income || isNaN(inc) || inc <= 0) { Alert.alert('Please enter a valid monthly income'); return false; }
        return true;
      }
      default:
        return true;
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

  /* ------------------------- Category selection logic ------------------------- */
  const selectedSet = useMemo(() => new Set(selectedCats.map(normalize)), [selectedCats]);
  const isCore = (name) => CORE.map(normalize).includes(normalize(name));

  const toggleCategory = (name) => {
    const pretty = capWords(name);
    const n = normalize(pretty);
    setSelectedCats((prev) => {
      const has = prev.map(normalize).includes(n);
      if (has) return prev.filter(c => normalize(c) !== n);
      return unique([...prev, pretty]);
    });
  };

  /* --------------------------------- register --------------------------------- */

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
        user_id: userId,
        type: 'expense',
        name: n,
        icon: iconFor(n),
        color: DEFAULT_COLOR,
        limit_: 0,
      }));

    if (toInsert.length) {
      const { error: insErr } = await supabase.from('categories').insert(toInsert);
      if (insErr) throw insErr;
    }
  }

  const handleRegister = async () => {
    try {
      setBusy(true);

      // 1) auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: { name: registrationData.name, full_name: registrationData.name },
          emailRedirectTo: undefined,
        },
      });
      if (authError) {
        Alert.alert('Sign up failed', authError.message ?? 'Unknown error');
        return;
      }

      // 2) profile + categories + base income row + budgets
      if (authData?.user?.id) {
        const uid = authData.user.id;
        const age = parseInt(registrationData.age, 10);
        const income = parseFloat(registrationData.monthly_income);

        const categoriesToSave = unique([...selectedCats, 'Buffer']);

        // Profile row
        const { error: profileError } = await supabase.from('users').insert([{
          id: uid,
          email: registrationData.email,
          name: registrationData.name,
          age,
          monthly_income: income,
          spending_categories: categoriesToSave,
          created_at: new Date().toISOString(),
        }]);
        if (profileError) {
          Alert.alert('Profile Error', profileError.message);
          return;
        }

        // Create expense categories
        await ensureUserCategories(uid, categoriesToSave);

        // Visible "BaseMonthly" income row (your getBudgetingIncome excludes it)
        try {
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('income').insert([{
            user_id: uid,
            source: 'BaseMonthly',
            amount: income,
            date: today,
            note: 'Baseline income from profile',
          }]);
        } catch (e) {
          console.log('Initial base income insert failed (non-blocking):', e?.message);
        }

        // Initial budgets
        try {
          await fetchRecommendation(uid);
        } catch (e) {
          console.log('Initial AI budget failed (non-blocking):', e?.message);
        }
      }

      Alert.alert('Registration Successful!', 'Your account is ready.', [
        {
          text: 'OK',
          onPress: () => {
            setIsRegistering(false);
            setCurrentStep(0);
            setRegistrationData({
              name: '',
              email: '',
              password: '',
              age: '',
              monthly_income: '',
            });
            setSelectedCats(CORE);
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------- login --------------------------------- */
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

  /* --------------------------------- UI --------------------------------- */

  const CategoryGrid = ({ items, isCoreGroup }) => (
  <View style={styles.grid}>
    {items.map((c) => {
      const selected = selectedSet.has(normalize(c));
      const borderColor = selected
        ? '#8DB3E3' // darker blue border when selected
        : isCoreGroup
          ? COLOR_CORE_BORDER
          : COLOR_OTHER_BORDER;
      const backgroundColor = selected ? COLOR_SELECTED_BG : '#FFFFFF';

      // If it's a core group, disable pressing
      const isDisabled = isCoreGroup;

      return (
        <TouchableOpacity
          key={c}
          activeOpacity={0.9}
          onPress={() => {
            if (!isDisabled) toggleCategory(c);
          }}
          disabled={isDisabled}
          style={[styles.chip, { borderColor, backgroundColor, opacity: isDisabled ? 0.6 : 1 }]}
        >
          <Text style={styles.chipIcon}>{iconFor(c)}</Text>
          <Text style={styles.chipText}>{c}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

  const renderRegistrationStep = () => {
    const { name, email, password, age, monthly_income } = registrationData;

    if (currentStep === 0) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What’s your name?</Text>
          <Text style={styles.stepSubtitle}></Text>
          <TextInput
            style={[styles.input, styles.bigGap]}
            placeholder="Enter your full name"
            value={name}
            onChangeText={v => setRegistrationData(p => ({ ...p, name: v }))}
            autoCapitalize="words"
            autoFocus
          />
        </View>
      );
    }

    if (currentStep === 1) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Create your account</Text>
          <Text style={styles.stepSubtitle}></Text>
          <TextInput
            style={[styles.input, styles.bigGap]}
            placeholder="Email address"
            value={email}
            onChangeText={v => setRegistrationData(p => ({ ...p, email: v }))}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, styles.bigGap]}
            placeholder="Create a password"
            secureTextEntry
            value={password}
            onChangeText={v => setRegistrationData(p => ({ ...p, password: v }))}
          />
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>How old are you?</Text>
          <Text style={styles.stepSubtitle}></Text>
          <TextInput
            style={[styles.input, styles.bigGap]}
            placeholder="Age"
            value={age}
            onChangeText={v => setRegistrationData(p => ({ ...p, age: v }))}
            keyboardType="numeric"
            maxLength={3}
            autoFocus
          />
        </View>
      );
    }

    if (currentStep === 3) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What’s your monthly income?</Text>
          <Text style={styles.stepSubtitle}>We’ll build an initial budget from this.</Text>
          <View style={styles.incomeRow}>
            <Text style={styles.currency}>Rs.</Text>
            <TextInput
              style={[styles.input, styles.bigGap, styles.incomeInput]}
              placeholder="50000"
              value={monthly_income}
              onChangeText={v => setRegistrationData(p => ({ ...p, monthly_income: v }))}
              keyboardType="numeric"
              autoFocus
            />
          </View>
        </View>
      );
    }

    // Step 4: Categories (core first with red outline; others with gray outline). Tap to toggle. No top list, no crosses.
    if (currentStep === 4) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Pick your categories</Text>
          <Text style={styles.stepSubtitle}>Tap to select or deselect. You can change these later.</Text>

          <Text style={styles.sectionLabel}>Core</Text>
          <CategoryGrid items={CORE} isCoreGroup />

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Other</Text>
          <CategoryGrid items={OPTIONAL_CATEGORIES} isCoreGroup={false} />
        </View>
      );
    }

    // Step 5
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>All set!</Text>
        <Text style={styles.stepSubtitle}>We’ll create your account and prepare your budgets.</Text>
      </View>
    );
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / 6) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{currentStep + 1} of 6</Text>
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.loginContainer}>
      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}></Text>

      <TextInput
        style={[styles.input, styles.bigGap]}
        placeholder="Email"
        value={loginData.email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={v => setLoginData(prev => ({ ...prev, email: v }))}
      />

      <TextInput
        style={[styles.input, styles.bigGap]}
        placeholder="Password"
        secureTextEntry
        value={loginData.password}
        onChangeText={v => setLoginData(prev => ({ ...prev, password: v }))}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, busy && styles.disabledBtn]}
        onPress={handleLogin}
        disabled={busy}
      >
        <Text style={styles.primaryBtnText}>{busy ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(true)} style={styles.switchLink} disabled={busy}>
        <Text style={styles.switchText}>
          Don’t have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!isRegistering) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCenter}>
              <View style={styles.logo}>
                <Image source={require('./images/App_Logo.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.logoLabel}>SmartSpend</Text>
            </View>
          </View>
          {renderLoginForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.container}>
        <View style={styles.registrationHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.logoSmall}>
              <Image source={require('./images/App_Logo.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {renderProgressBar()}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderRegistrationStep()}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.disabledBtn]}
            onPress={handleNext}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? 'Please wait...' : currentStep === 5 ? 'Create Account' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* --------------------------------- styles --------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  registrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  backButtonText: { fontSize: 20, color: '#374151' },
  headerCenter: { alignItems: 'center' },
  logo: { width: 60, height: 60, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  logoSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  logoLabel: { fontSize: 19, fontWeight: '600', color: '#374151' },

  progressContainer: { padding: 20, paddingBottom: 10 },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00B8A9' },
  progressText: { textAlign: 'center', marginTop: 8, fontSize: 12, color: '#6B7280' },

  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  // steps
  stepContainer: { flex: 1, alignItems: 'center' },
  stepTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10, color: '#111827' },
  stepSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 18, color: '#6B7280', paddingHorizontal: 20 },

  input: {
    height: 52,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    fontSize: 16,
    width: '100%',
  },
  bigGap: { marginBottom: 18 },

  incomeRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  currency: { fontSize: 18, fontWeight: '700', color: '#374151', marginRight: 8 },
  incomeInput: { flex: 1 },

  // categories
  sectionLabel: {
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 6,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
  },
  chipIcon: { fontSize: 18, marginRight: 8 },
  chipText: { fontSize: 15, fontWeight: '600', color: '#1F2937', flexShrink: 1 },

  // buttons
  buttonContainer: { padding: 20 },
  primaryBtn: { backgroundColor: '#00B8A9', paddingVertical: 16, borderRadius: 12, marginTop: 10 },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 16 },
  disabledBtn: { opacity: 0.6 },

  // login
  loginContainer: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#111827' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: '#6B7280' },
  switchLink: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#6B7280', fontSize: 14 },
  switchTextBold: { color: '#00B8A9', fontWeight: '700' },
});
