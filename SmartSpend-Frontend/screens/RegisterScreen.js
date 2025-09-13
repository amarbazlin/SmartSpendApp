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
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';
import { fetchRecommendation } from '../screens/fetchRecommendation';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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

  const toggleCategory = (catName) => {
    setSelectedCats(prev => {
      if (CORE.includes(catName)) return prev; // Core cats can't be removed
      return prev.includes(catName) 
        ? prev.filter(c => c !== catName)
        : [...prev, catName];
    });
  };

  const renderProgressBar = () => {
    const progress = ((currentStep + 1) / 6) * 100;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{currentStep + 1} of 6</Text>
      </View>
    );
  };

  const renderRegistrationStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Welcome to SmartSpend</Text>
            <Text style={styles.stepSubtitle}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={registrationData.name}
              onChangeText={(text) => setRegistrationData(prev => ({ ...prev, name: text }))}
              autoCapitalize="words"
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Account Setup</Text>
            <Text style={styles.stepSubtitle}>Create your account</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={registrationData.email}
              onChangeText={(text) => setRegistrationData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={registrationData.password}
              onChangeText={(text) => setRegistrationData(prev => ({ ...prev, password: text }))}
              secureTextEntry
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepSubtitle}>How old are you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              value={registrationData.age}
              onChangeText={(text) => setRegistrationData(prev => ({ ...prev, age: text }))}
              keyboardType="numeric"
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Financial Information</Text>
            <Text style={styles.stepSubtitle}>What's your monthly income?</Text>
            <TextInput
              style={styles.input}
              placeholder="Monthly income (LKR)"
              value={registrationData.monthly_income}
              onChangeText={(text) => setRegistrationData(prev => ({ ...prev, monthly_income: text }))}
              keyboardType="numeric"
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Spending Categories</Text>
            <Text style={styles.stepSubtitle}>Core categories (required)</Text>
            <View style={styles.categoriesContainer}>
              {CORE.map(cat => (
                <View key={cat} style={[styles.categoryChip, styles.coreCategory]}>
                  <Text style={styles.categoryIcon}>{iconFor(cat)}</Text>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.stepSubtitle}>Optional categories</Text>
            <View style={styles.categoriesContainer}>
              {OPTIONAL_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    selectedCats.includes(cat) && styles.selectedCategory
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={styles.categoryIcon}>{iconFor(cat)}</Text>
                  <Text style={styles.categoryText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>All Set!</Text>
            <Text style={styles.stepSubtitle}>Ready to create your account?</Text>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>Name: {registrationData.name}</Text>
              <Text style={styles.summaryText}>Email: {registrationData.email}</Text>
              <Text style={styles.summaryText}>Age: {registrationData.age}</Text>
              <Text style={styles.summaryText}>Monthly Income: Rs.{registrationData.monthly_income}</Text>
              <Text style={styles.summaryText}>Categories: {selectedCats.length} selected</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderLoginForm = () => (
    <View style={styles.loginContainer}>
      <View style={styles.logoContainer}>
        <Image source={require('./images/App_Logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appTitle}>SmartSpend</Text>
        <Text style={styles.appSubtitle}>Smart Financial Management</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={loginData.email}
          onChangeText={(text) => setLoginData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={loginData.password}
          onChangeText={(text) => setLoginData(prev => ({ ...prev, password: text }))}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, styles.loginButton]} 
          onPress={handleLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.registerButton]} 
          onPress={() => setIsRegistering(true)}
        >
          <Text style={styles.registerButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {!isRegistering ? (
          renderLoginForm()
        ) : (
          <View style={styles.registrationContainer}>
            {renderProgressBar()}
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {renderRegistrationStep()}
            </ScrollView>
            
            <View style={styles.navigationContainer}>
              <TouchableOpacity 
                style={[styles.navButton, styles.backButton]} 
                onPress={handleBack}
              >
                <Text style={styles.backButtonText}>
                  {currentStep === 0 ? 'Cancel' : 'Back'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navButton, styles.nextButton]} 
                onPress={handleNext}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {currentStep === 5 ? 'Create Account' : 'Next'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#008080',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  formContainer: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#008080',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#008080',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#008080',
    fontSize: 16,
    fontWeight: '600',
  },
  registrationContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    padding: 24,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#008080',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 8,
  },
  stepContainer: {
    flex: 1,
    minHeight: 400,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLOR_OTHER_BORDER,
    backgroundColor: '#FFFFFF',
  },
  coreCategory: {
    backgroundColor: COLOR_SELECTED_BG,
    borderColor: COLOR_CORE_BORDER,
  },
  selectedCategory: {
    backgroundColor: COLOR_SELECTED_BG,
    borderColor: '#008080',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#1F2937',
  },
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    gap: 8,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nextButton: {
    backgroundColor: '#008080',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});