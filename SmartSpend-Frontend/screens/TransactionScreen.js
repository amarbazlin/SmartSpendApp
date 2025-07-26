// TransactionsScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  Alert,
  StatusBar,
  Platform,
  FlatList,
  SectionList,
  PermissionsAndroid,
  TextInput,
} from 'react-native';
import {
  Home,
  Edit3,
  Trash2,
  Wallet,
  DollarSign,
  MoreHorizontal,
  Lock,
  X,
  Bell,
  Palette,
  Globe,
  LogOut,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import TransactionForm from './Transaction';

const SmsAndroid = Platform.OS === 'android' ? require('react-native-get-sms-android') : null;

/* ------------------------------ Local Parser ------------------------------ */
const parseBankSMS = (sms) => {
  if (!sms || typeof sms !== 'string') return null;
  const body = sms.replace(/\s+/g, ' ').trim();

  const amountMatch =
    body.match(/Amount\(Approx\.?\):\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/Amount:\s*([\d,]+(?:\.\d+)?)\s*LKR/i) ||
    body.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)/i);

  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const dateMatch = body.match(/Date:([0-9]{2}\.[0-9]{2}\.[0-9]{2})/i);
  const timeMatch = body.match(/Time:([0-9]{2}:[0-9]{2})/i);
  const locationMatch = body.match(/Location:([^,]+)/i);
  
  // ✅ Extract location and format category properly
  const location = locationMatch?.[1]?.trim() || 'Unknown Location';
  
  const type = /credit|income/i.test(body) ? 'income' : 'expense';

  return {
    type,
    category: 'Other', // ✅ Set category as 'Other'
    merchant: location, // ✅ Store location separately
    amount,
    description: sms,
    account: 'Bank',
    smsDate: dateMatch ? dateMatch[1] : null,
    smsTime: timeMatch ? timeMatch[1] : null,
  };
};

const tabs = ['Daily', 'Monthly', 'Summary'];

/* --------------------------- More (Settings) Menu -------------------------- */
const MoreMenu = ({ isOpen, onClose, onLogout }) => (
  <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.moreModalOverlay}>
      <TouchableOpacity style={styles.moreBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.moreMenu}>
        <ScrollView style={styles.moreMenuContent}>
          {/* Header */}
          <View style={styles.moreMenuHeader}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <Image
                  source={require('./images/App_Logo.png')}
                  style={styles.profileImageContent}
                  resizeMode="cover"
                />
              </View>
              <View className="profileInfo">
                <Text style={styles.profileName}>Amar Bazlin</Text>
                <Text style={styles.profileEmail}>aamarbazlin@gmail.com</Text>
              </View>
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
                <Text style={styles.menuItemSubtitle}>LKR (Rs.)</Text>
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

            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={onLogout}>
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

/* ------------------------------- Main Screen ------------------------------- */
export default function TransactionsScreen({ onBack, onLogout }) {
  const navigation = useNavigation();

  const isSubmittingRef = useRef(false);
  const alertLockRef = useRef(false); // 🔧 FIX: prevent duplicate Alert

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeTab] = useState('Transactions');
  const [selectedTab, setSelectedTab] = useState('Daily');

  const [transactions, setTransactions] = useState([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);

  const [categories, setCategories] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTx, setEditTx] = useState(null);

  const [showActions, setShowActions] = useState(false);
  const [actionTx, setActionTx] = useState(null);

  const [importedFromSMS, setImportedFromSMS] = useState(0);
  const [smsText, setSmsText] = useState('');

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const today = new Date();
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const nextMonthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 1), [today]);

  /* -------------------------------- Helpers -------------------------------- */

  // 🔧 FIX: safe alert (fires once until user dismisses)
  const safeAlert = useCallback((title, message) => {
    if (alertLockRef.current) return;
    alertLockRef.current = true;
    Alert.alert(title, message, [
      {
        text: 'OK',
        onPress: () => {
          alertLockRef.current = false;
        },
      },
    ]);
  }, []);

  const confirmDelete = (tx) => {
    Alert.alert(
      'Delete',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(tx) },
      ]
    );
  };

  const deleteTransaction = async (tx) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const table = tx.type === 'income' ? 'income' : 'expenses';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', tx.id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchTransactions();
    } catch (e) {
      console.error('deleteTransaction error', e);
      safeAlert('Error', e.message || 'Failed to delete');
    }
  };

  const startEdit = (tx) => {
  // ✅ Pre-populate the form with transaction data
  const editTransaction = {
    ...tx,
    // Ensure account is set correctly for SMS transactions
    account: tx.payment_method === 'Bank' ? 'Bank' : (tx.payment_method || 'Cash'),
    // Keep the formatted category (e.g., "Other - ARPICO-HYDE PARK")
    category: tx.category,
  };
  
  setEditTx(editTransaction);
  setShowTransactionForm(true);
};

  const handleTransactionAdded = useCallback(async (t) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    console.log('[handleTransactionAdded] fired once'); // debug

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        safeAlert('Error', 'No user session');
        return;
      }

      const amt = Number(t.amount);
      let catId = t.category_id ?? null;

      if (!catId && t.category) {
        const { data: catRow, error: catErr } = await supabase
          .from('categories')
          .select('id')
          .eq('name', t.category)
          .maybeSingle();
        if (catErr) console.warn(catErr);
        catId = catRow?.id ?? null;
      }

      if (t.type === 'income') {
        const { error } = await supabase.from('income').insert([{
          user_id: user.id,
          source: t.category || 'Other',
          amount: amt,
          date: new Date().toISOString().slice(0, 10),
          note: t.note || null,
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([{
          user_id: user.id,
          category_id: catId,
          amount: amt,
          payment_method: t.account || 'Cash',
          note: t.note || (t.merchant ? `Location: ${t.merchant}` : null), // ✅ Store merchant in note
          description: t.description || null,
          date: new Date().toISOString().slice(0, 10),
        }]);
        if (error) throw error;
      }

      await fetchTransactions();
      setShowTransactionForm(false);
      safeAlert('Success', 'Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      safeAlert('Error', error.message || 'Failed to add transaction');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [fetchTransactions, safeAlert]);

  const handleTransactionUpdated = useCallback(async (payload) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    console.log('[handleTransactionUpdated] fired once'); // debug

    try {
      const { error } = await supabase.rpc('update_transaction', {
        t_type: editTx.type,
        t_id: editTx.id,
        t_amount: Number(payload.amount),
        t_category_id: payload.category_id ?? null,
        t_source: payload.category ?? null,
        t_payment_method: payload.account ?? null,
        t_note: payload.note ?? null,
      });
      if (error) throw error;

      await fetchTransactions();
      setShowTransactionForm(false);
      setEditTx(null);
      safeAlert('Success', 'Transaction updated successfully');
    } catch (e) {
      console.error(e);
      safeAlert('Update failed', e.message);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [editTx, fetchTransactions, safeAlert]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('transactions') // DB view
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 🔧 FIX: hard de-dup (type + id) to avoid any view duplication showing twice
      const seen = new Set();
      const deduped = [];
      for (const t of (data || [])) {
        const key = `${t.type}:${t.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(t);
        }
      }
      setTransactions(deduped);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      safeAlert('Error', 'Failed to fetch transactions');
    }
  }, [safeAlert]);

  /** Calculate month totals (ONLY current month) */
  const calculateMonthTotals = useCallback((transactionData) => {
    const monthTx = transactionData.filter(t => {
      const dt = new Date(t.created_at);
      return dt >= monthStart && dt < nextMonthStart;
    });

    const totalIncome = monthTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpenses = monthTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    setIncome(totalIncome);
    setExpenses(totalExpenses);
  }, [monthStart, nextMonthStart]);

  const generateMonthlyData = useCallback(() => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const monthlyStats = monthNames.map((month, index) => {
      const monthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.created_at);
        return transactionDate.getFullYear() === currentYear && transactionDate.getMonth() === index;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const startDate = `${String(index + 1).padStart(2, '0')}/01`;
      const endDate = `${String(index + 1).padStart(2, '0')}/${new Date(currentYear, index + 1, 0).getDate()}`;

      return {
        month,
        dateRange: `${startDate} ~ ${endDate}`,
        income: monthIncome,
        expenses: monthExpenses,
        total: monthIncome - monthExpenses,
      };
    });

    setMonthlyData(monthlyStats);
  }, [transactions, currentYear]);

  const getDailyTotals = useCallback((date = new Date()) => {  // ✅ Add default parameter
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
    let incomeDay = 0, expenseDay = 0;

    transactions.forEach(t => {
      const dt = new Date(t.created_at);
      if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
        if (t.type === 'income') incomeDay += Number(t.amount) || 0;
        else expenseDay += Number(t.amount) || 0;
      }
    });

    return { incomeDay, expenseDay };
  }, [transactions]);

  /* ----- Current month filtered transactions (for Daily tab) + Group by day ---- */
  const currentMonthTransactions = useMemo(() => {

    
    return transactions.filter(t => {
      const dt = new Date(t.created_at);
      return dt >= monthStart && dt < nextMonthStart;
    });
  }, [transactions, monthStart, nextMonthStart]);

  const dailySections = useMemo(() => {
  const map = new Map(); // key: yyyy-mm-dd => items
  currentMonthTransactions.forEach(t => {
    const dt = new Date(t.created_at);
    const key = dt.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });

  const sections = Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? -1 : 1)) // desc
    .map(([dateKey, items]) => {
      const incomeDay = items
        .filter(x => x.type === 'income')
        .reduce((s, x) => s + Number(x.amount || 0), 0);
      const expenseDay = items
        .filter(x => x.type === 'expense')
        .reduce((s, x) => s + Number(x.amount || 0), 0);

      // ✅ Fix date parsing with explicit timezone handling
      const [year, month, day] = dateKey.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return {
        title: dateKey,
        dayNumber: d.getDate(),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        incomeDay,
        expenseDay,
        data: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      };
    });

  return sections;
}, [currentMonthTransactions]);


  const { incomeDay, expenseDay } = getDailyTotals(new Date());  // ✅ Use fresh date


  /* --------------------------- Category Remaining -------------------------- */
  const getRemainingForCategory = useCallback((categoryName) => {
    if (!categoryName) return null;
    const cat = categories.find(c => c.name === categoryName);
    if (!cat || typeof cat.budget_limit !== 'number') return null;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const spent = transactions
      .filter(t =>
        t.type === 'expense' &&
        t.category === categoryName &&
        new Date(t.created_at) >= start
      )
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return (cat.budget_limit - spent);
  }, [categories, transactions]);

  /* --------------------------- Permissions / SMS --------------------------- */
  const requestSMSPermission = useCallback(async () => {
    if (Platform.OS !== 'android' || !SmsAndroid) return;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Read SMS Permission',
          message: 'SmartSpend needs access to your SMS to track expenses automatically.',
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
  }, [readBankMessages]);

  const readBankMessages = useCallback(async () => {
    if (Platform.OS !== 'android' || !SmsAndroid) return;

    console.log('[SMS] Starting to read bank messages…');

    const existingBodies = new Set(transactions.map(t => t.description));
    let inserted = 0;

    const bankSenders = [
      'BOC', 'HNB', 'COMBANK', 'NTB', 'SAMPATH', 'DFCC', 'NSB', 'SEYLAN', 'UB',
      'PAN ASIA', 'HSBC', 'CARGILLS', 'STANDARDCHARTERED', 'MCB', 'NDB', 'PB'
    ];

    try {
      for (const sender of bankSenders) {
        const filter = { box: 'inbox', address: sender, maxCount: 20 };

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
                    category: parsed.category, // 'Other'
                    merchant: parsed.merchant, // 'KEELLS SUPER - DARLEY ROA'
                    amount: parsed.amount,
                    description: msg.body,
                    account: parsed.account,
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
        safeAlert('SMS import', `${inserted} new transaction${inserted > 1 ? 's' : ''} imported`);
      }
    } catch (e) {
      console.error('[SMS] Fatal error:', e);
    }
  }, [transactions, handleTransactionAdded, safeAlert]);

  const handleManualSmsImport = () => {
  if (!smsText.trim()) {
    safeAlert('Error', 'Please enter the SMS text.');
    return;
  }
  const parsed = parseBankSMS(smsText);
  if (!parsed) {
    safeAlert('Error', 'Could not parse SMS text.');
    return;
  }
  handleTransactionAdded({
  type: parsed.type,
  category: parsed.category, // 'Other'
  merchant: parsed.merchant, // Location name
  amount: parsed.amount,
  description: smsText,
  account: parsed.account,
});
  setSmsText('');
};

  /* --------------------------------- Effects -------------------------------- */
  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    if (Platform.OS === 'android') requestSMSPermission();
  }, []);

  useEffect(() => {
    calculateMonthTotals(transactions);
  }, [transactions, calculateMonthTotals]);

  useEffect(() => {
    if (selectedTab === 'Monthly') {
      generateMonthlyData();
    }
  }, [selectedTab, transactions, currentYear, generateMonthlyData]);

  /* ------------------------------- UI helpers ------------------------------- */
  const toggleMoreMenu = () => setIsMoreMenuOpen(!isMoreMenuOpen);
  const closeMoreMenu = () => setIsMoreMenuOpen(false);

  const handleLogout = () => {
    closeMoreMenu();
    if (onLogout) onLogout();
  };

  const getCategoryIcon = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || '💳';
  };

  const handleDelete = async (tx) => {
    try {
      const { error } = await supabase.rpc('delete_transaction', {
        t_type: tx.type,
        t_id: tx.id,
      });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      safeAlert('Delete failed', e.message);
    } finally {
      setShowActions(false);
      await fetchTransactions();
    }
  };

  const handleStartEdit = (tx) => {
    setShowActions(false);
    setEditTx(tx);
    setShowTransactionForm(true);
  };

  const openTransactionDetails = (tx) => {
    setSelectedTransaction(tx);
  };

  const closeTransactionDetails = () => setSelectedTransaction(null);

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'income';
    const amount = Number(item.amount) || 0;
    const categoryEmoji = getCategoryIcon(item.category);
    const isFromSMS =
      (item.payment_method && item.payment_method.toLowerCase() === 'bank') ||
      item.source === 'sms';

    return (
      <TouchableOpacity onPress={() => openTransactionDetails(item)}>
        <View style={styles.transactionItem}>
          <View style={styles.transactionLeft}>
            <View style={styles.emojiContainer}>
              <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
            </View>

            <View>
              <Text style={styles.transactionCategory}>
                {/* ✅ Extract location from note for SMS transactions */}
                {(() => {
                  if (isFromSMS && item.note && item.note.startsWith('Location: ')) {
                    const location = item.note.replace('Location: ', '');
                    return `${item.category} - ${location}`;
                  }
                  return item.category;
                })()}{' '}
                {isFromSMS && <Text style={{ fontSize: 12, color: '#008080' }}>• SMS</Text>}
              </Text>
              <Text style={styles.transactionMethod}>
                {item.payment_method || 'Cash'}
              </Text>
            </View>
          </View>

          <View style={styles.rowRight}>
            <Text
              style={[
                styles.transactionAmount,
                { color: isIncome ? '#4CAF50' : '#FF5722' },
              ]}
            >
              Rs. {amount.toFixed(2)}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}>
                <Edit3 size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(item)}>
                <Trash2 size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMonthlyItem = ({ item }) => (
    <View style={styles.monthlyItem}>
      <View style={styles.monthlyLeft}>
        <Text style={styles.monthName}>{item.month}</Text>
        <Text style={styles.monthDateRange}>{item.dateRange}</Text>
      </View>
      <View style={styles.monthlyAmounts}>
        <Text style={styles.monthlyIncome}>Rs. {item.income.toFixed(2)}</Text>
        <Text style={styles.monthlyExpense}>Rs. {item.expenses.toFixed(2)}</Text>
        <Text style={[styles.monthlyTotal, { color: item.total >= 0 ? '#4CAF50' : '#FF5722' }]}>
          Rs. {item.total.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section, index }) => {
  // ✅ Recalculate the date and weekday from the section title
  const sectionDate = new Date(section.title + 'T12:00:00'); // Force midday to avoid timezone issues
  const dayNumber = sectionDate.getDate();
  const weekday = sectionDate.toLocaleDateString('en-US', { weekday: 'short' });
  
  const headerStyle = index % 2 === 0 ? styles.dayHeaderAltA : styles.dayHeaderAltB;
  return (
    <View style={[styles.dayHeader, headerStyle]}>
      <View style={styles.dayHeaderLeft}>
        <Text style={styles.dayNumber}>{dayNumber}</Text>
        <Text style={styles.dayLabel}>{weekday}</Text>
      </View>

      <View style={styles.dayHeaderRight}>
        <View style={styles.badgeIncome}>
          <Text style={styles.badgeText}>+ Rs. {section.incomeDay.toFixed(2)}</Text>
        </View>
        <View style={styles.badgeExpense}>
          <Text style={styles.badgeText}>- Rs. {section.expenseDay.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

  /* ------------------------------- Main render ------------------------------ */
  return (
    <SafeAreaView style={styles.container}>

      <StatusBar barStyle="dark-content" backgroundColor="#008080" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="options" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Year Navigator */}
      <View style={styles.dateContainer}>
        <TouchableOpacity onPress={() => setCurrentYear(currentYear - 1)}>
          <Ionicons name="chevron-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{currentYear}</Text>
        <TouchableOpacity onPress={() => setCurrentYear(currentYear + 1)}>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SMS Imported Banner */}
      {importedFromSMS > 0 && (
        <View style={{ backgroundColor: '#E6FFFA', padding: 8 }}>
          <Text style={{ color: '#008080', textAlign: 'center' }}>
            {importedFromSMS} transactions imported from SMS
          </Text>
        </View>
      )}

      {/* SMS INPUT + BUTTON (INLINE) */}
      <View style={styles.smsRow}>
        <TextInput
          style={styles.smsInputInline}
          placeholder="Paste Bank SMS here"
          value={smsText}
          onChangeText={setSmsText}
          multiline={false}
        />
        <TouchableOpacity style={styles.smsInlineBtn} onPress={handleManualSmsImport}>
          <Text style={styles.smsBtnText}>Import SMS</Text>
        </TouchableOpacity>
      </View>

      {/* Summary inline */}
      <View style={styles.summaryInline}>
        <View style={styles.summaryInlineItem}>
          <Text style={styles.summaryInlineLabel}>Income</Text>
          <Text style={[styles.summaryInlineValue, { color: '#007AFF' }]}>
            {income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryInlineDivider} />
        <View style={styles.summaryInlineItem}>
          <Text style={styles.summaryInlineLabel}>Expense</Text>
          <Text style={[styles.summaryInlineValue, { color: '#FF3B30' }]}>
            {expenses.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryInlineDivider} />
        <View style={styles.summaryInlineItem}>
          <Text style={styles.summaryInlineLabel}>Total</Text>
          <Text style={styles.summaryInlineValue}>
            {(income - expenses).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Content */}
      {selectedTab === 'Monthly' ? (
        <View style={styles.monthlyContainer}>
          <FlatList
            data={monthlyData}
            renderItem={renderMonthlyItem}
            keyExtractor={(item) => item.month}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : selectedTab === 'Daily' ? (
        <View style={styles.transactionsContainer}>
          {dailySections.length === 0 ? (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>No transactions this month</Text>
              <Text style={styles.placeholderSubtext}>
                Add one using the + button below
              </Text>
            </View>
          ) : (
            <SectionList
              sections={dailySections}
              keyExtractor={(item) => `${item.type}:${item.id}`} // 🔧 FIX: unique, stable key
              renderItem={renderTransaction}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            />
          )}
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Summary</Text>
          <Text style={styles.placeholderSubtext}>Build your summary view here</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditTx(null);
          setShowTransactionForm(true);
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Add/Edit Form */}
     <TransactionForm
        visible={showTransactionForm}
        mode={editTx ? 'edit' : 'add'}
        existingTx={editTx}
        editTransaction={editTx} // ✅ Add this prop
        onClose={() => { setShowTransactionForm(false); setEditTx(null); }}
        onBack={() => { setShowTransactionForm(false); setEditTx(null); }}
        onTransactionComplete={handleTransactionAdded}
        onUpdate={handleTransactionUpdated}
      />

      {/* Transaction Details Modal */}
      <Modal
        visible={!!selectedTransaction}
        transparent
        animationType="fade"
        onRequestClose={closeTransactionDetails}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Transaction Details</Text>

            <Text style={styles.detailLine}>
              <Text style={styles.detailLabel}>Category: </Text>
              {selectedTransaction?.category ?? '-'}
            </Text>

            <Text style={styles.detailLine}>
              <Text style={styles.detailLabel}>Amount: </Text>
              Rs. {Number(selectedTransaction?.amount || 0).toFixed(2)}
            </Text>

            <Text style={styles.detailLine}>
              <Text style={styles.detailLabel}>Type: </Text>
              {selectedTransaction?.type}
            </Text>

            <Text style={styles.detailLine}>
              <Text style={styles.detailLabel}>Payment Method: </Text>
              {selectedTransaction?.payment_method || 'Cash'}
            </Text>

            <Text style={styles.detailLine}>
              <Text style={styles.detailLabel}>Date & Time: </Text>
              {selectedTransaction?.created_at
                ? new Date(selectedTransaction.created_at).toLocaleString()
                : '-'}
            </Text>

            {selectedTransaction?.description ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Description: </Text>
                {selectedTransaction.description}
              </Text>
            ) : null}

            {selectedTransaction?.note ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Note: </Text>
                {selectedTransaction.note}
              </Text>
            ) : null}

            {selectedTransaction?.category ? (() => {
              const rem = getRemainingForCategory(selectedTransaction.category);
              if (rem == null) return null;
              return (
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Remaining (this month): </Text>
                  Rs. {rem.toFixed(2)}
                </Text>
              );
            })() : null}

            <TouchableOpacity
              style={styles.detailsCloseBtn}
              onPress={closeTransactionDetails}
            >
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={onBack}>
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <DollarSign size={24} color="white" />
          <Text style={styles.navText}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <Wallet size={24} color="white" />
          <Text style={styles.navText}>Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={toggleMoreMenu}>
          <MoreHorizontal size={24} color="white" />
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* More Menu */}
      <MoreMenu isOpen={isMoreMenuOpen} onClose={closeMoreMenu} onLogout={handleLogout} />

      {/* Action Sheet */}
      <Modal
        transparent
        visible={showActions}
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableOpacity
          style={styles.actionsOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          <View style={styles.actionsSheet}>
            <TouchableOpacity style={styles.actionBtnSheet} onPress={() => handleStartEdit(actionTx)}>
              <Text style={styles.actionEdit}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnSheet} onPress={() => handleDelete(actionTx)}>
              <Text style={styles.actionDelete}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

/* --------------------------------- styles --------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 25,
    paddingBottom: 15,
    backgroundColor: '#008080',
  },
  headerTitle: { fontSize: 20, marginLeft: 10, fontWeight: '600', color: 'white' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginLeft: 15 },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008080',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#008080',
  },
  dateText: { color: 'white', fontSize: 18, fontWeight: '500', marginHorizontal: 20 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#008080',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: 'white' },
  tabText: { color: '#D3D3D3', fontSize: 12, fontWeight: '500' },
  activeTabText: { color: 'white' },

  /* --- SMS inline row --- */
  smsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  smsInputInline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  smsInlineBtn: {
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#F87171',
    borderRadius: 8,
    justifyContent: 'center',
  },
  smsBtnText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },

  /* Summary inline row (Income | Expense | Total) */
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

  monthlyContainer: { flex: 1, backgroundColor: 'white', paddingHorizontal: 20 },
  monthlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthlyLeft: { flex: 1 },
  monthName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  monthDateRange: { fontSize: 12, color: '#666', marginTop: 2 },
  monthlyAmounts: { alignItems: 'flex-end' },
  monthlyIncome: { fontSize: 14, color: '#007AFF', marginBottom: 2 },
  monthlyExpense: { fontSize: 14, color: '#FF3B30', marginBottom: 2 },
  monthlyTotal: { fontSize: 14, fontWeight: 'bold' },

  transactionsContainer: { flex: 1, backgroundColor: 'white', paddingHorizontal: 0 },

  /* Day section header */
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dayHeaderAltA: {
    backgroundColor: '#F0FFFD',
  },
  dayHeaderAltB: {
    backgroundColor: '#F9FFFC',
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  dayNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  dayLabel: {
    fontSize: 12,
    color: 'white',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  badgeIncome: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeExpense: {
    backgroundColor: '#FDECEA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center' },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryEmoji: { fontSize: 20 },
  transactionCategory: { fontSize: 16, fontWeight: '500', color: '#333' },
  transactionMethod: { fontSize: 14, color: '#666', marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '500' },

  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F87171',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  placeholderSubtext: { fontSize: 14, color: '#666' },

  bottomNav: {
    backgroundColor: '#008080',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  navItem: { alignItems: 'center' },
  navItemInactive: { opacity: 0.7 },
  navText: { color: 'white', fontSize: 12, marginTop: 4 },

  // More Menu
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
  // Action Sheet
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  actionsSheet: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  actionBtn: {
    paddingHorizontal: 6,
  },
  actionBtnSheet: { paddingVertical: 16, alignItems: 'center' },
  actionEdit: { color: '#008080', fontSize: 16, fontWeight: '600' },
  actionDelete: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },

  // Details modal
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  detailsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  detailLine: { marginTop: 6, lineHeight: 20, color: '#333' },
  detailLabel: { fontWeight: '600' },
  detailsCloseBtn: {
    marginTop: 16,
    backgroundColor: '#008080',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
