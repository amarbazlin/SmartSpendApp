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

const { width: screenWidth } = Dimensions.get('window');

export default function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    monthly_income: '',
    gender: '',
    employment: '',
    spending_categories: [],
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateCurrentStep = () => {
    const { name, email, password, age, monthly_income, gender, employment } = registrationData;

    switch (currentStep) {
      case 0:
        if (!name.trim()) {
          Alert.alert('Please enter your name');
          return false;
        }
        return true;
      case 1:
        if (!email || !password) {
          Alert.alert('Please fill all fields');
          return false;
        }
        if (!validateEmail(email)) {
          Alert.alert('Please enter a valid email');
          return false;
        }
        if (password.length < 6) {
          Alert.alert('Password must be at least 6 characters');
          return false;
        }
        return true;
      case 2: {
        const ageNum = parseInt(age, 10);
        if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
          Alert.alert('Please enter a valid age (13-100)');
          return false;
        }
        return true;
      }
      case 3: {
        const income = parseFloat(monthly_income);
        if (!monthly_income || isNaN(income) || income <= 0) {
          Alert.alert('Please enter a valid monthly income');
          return false;
        }
        return true;
      }
      case 4:
        if (!gender) {
          Alert.alert('Please select your gender');
          return false;
        }
        return true;
      case 5:
        if (!employment) {
          Alert.alert('Please select your employment status');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleRegister();
    }
  };

  const updateRegistrationData = (field, value) => {
    setRegistrationData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setIsRegistering(false);
      setCurrentStep(0);
    }
  };

  const handleRegister = async () => {
    try {
      setBusy(true);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            name: registrationData.name,
            full_name: registrationData.name,
          },
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        if (authError.message?.includes('User already registered')) {
          Alert.alert('Account already exists', 'There is already an account for this email.');
        } else {
          Alert.alert('Sign up failed', authError.message);
        }
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: registrationData.email,
              name: registrationData.name,
              age: parseInt(registrationData.age, 10),
              monthly_income: parseFloat(registrationData.monthly_income),
              gender: registrationData.gender,
              employment: registrationData.employment,
              spending_categories: registrationData.spending_categories,
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) {
          Alert.alert('Profile Error', `Failed to create profile: ${profileError.message}`);
          return;
        }

        // ✨ NOTE:
        // We removed the old `generateInitialBudget()` call.
        // Your AI budgeting now happens inside the app (e.g. in Categories screen)
        // when the user requests it, using your local (or in-app) model logic.
      }

      Alert.alert(
        'Registration Successful!',
        'Your account is ready. Please sign in.',
        [
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
                gender: '',
                employment: '',
                spending_categories: [],
              });
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      Alert.alert('Please fill all fields');
      return;
    }
    if (!validateEmail(loginData.email)) {
      Alert.alert('Please enter a valid email');
      return;
    }

    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        Alert.alert('Login failed', error.message);
        return;
      }
      // on success, your app-level navigation should take over
    } catch (e) {
      Alert.alert('Login failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const renderRegistrationStep = () => {
    const { name, email, password, age, monthly_income, gender, employment } = registrationData;

    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your name?</Text>
            <Text style={styles.stepSubtitle}>We'd love to get to know you better</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={(value) => updateRegistrationData('name', value)}
              autoCapitalize="words"
              autoFocus
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Create your account</Text>
            <Text style={styles.stepSubtitle}>We'll keep your information secure</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={(value) => updateRegistrationData('email', value)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              secureTextEntry
              value={password}
              onChangeText={(value) => updateRegistrationData('password', value)}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How old are you?</Text>
            <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={age}
              onChangeText={(value) => updateRegistrationData('age', value)}
              keyboardType="numeric"
              maxLength={3}
              autoFocus
            />
          </View>
        );

      case 3:
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
                onChangeText={(value) => updateRegistrationData('monthly_income', value)}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select your gender</Text>
            <Text style={styles.stepSubtitle}>This helps us provide relevant recommendations</Text>
            <View style={styles.optionsContainer}>
              {['Male', 'Female', 'Other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    gender === option.toLowerCase() && styles.selectedOption,
                  ]}
                  onPress={() => updateRegistrationData('gender', option.toLowerCase())}
                >
                  <Text
                    style={[
                      styles.optionText,
                      gender === option.toLowerCase() && styles.selectedOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Employment status</Text>
            <Text style={styles.stepSubtitle}>This helps us understand your financial situation</Text>
            <View style={styles.optionsContainer}>
              {[
                { label: 'Employed Full-time', value: 'employed' },
                { label: 'Employed Part-time', value: 'part_time' },
                { label: 'Self-employed', value: 'self_employed' },
                { label: 'Student', value: 'student' },
                { label: 'Unemployed', value: 'unemployed' },
                { label: 'Retired', value: 'retired' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    employment === option.value && styles.selectedOption,
                  ]}
                  onPress={() => updateRegistrationData('employment', option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      employment === option.value && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Spending Categories</Text>
            <Text style={styles.stepSubtitle}>Select what you typically spend on</Text>
            <View style={styles.optionsContainer}>
              {[
                'Food',
                'Housing',
                'Transport',
                'Utilities',
                'Savings',
                'Entertainment',
                'Healthcare',
                'Shopping',
              ].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.optionButton,
                    registrationData.spending_categories.includes(category) &&
                      styles.selectedOption,
                  ]}
                  onPress={() => {
                    setRegistrationData((prev) => {
                      const selected = prev.spending_categories.includes(category)
                        ? prev.spending_categories.filter((c) => c !== category)
                        : [...prev.spending_categories, category];
                      return { ...prev, spending_categories: selected };
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      registrationData.spending_categories.includes(category) &&
                        styles.selectedOptionText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
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
        onChangeText={(value) => setLoginData((prev) => ({ ...prev, email: value }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={loginData.password}
        onChangeText={(value) => setLoginData((prev) => ({ ...prev, password: value }))}
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
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / 7) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{currentStep + 1} of 7</Text>
    </View>
  );

  if (!isRegistering) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCenter}>
              <View style={styles.logo}>
                <Image
                  source={require('./images/App_Logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.container}>
        <View className="registrationHeader" style={styles.registrationHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.logoSmall}>
              <Image
                source={require('./images/App_Logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
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
              {busy ? 'Please wait...' : currentStep === 6 ? 'Create Account' : 'Continue'}
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
