import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransactionsScreenComponent from './TransactionScreen';
import { getBudgetingIncome } from './fetchRecommendation';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  StatusBar,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  StyleSheet, 
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  Home,
  Wallet,
  Target,
  BarChart3,
  DollarSign,
  Eye,
  CheckCircle,
  Lock,
  Mail,
  X,
  Bell,
  Palette,
  Globe,
  LogOut,
  MessageCircle,
  PieChart,
  Calculator,
  MoreHorizontal,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

import CategoryManager from './Categories';
import Transaction from './Transaction';
import { supabase } from '../services/supabase';
import ChartsScreen from './Charts';

const { width } = Dimensions.get('window');

// Android SMS lib (only loads on Android)
const SmsAndroid = Platform.OS === 'android' ? require('react-native-get-sms-android') : null;

/* ------------------------------ SMS PARSER ------------------------------ */
const parseBankSMS = (sms) => {
  if (!sms || typeof sms !== 'string') return null;

  const body = sms.replace(/\s+/g, ' ').trim();

  // Ignore OTP / promo
  if (/(OTP|One[-\s]?Time\s*Password|verification code|promo|offer|points|reward)/i.test(body)) {
    return null;
  }

  // Amount detection
  const amountMatchers = [
    /Amount\(Approx\.?\)\s*:\s*([\d,]+(?:\.\d+)?)\s*(?:LKR|Rs\.?|රු\.?)?/i,
    /Amount\s*:\s*([\d,]+(?:\.\d+)?)\s*(?:LKR|Rs\.?|රු\.?)?/i,
    /(?:LKR|Rs\.?|රු\.?)\s*([\d,]+(?:\.\d+)?)/i,
    /(debited|credited)\s*(?:with)?\s*(?:LKR|Rs\.?|රු\.?)?\s*([\d,]+(?:\.\d+)?)/i,
    /\(approx(?:\.|imate)?\s*(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)\)/i,
  ];

  let rawAmount = null;
  for (const rx of amountMatchers) {
    const m = body.match(rx);
    if (m) {
      rawAmount = m[2] || m[1];
      if (rawAmount) break;
    }
  }
  if (!rawAmount) return null;

  const amount = parseFloat(rawAmount.replace(/,/g, ''));
  if (!isFinite(amount)) return null;

  // Type detection
  const expenseTriggers = [
    'debited',
    'spent',
    'purchase',
    'withdraw',
    'cash wd',
    'payment',
    'bill',
    'tap&go',
    'tap & go',
    'lankaqr',
    'qr payment',
    'transfer from',
    'standing order',
    'so executed',
    'charge',
    'fee',
    'cash advance',
    'pre-auth completion',
  ];
  const incomeTriggers = [
    'credited',
    'received',
    'salary',
    'deposit',
    'loan disbursement',
    'reversal',
    'refund',
    'interest',
    'fd',
  ];

  const expenseRegex = new RegExp(expenseTriggers.join('|'), 'i');
  const incomeRegex = new RegExp(incomeTriggers.join('|'), 'i');

  let type = null;
  if (incomeRegex.test(body) && !expenseRegex.test(body)) type = 'income';
  else if (expenseRegex.test(body) && !incomeRegex.test(body)) type = 'expense';
  else {
    if (/debited/i.test(body)) type = 'expense';
    else if (/credited/i.test(body)) type = 'income';
  }
  if (!type) return null;

  // Category guess
  let category = 'Other';
  if (type === 'income') {
    if (/salary/i.test(body)) category = 'Salary';
    else if (/interest|fd/i.test(body)) category = 'Interest';
    else if (/refund|reversal/i.test(body)) category = 'Refund';
    else category = 'Income';
  } else {
    if (/lankaqr|qr/i.test(body)) category = 'QR Payment';
    else if (/atm|cash wd|withdraw/i.test(body)) category = 'ATM Withdrawal';
    else if (/bill|utility|payment/i.test(body)) category = 'Bills';
    else if (/cash advance/i.test(body)) category = 'Cash Advance';
    else category = 'Other';
  }

  // Merchant / location
  let merchant = null;
  let merchantMatch =
    body.match(/\bat\s+([A-Za-z0-9 &\-\.\(\)\/]+?)(?=(?: on |\d{2}\.\d{2}\.\d{2}|\d{2}\/\d{2}| \d{4}-\d{2}-\d{2}| using | via | Acc | Card |$|\.|,))/i) ||
    body.match(/\bto\s+([A-Za-z0-9 &\-\.\(\)\/]+?)(?=(?: on |\d{2}\.\d{2}\.\d{2}|\d{2}\/\d{2}| \d{4}-\d{2}-\d{2}| using | via | Acc | Card |$|\.|,))/i) ||
    body.match(/Location\s*:\s*([^,]+)/i);
  if (merchantMatch && merchantMatch[1]) merchant = merchantMatch[1].trim();

  return {
    type,
    category,
    merchant: merchant || 'Unknown',
    amount,
    description: sms,
    account: 'Bank',
  };
};

// More Menu Component (unchanged except using your styles)
const MoreMenu = ({ isOpen, onClose, onLogout }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadUser = async () => {
      try {
        setLoading(true);

        // 1) get auth user
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) {
          setName('');
          setEmail('');
          return;
        }

        setEmail(user.email ?? '');

        // Prefer auth metadata if you stored it there
        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.username ||
          '';

        if (metaName) {
          setName(metaName);
          return;
        }

        // 2) try users table by id
        const { data: profileById, error: errById } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .maybeSingle();

        if (errById) {
          console.log('profileById error =>', errById);
        }

        if (profileById?.name) {
          setName(profileById.name);
          return;
        }

        // 3) fallback: try by email (in case your users.id != auth uid)
        const { data: profileByEmail, error: errByEmail } = await supabase
          .from('users')
          .select('name')
          .eq('email', user.email)
          .maybeSingle();

        if (errByEmail) {
          console.log('profileByEmail error =>', errByEmail);
        }

        setName(profileByEmail?.name || ''); // leave empty if not found
      } catch (e) {
        console.warn('Error loading profile', e);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [isOpen]);

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.moreModalOverlay}>
        <TouchableOpacity
          style={styles.moreBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.moreMenu}>
          <ScrollView style={styles.moreMenuContent}>
            <View style={styles.moreMenuHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileImage}>
                  <Image
                    source={require('./images/App_Logo.png')}
                    style={styles.profileImageContent}
                    resizeMode="cover"
                  />
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{name || '—'}</Text>
                    <Text style={styles.profileEmail}>{email}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem}>
                <Lock size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Passcode</Text>
                  <Text style={styles.menuItemSubtitle}>OFF</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <DollarSign size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Main Currency Setting</Text>
                  <Text style={styles.menuItemSubtitle}>LKR(Rs.)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Wallet size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Sub Currency Setting</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Bell size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Alarm Setting</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Palette size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Style</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Globe size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Language Setting</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={onLogout}
              >
                <LogOut size={20} color="#EF4444" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.logoutText}>Logout</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function HomeScreen({ onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [transactionType, setTransactionType] = useState(null);
  const [showSmsInstructions, setShowSmsInstructions] = useState(true);
  

  const [balanceData, setBalanceData] = useState({
    totalBalance: 0,
    totalExpense: 0,
    totalIncome: 0,
    expensePercentage: 0,
  });

  // SMS import state (already referenced by your UI)
  const [smsText, setSmsText] = useState('');
  const [importedFromSMS, setImportedFromSMS] = useState(0);

  // you already had these refs
  const isSubmittingRef = useRef(false);
  const alertLockRef = useRef(false);

  // Fetch balance data from database (kept as-is)
  useEffect(() => {
    fetchBalanceData();
  }, []);

  const fetchBalanceData = async () => {
  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return;
    const uid = user.id;

    // ✅ use the safe income (sum this month OR profile fallback)
    const { income: monthlyIncome } = await getBudgetingIncome(uid);

    // expenses for this month
    const start = new Date(); start.setDate(1);
    const startStr = start.toISOString().slice(0, 10);

    const cols = 'amount, date, created_at';
    let { data: expRows, error: expErr } = await supabase
      .from('expenses')
      .select(cols)
      .eq('user_id', uid)
      .gte('date', startStr);
    if (expErr) throw expErr;

    if (!expRows?.length) {
      const { data: expRows2, error: expErr2 } = await supabase
        .from('expenses')
        .select(cols)
        .eq('user_id', uid)
        .gte('created_at', startStr);
      if (expErr2) throw expErr2;
      expRows = expRows2 || [];
    }

    const totalExpense = expRows.reduce((s, r) => s + Number(r.amount || 0), 0);

    setBalanceData({
      totalBalance: monthlyIncome - totalExpense,
      totalExpense,
      totalIncome: monthlyIncome, // shows 350,000 (not 700,000)
      expensePercentage: monthlyIncome > 0 ? Math.round((totalExpense / monthlyIncome) * 100) : 0,
    });
  } catch (e) {
    console.error('Error calculating monthly balance:', e);
  }
};


  // Navigation (kept as-is)
  const navigateToCategories = () => {
    setCurrentScreen('categories');
  };
  const navigateToCharts = () => {
    setCurrentScreen('charts');
  };
  const navigateToTransaction = (type = null) => {
    setTransactionType(type);
    setCurrentScreen('transaction');
  };
  const navigateToTransactionsScreen = () => {
    setCurrentScreen('transactionsScreen');
  };
  const navigateToHome = () => {
    setCurrentScreen('home');
    setTransactionType(null);
    fetchBalanceData(); // Refresh balance when returning to home
  };

  const toggleMoreMenu = () => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
  };
  const closeMoreMenu = () => {
    setIsMoreMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMoreMenu();

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      return;
    }

    if (onLogout) {
      onLogout();
    }
  };

  // Add transaction (kept as-is)
  const handleTransactionAdded = async (t) => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        alert('User session error');
        return;
      }

      const amt = Number(t.amount);
      const localDate = t.date || new Date().toISOString().split('T')[0];

      let catId = t.category_id ?? null;

      if (!catId && t.category) {
        const { data: catRow } = await supabase
          .from('categories')
          .select('id')
          .eq('name', t.category)
          .maybeSingle();
        catId = catRow?.id || null;
      }

      if (t.type === 'income') {
        const { error } = await supabase.from('income').insert([
          {
            user_id: user.id,
            source: t.category || 'Other',
            amount: amt,
            date: localDate,
            note: t.note || null,
          },
        ]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([
          {
            user_id: user.id,
            category_id: catId,
            amount: amt,
            payment_method: t.account || 'Cash',
            note: t.note || (t.merchant ? `Location: ${t.merchant}` : null),
            description: t.description || null,
            date: localDate,
          },
        ]);
        if (error) throw error;
      }

      alert('Transaction added!');
      fetchBalanceData();

      // ✅ Close form and go to Home
      setCurrentScreen('home');
    } catch (error) {
      console.error('Transaction Add Error:', error.message);
      alert('Failed to add transaction.');
    }
  };

  const handleTransactionUpdated = async (payload) => {
    try {
      const { error } = await supabase.rpc('update_transaction', {
        t_type: payload.type,
        t_id: payload.id,
        t_amount: Number(payload.amount),
        t_category_id: payload.category_id ?? null,
        t_source: payload.category ?? null,
        t_payment_method: payload.account ?? null,
        t_note: payload.note ?? null,
      });

      if (error) throw error;
      alert('Transaction updated!');
      fetchBalanceData();
    } catch (e) {
      console.error('Update Error:', e.message);
      alert('Update failed.');
    }
  };

  /* --------------------------- SMS IMPORT: ANDROID --------------------------- */

  const requestSMSPermission = useCallback(async () => {
    if (Platform.OS !== 'android' || !SmsAndroid) return;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Read SMS Permission',
          message:
            'SmartSpend needs access to your SMS to track expenses automatically.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        await readBankMessages();
      } else {
        console.log('SMS permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const readBankMessages = useCallback(async () => {
    if (Platform.OS !== 'android' || !SmsAndroid) return;

    const existingBodies = new Set(); // optional dedupe set; expand by loading from DB if needed
    let inserted = 0;

    const bankSenders = [
      'COMBANK',
      'CMB',
      'HNB',
      'SAMPATH',
      'BOC',
      'PEOPLES',
      'PB',
      'NDB',
      'SEYLAN',
      'DFCC',
      'NTB',
      'AMEX',
      'NTBAMEX',
      'PABC',
      'PAN ASIA',
      'PANASIA',
      'UNION',
      'UB',
      'UBL',
      'HSBC',
      'SCB',
      'STANDARDCHARTERED',
      'NSB',
      'CARGILLS',
    ];

    try {
      for (const sender of bankSenders) {
        const filter = { box: 'inbox', address: sender, maxCount: 50 };

        await new Promise((resolve) => {
          SmsAndroid.list(
            JSON.stringify(filter),
            (fail) => {
              console.error(`Failed to list SMS from ${sender}:`, fail);
              resolve();
            },
            async (count, smsList) => {
              let messages = [];
              try {
                messages = JSON.parse(smsList) ?? [];
              } catch (e) {
                console.error('[SMS] Failed to parse smsList JSON:', e);
                resolve();
                return;
              }

              for (const msg of messages) {
                try {
                  const parsed = parseBankSMS(msg.body);
                  if (!parsed) continue;

                  if (existingBodies.has(msg.body)) continue;

                  await handleTransactionAdded({
                    type: parsed.type,
                    category: parsed.category,
                    merchant: parsed.merchant,
                    amount: parsed.amount,
                    description: msg.body,
                    account: parsed.account,
                    date: new Date().toISOString().split('T')[0],
                  });

                  existingBodies.add(msg.body);
                  inserted += 1;
                } catch (e) {
                  console.error('[SMS] Error handling a message:', e);
                }
              }

              resolve();
            }
          );
        });
      }

      if (inserted > 0) {
        setImportedFromSMS((prev) => prev + inserted);
        Alert.alert(
          'SMS import',
          `${inserted} new transaction${inserted > 1 ? 's' : ''} imported`
        );
      }
    } catch (e) {
      console.error('[SMS] Fatal error:', e);
    }
  }, [handleTransactionAdded]);

  // Manual paste import (used by your Import button)
  const handleManualSmsImport = () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please enter the SMS text.');
      return;
    }
    const parsed = parseBankSMS(smsText);
    if (!parsed) {
      Alert.alert('Error', 'Could not parse SMS text.');
      return;
    }
    handleTransactionAdded({
      type: parsed.type,
      category: parsed.category,
      merchant: parsed.merchant,
      amount: parsed.amount,
      description: smsText,
      account: parsed.account,
      date: new Date().toISOString().split('T')[0],
    });
    setSmsText('');
    setImportedFromSMS((prev) => prev + 1);
  };

  // Ask for SMS permission on Home mount (Android)
  useEffect(() => {
    if (Platform.OS === 'android') requestSMSPermission();
  }, [requestSMSPermission]);

  /* --------------------------- RENDER OTHER SCREENS --------------------------- */

  if (currentScreen === 'categories') {
    return (
      <CategoryManager
        onBack={navigateToHome}
        onTransactions={navigateToTransactionsScreen}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'charts') {
    return (
      <ChartsScreen
        onBack={navigateToHome}
        onTransactions={navigateToTransactionsScreen}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'transaction') {
    return (
      <Transaction
        onBack={navigateToHome}
        transactionType={transactionType}
        onTransactionComplete={handleTransactionAdded}
        onUpdate={handleTransactionUpdated}
        availableThisMonth={Math.max(0, balanceData.totalBalance)}
      />
    );
  }

  if (currentScreen === 'transactionsScreen') {
    return (
      <TransactionsScreenComponent
        onBack={navigateToHome}
        onLogout={handleLogout}
      />
    );
  }

  /* ----------------------------------- HOME ---------------------------------- */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
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

        <View style={styles.content}>
          {/* Income & Expense Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.incomeButton]}
              onPress={() => navigateToTransaction('income')}
            >
              <Text style={styles.buttonText}>+ Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.expenseButton]}
              onPress={() => navigateToTransaction('expense')}
            >
              <Text style={styles.buttonText}>+ Add Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Functional Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLeft}>
                <View style={styles.balanceLabel}>
                  <BarChart3 size={16} color="white" />
                  <Text style={styles.balanceLabelText}>Total Balance</Text>
                </View>
                <Text style={styles.balanceAmount}>
                  {`Rs.${balanceData.totalBalance.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                  })}`}
                </Text>
              </View>
              <View style={styles.balanceRight}>
                <View style={styles.expenseLabel}>
                  <Eye size={16} color="white" />
                  <Text style={styles.balanceLabelText}>Total Expense</Text>
                </View>
                <Text style={styles.expenseAmount}>
                  -
                  {`Rs.${balanceData.totalExpense.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                  })}`}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        balanceData.expensePercentage,
                        100
                      )}%`,
                    },
                  ]}
                >
                  <Text style={styles.progressText}>
                    {balanceData.expensePercentage}%
                  </Text>
                </View>
                <Text style={styles.progressGoal}>
                  {`Rs.${balanceData.totalIncome.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                  })}`}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <CheckCircle size={16} color="white" />
              <Text style={styles.statusText}>
                {balanceData.expensePercentage}% Of Your Expenses,{' '}
                {balanceData.expensePercentage <= 30
                  ? 'Looks Good'
                  : balanceData.expensePercentage <= 70
                  ? 'Monitor Closely'
                  : 'Consider Reducing'}
                .
              </Text>
            </View>
          </View>

          {/* SMS Import Section (your existing UI uses these handlers/state) */}
          <View style={styles.smsImportSection}>
            <View style={styles.smsImportHeader}>
              <View style={styles.smsIconContainer}>
                <Ionicons name="phone-portrait" size={20} color="#008080" />
              </View>
              <View style={styles.smsHeaderText}>
                <Text style={styles.smsTitle}>Smart SMS Import</Text>
                <Text style={styles.smsSubtitle}>
                  Import bank transactions
                </Text>
              </View>
            </View>
{showSmsInstructions && (
  <View style={styles.smsInstructionsCard}>
    {/* Close button in the top-right */}
    <TouchableOpacity
      style={styles.smsCloseButton}
      onPress={() => setShowSmsInstructions(false)}
    >
      <Ionicons name="close" size={16} color="#6B7280" />
    </TouchableOpacity>

    <View style={styles.instructionStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>1</Text>
      </View>
      <Text style={styles.stepText}>Copy your bank transaction SMS</Text>
    </View>

    <View style={styles.instructionStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>2</Text>
      </View>
      <Text style={styles.stepText}>Paste it in the field below</Text>
    </View>

    <View style={styles.instructionStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>3</Text>
      </View>
      <Text style={styles.stepText}>Tap "Import" to add the transaction</Text>
    </View>
  </View>
)}


            {/* SMS Input Field */}
            <View style={styles.smsInputContainer}>
              <View style={styles.smsInputWrapper}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#9CA3AF"
                  style={styles.smsInputIcon}
                />
                <TextInput
                  style={styles.smsInput}
                  placeholder="Paste your bank SMS here..."
                  placeholderTextColor="#9CA3AF"
                  value={smsText}
                  onChangeText={setSmsText}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.importButton,
                  !smsText.trim() && styles.importButtonDisabled,
                ]}
                onPress={handleManualSmsImport}
                disabled={!smsText.trim()}
              >
                <Ionicons name="download-outline" size={18} color="white" />
                <Text style={styles.importButtonText}>Import</Text>
              </TouchableOpacity>
            </View>

            {/* Success Banner */}
            {importedFromSMS > 0 && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.successText}>
                  Successfully imported {importedFromSMS} transaction
                  {importedFromSMS > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* New Features Section */}
          <View style={styles.newFeaturesSection}>
            <TouchableOpacity
              style={styles.newFeatureItem}
              onPress={() => {
                // Navigate to chatbot screen
                console.log('Navigate to Chatbot');
              }}
            >
              <View style={[styles.newFeatureIcon, styles.chatbotIcon]}>
                <MessageCircle size={28} color="#7C3AED" />
              </View>
              <View style={styles.newFeatureContent}>
                <Text style={styles.newFeatureTitle}>AI Chatbot</Text>
                <Text style={styles.newFeatureSubtitle}>
                  Get personalized financial advice
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newFeatureItem}
              onPress={navigateToCharts}
            >
              <View style={[styles.newFeatureIcon, styles.statisticsIcon]}>
                <PieChart size={28} color="#059669" />
              </View>
              <View style={styles.newFeatureContent}>
                <Text style={styles.newFeatureTitle}>Statistics</Text>
                <Text style={styles.newFeatureSubtitle}>
                  View detailed spending analytics
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newFeatureItem}
              onPress={navigateToCategories}
            >
              <View style={[styles.newFeatureIcon, styles.budgetsIcon]}>
                <Calculator size={28} color="#DC2626" />
              </View>
              <View style={styles.newFeatureContent}>
                <Text style={styles.newFeatureTitle}>Budgets</Text>
                <Text style={styles.newFeatureSubtitle}>
                  Plan and track your spending limits
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions (left as-is) */}
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsList} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, styles.navItemInactive]}
          onPress={navigateToTransactionsScreen}
        >
          <DollarSign size={24} color="white" />
          <Text style={styles.navText}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <Wallet size={24} color="white" />
          <Text style={styles.navText}>Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, styles.navItemInactive]}
          onPress={toggleMoreMenu}
        >
          <MoreHorizontal size={24} color="white" />
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* More Menu */}
      <MoreMenu
        isOpen={isMoreMenuOpen}
        onClose={closeMoreMenu}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  smsImportSection: {
    backgroundColor: 'white',
    marginHorizontal: 1,
    marginBottom: 28,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  smsImportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  smsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6FFFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  smsHeaderText: {
    flex: 1,
  },

  smsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },

  smsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  smsInstructionsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#008080',
  },

  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#008080',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  smsCloseButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  padding: 4,
  zIndex: 1,
},
  stepText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },

  smsInputContainer: {
    marginBottom: 12,
  },

  smsInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },

  smsInputIcon: {
    marginRight: 8,
    marginTop: 2,
  },

  smsInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
  },

  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008080',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#008080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  importButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },

  importButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },

  successText: {
    fontSize: 13,
    color: '#065F46',
    marginLeft: 8,
    fontWeight: '500',
  },
  // Update existing summary styles
  summaryInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  summaryInlineItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryInlineDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },

  summaryInlineLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },

  summaryInlineValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryInlineItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryInlineDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
  },
  summaryInlineLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  summaryInlineValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  headerCenter: {
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    marginTop: -7,
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoLabel: {
    fontSize: 16,
    fontWeight: '300',
    color: '#374151',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  incomeButton: {
    backgroundColor: '#008080',
  },
  expenseButton: {
    backgroundColor: '#F87171',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#008080',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  balanceLeft: {
    flex: 1,
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabelText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginLeft: 8,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 22,
    marginLeft: -8,
    fontWeight: 'bold',
  },
  expenseAmount: {
    color: '#FCA5A5',
    fontSize: 22,
    marginRight:-6 ,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    backgroundColor: 'black',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  progressGoal: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
    right: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  // New Features Styles
  newFeaturesSection: {
    marginBottom: 32,
  },
  newFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newFeatureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatbotIcon: {
    backgroundColor: '#F3E8FF',
  },
  statisticsIcon: {
    backgroundColor: '#DCFCE7',
  },
  budgetsIcon: {
    backgroundColor: '#FEE2E2',
  },
  newFeatureContent: {
    flex: 1,
  },
  newFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  newFeatureSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  transactionsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#008080',
    fontWeight: '500',
  },
  transactionsList: {
    gap: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blueTransactionIcon: {
    backgroundColor: '#DBEAFE',
  },
  transactionIconText: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  transactionDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  transactionAmountRed: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionAmountGreen: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    backgroundColor: '#008080',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  navItem: {
    alignItems: 'center',
  },
  navItemInactive: {
    opacity: 0.7,
  },
  navText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  // More Menu Styles
  moreModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  moreBackdrop: {
    flex: 1,
  },
  moreMenu: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moreMenuContent: {
    padding: 24,
  },
  moreMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 48,
    height: 48,
    backgroundColor: '#008080',
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  profileImageContent: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 8,
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutItem: {
    marginTop: 32,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
});