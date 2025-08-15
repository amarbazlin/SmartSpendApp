// screens/AuthScreen.js
import React, { useState } from 'react';
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
  Dimensions,
} from 'react-native';
import { supabase } from '../services/supabase';
import { fetchRecommendation } from '../screens/fetchRecommendation';

const { width: screenWidth } = Dimensions.get('window');

// defaults for newly created categories
const DEFAULT_ICON = '📦';
const DEFAULT_COLOR = '#E8E8E8';

// ensure the user's chosen categories exist in `categories` (type='expense')
async function ensureUserCategories(userId, names) {
  const uniq = [...new Set((names || []).map(n => n.trim()).filter(Boolean))];
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
      icon: DEFAULT_ICON,
      color: DEFAULT_COLOR,
      limit_: 0, // AI will fill after
    }));

  if (toInsert.length) {
    const { error: insErr } = await supabase.from('categories').insert(toInsert);
    if (insErr) throw insErr;
  }
}

export default function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 name, 1 theme, 2 email/pw, 3 age, 4 income, 5 categories
  const [busy, setBusy] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    password: '',
    theme: 'light',
    age: '',
    monthly_income: '',
    spending_categories: [],
  });

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateCurrentStep = () => {
    const { name, email, password, age, monthly_income, theme } = registrationData;

    switch (currentStep) {
      case 0:
        if (!name.trim()) { Alert.alert('Please enter your name'); return false; }
        return true;
      case 1:
        if (!theme) { Alert.alert('Please select a theme'); return false; }
        return true;
      case 2:
        if (!email || !password) { Alert.alert('Please fill all fields'); return false; }
        if (!validateEmail(email)) { Alert.alert('Please enter a valid email'); return false; }
        if (password.length < 6) { Alert.alert('Password must be at least 6 characters'); return false; }
        return true;
      case 3: {
        const n = parseInt(age, 10);
        if (!age || isNaN(n) || n < 13 || n > 100) { Alert.alert('Please enter a valid age (13-100)'); return false; }
        return true;
      }
      case 4: {
        const inc = parseFloat(monthly_income);
        if (!monthly_income || isNaN(inc) || inc <= 0) { Alert.alert('Please enter a valid monthly income'); return false; }
        return true;
      }
      default:
        return true; // categories step doesn't block
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < 5) setCurrentStep(s => s + 1);
    else handleRegister();
  };

  const updateRegistrationData = (field, value) =>
    setRegistrationData(prev => ({ ...prev, [field]: value }));

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
    else { setIsRegistering(false); setCurrentStep(0); }
  };

  const handleAddCustomCategory = () => {
    const name = (customCategory || '').trim();
    if (!name) return;
    setRegistrationData(prev => ({
      ...prev,
      spending_categories: [...new Set([...prev.spending_categories, name])],
    }));
    setCustomCategory('');
  };

  const handleRegister = async () => {
    try {
      setBusy(true);

      // 1) create auth user
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

      // 2) create profile row + categories + initial AI limits
      if (authData?.user?.id) {
        const uid = authData.user.id;

        const { error: profileError } = await supabase.from('users').insert([{
          id: uid,
          email: registrationData.email,
          name: registrationData.name,
          age: parseInt(registrationData.age, 10),
          monthly_income: parseFloat(registrationData.monthly_income),
          spending_categories: registrationData.spending_categories,
          created_at: new Date().toISOString(),
        }]);
        if (profileError) {
          Alert.alert('Profile Error', profileError.message);
          return;
        }

        await ensureUserCategories(uid, registrationData.spending_categories);

        // Fill initial limits so category cards are pre-populated
        try {
          await fetchRecommendation(uid); // writes limit_ for the user's categories
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
              spending_categories: [],
            });
          },
        },
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

  const renderRegistrationStep = () => {
    const { name, email, password, age, monthly_income, theme, spending_categories } = registrationData;

    // 0) name
    if (currentStep === 0) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What's your name?</Text>
          <Text style={styles.stepSubtitle}>We'd love to get to know you better</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={name}
            onChangeText={v => updateRegistrationData('name', v)}
            autoCapitalize="words"
            autoFocus
          />
        </View>
      );
    }

    

    // 2) email/password
    if (currentStep === 1) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Create your account</Text>
          <Text style={styles.stepSubtitle}>We'll keep your information secure</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={email}
            onChangeText={v => updateRegistrationData('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            secureTextEntry
            value={password}
            onChangeText={v => updateRegistrationData('password', v)}
          />
        </View>
      );
    }

    // 3) age
    if (currentStep === 2) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>How old are you?</Text>
          <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>
          <TextInput
            style={styles.input}
            placeholder="Age"
            value={age}
            onChangeText={v => updateRegistrationData('age', v)}
            keyboardType="numeric"
            maxLength={3}
            autoFocus
          />
        </View>
      );
    }

    // 4) monthly income
    if (currentStep === 3) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What's your monthly income?</Text>
          <Text style={styles.stepSubtitle}>This helps us create better budget recommendations</Text>
          <View style={styles.incomeContainer}>
            <Text style={styles.currencySymbol}>Rs.</Text>
            <TextInput
              style={[styles.input, styles.incomeInput]}
              placeholder="50000"
              value={monthly_income}
              onChangeText={v => updateRegistrationData('monthly_income', v)}
              keyboardType="numeric"
              autoFocus
            />
          </View>
        </View>
      );
    }

    // 5) categories + add custom
    const defaults = [
      'Food','Housing','Transport','Utilities','Savings','Entertainment','Healthcare','Education'
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Spending Categories</Text>
        <Text style={styles.stepSubtitle}>Select what you typically spend on — and add your own</Text>

        <View style={styles.optionsContainer}>
          {defaults.map(category => {
            const selected = spending_categories.includes(category);
            return (
              <TouchableOpacity
                key={category}
                style={[styles.optionButton, selected && styles.selectedOption]}
                onPress={() => {
                  setRegistrationData(prev => {
                    const next = selected
                      ? prev.spending_categories.filter(c => c !== category)
                      : [...prev.spending_categories, category];
                    return { ...prev, spending_categories: next };
                  });
                }}
              >
                <Text style={[styles.optionText, selected && styles.selectedOptionText]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* add custom */}
        <View style={styles.customAddRow}>
          <TextInput
            style={[styles.input, styles.customAddInput]}
            placeholder="Add custom category"
            value={customCategory}
            onChangeText={setCustomCategory}
            autoCapitalize="words"
          />
          <TouchableOpacity style={styles.customAddButton} onPress={handleAddCustomCategory}>
            <Text style={styles.customAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLoginForm = () => (
    <View style={styles.loginContainer}>
      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Sign in to continue managing your budget</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={loginData.email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={v => setLoginData(prev => ({ ...prev, email: v }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={loginData.password}
        onChangeText={v => setLoginData(prev => ({ ...prev, password: v }))}
      />

      <TouchableOpacity
        style={[styles.button, busy && styles.disabledButton]}
        onPress={handleLogin}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsRegistering(true)}
        style={styles.switchLink}
        disabled={busy}
      >
        <Text style={styles.switchText}>
          Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / 6) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{currentStep + 1} of 6</Text>
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
          <View style={styles.placeholder} />
        </View>

        {renderProgressBar()}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderRegistrationStep()}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, busy && styles.disabledButton]}
            onPress={handleNext}
            disabled={busy}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Please wait...' : currentStep === 5 ? 'Create Account' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
    customAddRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  customAddInput: {
    flex: 1,
    marginBottom: 0,
  },
  customAddButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#00B8A9',
    borderRadius: 12,
  },
  customAddButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
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
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 20,
    color: '#374151',
  },
  placeholder: {
    width: 36,
  },
  headerCenter: {
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  logoSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoLabel: {
    fontSize: 19,
    fontWeight: '600',
    color: '#374151',
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B8A9',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  loginContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6B7280',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6B7280',
    paddingHorizontal: 20,
  },
  input: {
    height: 50,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
    fontSize: 16,
    width: '100%',
  },
  incomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  incomeInput: {
    flex: 1,
    marginBottom: 0,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderColor: '#00B8A9',
    backgroundColor: '#F0FDFA',
  },
  optionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#00B8A9',
    fontWeight: '600',
  },
  dependentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dependentButton: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedDependent: {
    borderColor: '#00B8A9',
    backgroundColor: '#F0FDFA',
  },
  dependentText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  selectedDependentText: {
    color: '#00B8A9',
  },
  moreButton: {
    width: 80,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#00B8A9',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  switchLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#00B8A9',
    fontWeight: '600',
  },
});
