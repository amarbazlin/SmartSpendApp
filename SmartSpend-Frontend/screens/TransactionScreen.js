// TransactionsScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, Modal,
  Alert, StatusBar, Platform, FlatList, SectionList, PermissionsAndroid, TextInput, ActivityIndicator,
} from 'react-native';
import {
  Home, Edit3, Trash2, Wallet, DollarSign, MoreHorizontal, Lock, X, Bell, Palette, Globe, LogOut,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { supabase } from '../services/supabase';
import TransactionForm from './Transaction';

const SmsAndroid = Platform.OS === 'android' ? require('react-native-get-sms-android') : null;
const ymdLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseBankSMS = (sms) => {
  if (!sms || typeof sms !== 'string') return null;
  const body = sms.replace(/\s+/g, ' ').trim();
  if (/(OTP|One[-\s]?Time\s*Password|verification code|promo|offer|points|reward)/i.test(body)) return null;

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
    if (m) { rawAmount = m[2] || m[1]; if (rawAmount) break; }
  }
  if (!rawAmount) return null;

  const amount = parseFloat(rawAmount.replace(/,/g, ''));
  if (!isFinite(amount)) return null;

  const expenseTriggers = [
    'debited','spent','purchase','withdraw','cash wd','payment','bill','tap&go','tap & go',
    'lankaqr','qr payment','transfer from','standing order','so executed','charge','fee','cash advance','pre-auth completion',
  ];
  const incomeTriggers = ['credited','received','salary','deposit','loan disbursement','reversal','refund','interest','fd'];

  const expenseRegex = new RegExp(expenseTriggers.join('|'), 'i');
  const incomeRegex  = new RegExp(incomeTriggers.join('|'), 'i');
  let type = null;
  if (incomeRegex.test(body) && !expenseRegex.test(body)) type = 'income';
  else if (expenseRegex.test(body) && !incomeRegex.test(body)) type = 'expense';
  else { if (/debited/i.test(body)) type = 'expense'; else if (/credited/i.test(body)) type = 'income'; }
  if (!type) return null;

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

  let merchant = null;
  let merchantMatch =
    body.match(/\bat\s+([A-Za-z0-9 &\-\.\(\)\/]+?)(?=(?: on |\d{2}\.\d{2}\.\d{2}|\d{2}\/\d{2}| \d{4}-\d{2}-\d{2}| using | via | Acc | Card |$|\.|,))/i) ||
    body.match(/\bto\s+([A-Za-z0-9 &\-\.\(\)\/]+?)(?=(?: on |\d{2}\.\d{2}\.\d{2}|\d{2}\/\d{2}| \d{4}-\d{2}-\d{2}| using | via | Acc | Card |$|\.|,))/i) ||
    body.match(/Location\s*:\s*([^,]+)/i);
  if (merchantMatch && merchantMatch[1]) merchant = merchantMatch[1].trim();

  return { type, category, merchant: merchant || 'Unknown', amount, description: sms, account: 'Bank' };
};

const localeFor = (lang) => (lang === 'si' ? 'si-LK' : lang === 'ta' ? 'ta-IN' : 'en-US');

/* ----------------------------- More Menu modal ---------------------------- */
const MoreMenu = ({ isOpen, onClose, onLogout, navigation }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [loading, setLoading] = useState(true);

  const goToLanguage = () => { onClose?.(); setTimeout(() => navigation?.navigate?.('LanguageSettings'), 0); };

  useEffect(() => {
    if (!isOpen) return;
    const loadUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) { setName(''); setEmail(''); return; }
        setEmail(user.email ?? '');
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.username || '';
        if (metaName) { setName(metaName); return; }
        const { data: profileById } = await supabase.from('users').select('name,email').eq('id', user.id).maybeSingle();
        if (profileById?.name) { setName(profileById.name); return; }
        const { data: profileByEmail } = await supabase.from('users').select('name').eq('email', user.email).maybeSingle();
        setName(profileByEmail?.name || '');
      } catch (e) {
        console.warn('Error loading profile', e);
      } finally { setLoading(false); }
    };
    loadUser();
  }, [isOpen]);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.moreModalOverlay}>
        <TouchableOpacity style={styles.moreBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.moreMenu}>
          <ScrollView style={styles.moreMenuContent}>
            <View style={styles.moreMenuHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileImage}>
                  <Image source={require('./images/App_Logo.png')} style={styles.profileImageContent} resizeMode="cover" />
                </View>
                {loading ? <ActivityIndicator size="small" color="#6B7280" /> : (
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{name || '—'}</Text>
                    <Text style={styles.profileEmail}>{email}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={20} color="#6B7280" /></TouchableOpacity>
            </View>

            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem}>
                <Lock size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.menuItemTitle}>{t('menu.passcode')}</Text><Text style={styles.menuItemSubtitle}>OFF</Text></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <DollarSign size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.menuItemTitle}>{t('menu.mainCurrency')}</Text><Text style={styles.menuItemSubtitle}>LKR(Rs.)</Text></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Wallet size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.menuItemTitle}>{t('menu.subCurrency')}</Text></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Bell size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.menuItemTitle}>{t('menu.alarm')}</Text></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Palette size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.menuItemTitle}>{t('menu.style')}</Text></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={goToLanguage}>
                <Globe size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.menuItemTitle}>{t('menu.language')}</Text></View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={onLogout}>
                <LogOut size={20} color="#EF4444" style={styles.menuIcon} />
                <View style={styles.menuItemContent}><Text style={styles.logoutText}>{t('menu.logout')}</Text></View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ------------------------------- Main Screen ------------------------------- */
export default function TransactionsScreen({ onBack, onLogout, navigation }) {
  const { t } = useTranslation();
  const lang = i18n.language;
  const locale = localeFor(lang);

  const isSubmittingRef = useRef(false);
  const alertLockRef = useRef(false);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('daily'); // 'daily' | 'monthly' | 'summary'
  const [typeFilter, setTypeFilter] = useState('all');     // 'all' | 'income' | 'expense'

  const [transactions, setTransactions] = useState([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);

  const [categories, setCategories] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTx, setEditTx] = useState(null);

  const [importedFromSMS, setImportedFromSMS] = useState(0);
  const [smsText, setSmsText] = useState('');

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const today = new Date();
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const nextMonthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 1), [today]);

  const tabs = useMemo(
    () => ([
      { key: 'daily',   label: t('tx.tabs.daily') },
      { key: 'monthly', label: t('tx.tabs.monthly') },
      { key: 'summary', label: t('tx.tabs.summary') },
    ]),
    [t, lang]
  );

  /* -------------------------------- Helpers -------------------------------- */
  const safeAlert = useCallback((title, message) => {
    if (alertLockRef.current) return;
    alertLockRef.current = true;
    Alert.alert(title, message, [{ text: t('common.ok', 'OK'), onPress: () => { alertLockRef.current = false; } }]);
  }, [t]);

  const confirmDelete = (tx) => {
    Alert.alert(
      t('common.delete'),
      t('tx.deleteConfirm'),
      [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: () => deleteTransaction(tx) }]
    );
  };

  const deleteTransaction = async (tx) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const table = tx.type === 'income' ? 'income' : 'expenses';
      const { error } = await supabase.from(table).delete().eq('id', tx.id).eq('user_id', user.id);
      if (error) throw error;
      await fetchTransactions();
    } catch (e) {
      console.error('deleteTransaction error', e);
      safeAlert(t('common.error'), e.message || 'Failed to delete');
    }
  };

  const startEdit = (tx) => {
    const editTransaction = {
      ...tx,
      account: tx.payment_method === 'Bank' ? 'Bank' : tx.payment_method || 'Cash',
      category: tx.category,
    };
    setEditTx(editTransaction);
    setShowTransactionForm(true);
  };

  const getMonthBoundsFromDateString = (dateStr) => {
    const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
  };

  const getMonthlyTotalsForDate = useCallback((dateStr) => {
    const { start, end } = getMonthBoundsFromDateString(dateStr);
    let inc = 0, exp = 0;
    for (const t of transactions) {
      const td = t.date ? new Date(`${t.date}T00:00:00`) : new Date();
      if (td >= start && td < end) {
        if (t.type === 'income') inc += Number(t.amount || 0);
        else if (t.type === 'expense') exp += Number(t.amount || 0);
      }
    }
    return { inc, exp, start, end };
  }, [transactions]);

  const handleTransactionAdded = useCallback(async (t) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { safeAlert(t('common.error'), t('tx.msg.noUser', 'No user session')); return; }

      const amt = Number(t.amount);
      if (!isFinite(amt)) { throw new Error('Parsed amount is invalid'); }
      const localDate = t.date || ymdLocal(new Date());

      if (t.type === 'expense') {
        const { inc, exp } = getMonthlyTotalsForDate(localDate);
        const available = inc - exp;
        if (amt > available) {
          safeAlert(t('tx.guard.title', 'Not allowed'), t('tx.guard.msg', { amount: available.toFixed(2) }));
          return;
        }
      }

      let catId = t.category_id ?? null;
      if (!catId && t.category) {
        const { data: catRow, error: catErr } = await supabase.from('categories').select('id').eq('name', t.category).maybeSingle();
        if (!catErr && catRow?.id) catId = catRow.id;
        else {
          const { data: otherRow } = await supabase.from('categories').select('id').eq('name', 'Other').maybeSingle();
          if (otherRow?.id) catId = otherRow.id;
        }
      }

      if (t.type === 'income') {
        const { error } = await supabase.from('income').insert([{ user_id: user.id, source: t.category || 'Other', amount: amt, date: localDate, note: t.note || null }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([{
          user_id: user.id, category_id: catId, amount: amt, payment_method: t.account || 'Cash',
          note: t.note || (t.merchant ? `Location: ${t.merchant}` : null), description: t.description || null, date: localDate,
        }]); if (error) throw error;
      }

      await fetchTransactions();
      setShowTransactionForm(false);
      safeAlert(t('common.success'), t('tx.msg.added', 'Transaction added successfully'));
    } catch (error) {
      console.error('Error adding transaction:', error);
      safeAlert(t('common.error'), error.message || 'Failed to add transaction');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [fetchTransactions, safeAlert, getMonthlyTotalsForDate, t]);

  const handleTransactionUpdated = useCallback(async (payload) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      if (editTx && editTx.type === 'expense') {
        const targetDate = editTx.date || ymdLocal(new Date());
        const { inc, exp } = getMonthlyTotalsForDate(targetDate);

        const currentAmt = Number(editTx.amount || 0);
        const proposedAmt = Number(payload.amount);

        const availableIfWeRemoveOriginal = inc - (exp - currentAmt);
        if (proposedAmt > availableIfWeRemoveOriginal) {
          safeAlert(
            t('tx.guard.title', 'Not allowed'),
            t('tx.guard.msg', { amount: availableIfWeRemoveOriginal.toFixed(2) })
          );
          return;
        }
      }

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
      safeAlert(t('common.success'), t('tx.msg.updated', 'Transaction updated successfully'));
    } catch (e) {
      console.error(e);
      safeAlert(t('common.error'), e.message);
    } finally { isSubmittingRef.current = false; }
  }, [editTx, fetchTransactions, safeAlert, getMonthlyTotalsForDate, t]);

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
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      const seen = new Set();
      const deduped = [];
      for (const t of data || []) {
        const key = `${t.type}:${t.id}`;
        if (!seen.has(key)) { seen.add(key); deduped.push(t); }
      }
      setTransactions(deduped);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      safeAlert(t('common.error'), t('tx.msg.fetchFail', 'Failed to fetch transactions'));
    }
  }, [safeAlert, t]);

  const calculateMonthTotals = useCallback((transactionData) => {
    const monthTx = transactionData.filter((t) => {
      const dt = t.date ? new Date(`${t.date}T00:00:00`) : new Date();
      return dt >= monthStart && dt < nextMonthStart;
    });
    const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalExpenses = monthTx.filter((t) => t.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);
    setIncome(totalIncome); setExpenses(totalExpenses);
  }, [monthStart, nextMonthStart]);

  const generateMonthlyData = useCallback(() => {
    const monthlyStats = Array.from({ length: 12 }, (_, index) => {
      const monthName = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(currentYear, index, 1));
      const monthTransactions = transactions.filter((transaction) => {
        const dt = transaction.date ? new Date(`${transaction.date}T00:00:00`) : new Date();
        return dt.getFullYear() === currentYear && dt.getMonth() === index;
      });

      const monthIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const monthExpenses = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

      const startDate = `${String(index + 1).padStart(2, '0')}/01`;
      const endDate = `${String(index + 1).padStart(2, '0')}/${new Date(currentYear, index + 1, 0).getDate()}`;

      return { month: monthName, dateRange: `${startDate} ~ ${endDate}`, income: monthIncome, expenses: monthExpenses, total: monthIncome - monthExpenses };
    });
    setMonthlyData(monthlyStats);
  }, [transactions, currentYear, locale]);

  const getDailyTotals = useCallback((date = new Date()) => {
    const y = date.getFullYear(); const m = date.getMonth(); const d = date.getDate();
    let incomeDay = 0, expenseDay = 0;
    const todayKey = ymdLocal(new Date(y, m, d));
    transactions.forEach((t) => {
      const key = t.date || ymdLocal(new Date());
      if (key === todayKey) { if (t.type === 'income') incomeDay += Number(t.amount) || 0; else expenseDay += Number(t.amount) || 0; }
    });
    return { incomeDay, expenseDay };
  }, [transactions]);

  const filteredTransactions = useMemo(() => (typeFilter === 'all' ? transactions : transactions.filter((t) => t.type === typeFilter)), [transactions, typeFilter]);

  const currentMonthTransactions = useMemo(() => filteredTransactions.filter((t) => {
    const dt = t.date ? new Date(`${t.date}T00:00:00`) : new Date();
    return dt >= monthStart && dt < nextMonthStart;
  }), [filteredTransactions, monthStart, nextMonthStart]);

  const dailySections = useMemo(() => {
    const map = new Map();
    currentMonthTransactions.forEach((t) => {
      const key = t.date || ymdLocal(new Date());
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });

    const sections = Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([dateKey, items], idx) => {
        const [year, month, day] = dateKey.split('-');
        const d = new Date(Number(year), Number(month) - 1, Number(day));

        const incomeDay = items.filter((x) => x.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
        const expenseDay = items.filter((x) => x.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);

        return {
          title: dateKey,
          dayNumber: d.getDate(),
          weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
          incomeDay, expenseDay, data: items, alt: idx % 2 === 0,
        };
      });

    return sections;
  }, [currentMonthTransactions, locale]);

  const { incomeDay, expenseDay } = getDailyTotals(new Date());

  const getRemainingForCategory = useCallback((categoryName) => {
    const name = categoryName || 'Other';
    const cat = categories.find((c) => c.name === name);
    if (!cat || typeof cat.budget_limit !== 'number') return null;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const spent = transactions
      .filter((t) => t.type === 'expense' && (t.category || 'Other') === name && (t.date ? new Date(`${t.date}T00:00:00`) : new Date()) >= start)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return cat.budget_limit - spent;
  }, [categories, transactions]);

  /* --------------------------- Permissions / SMS --------------------------- */
  const readBankMessages = useCallback(async () => {
    if (Platform.OS !== 'android' || !SmsAndroid) return;
    const existingBodies = new Set(transactions.map((t) => t.description));
    let inserted = 0;

    const bankSenders = ['COMBANK','CMB','HNB','SAMPATH','BOC','PEOPLES','PB','NDB','SEYLAN','DFCC','NTB','AMEX','NTBAMEX','PABC','PAN ASIA','PANASIA','UNION','UB','UBL','HSBC','SCB','STANDARDCHARTERED','NSB','CARGILLS'];

    try {
      for (const sender of bankSenders) {
        const filter = { box: 'inbox', address: sender, maxCount: 50 };
        await new Promise((resolve) => {
          SmsAndroid.list(
            JSON.stringify(filter),
            () => resolve(),
            async (_count, smsList) => {
              let messages = []; try { messages = JSON.parse(smsList) ?? []; } catch { resolve(); return; }
              for (const msg of messages) {
                const parsed = parseBankSMS(msg.body);
                if (!parsed) continue;
                if (existingBodies.has(msg.body)) continue;

                await handleTransactionAdded({
                  type: parsed.type, category: parsed.category, merchant: parsed.merchant,
                  amount: parsed.amount, description: msg.body, account: parsed.account, date: ymdLocal(new Date()),
                });

                existingBodies.add(msg.body); inserted += 1;
              }
              resolve();
            }
          );
        });
      }
      if (inserted > 0) {
        setImportedFromSMS((prev) => prev + inserted);
        safeAlert(t('home.sms.title', 'SMS import'), t('home.sms.imported', { count: inserted }));
      }
    } catch (e) {
      console.error('[SMS] Fatal error:', e);
    }
  }, [transactions, handleTransactionAdded, safeAlert, t]);

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
      if (granted === PermissionsAndroid.RESULTS.GRANTED) await readBankMessages();
    } catch (err) { console.warn(err); }
  }, [readBankMessages]);

  const handleManualSmsImport = () => {
    if (!smsText.trim()) { safeAlert(t('common.error'), t('home.sms.enterText', 'Please enter the SMS text.')); return; }
    const parsed = parseBankSMS(smsText);
    if (!parsed) { safeAlert(t('common.error'), t('home.sms.parseFail', 'Could not parse SMS text.')); return; }
    handleTransactionAdded({
      type: parsed.type, category: parsed.category, merchant: parsed.merchant,
      amount: parsed.amount, description: smsText, account: parsed.account, date: ymdLocal(new Date()),
    });
    setSmsText('');
  };

  useEffect(() => { fetchTransactions(); fetchCategories(); if (Platform.OS === 'android') requestSMSPermission(); }, []);
  useEffect(() => { calculateMonthTotals(transactions); }, [transactions, calculateMonthTotals]);
  useEffect(() => { if (selectedTab === 'monthly') generateMonthlyData(); }, [selectedTab, transactions, currentYear, generateMonthlyData, lang]);

  const toggleMoreMenu = () => setIsMoreMenuOpen((x)=>!x);
  const closeMoreMenu  = () => setIsMoreMenuOpen(false);
  const handleLogout = async () => { closeMoreMenu(); const { error } = await supabase.auth.signOut(); if (!error) onLogout?.(); };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName || 'Other';
    const category = categories.find((cat) => cat.name === name);
    return category?.icon || '💳';
  };

  const openTransactionDetails = (tx) => setSelectedTransaction(tx);
  const closeTransactionDetails = () => setSelectedTransaction(null);

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'income';
    const amount = Number(item.amount) || 0;
    const displayCategory = item.category || 'Other';
    const categoryEmoji = getCategoryIcon(displayCategory);
    const isFromSMS = (item.payment_method && item.payment_method.toLowerCase() === 'bank') || item.source === 'sms';

    const leftTitle = (() => {
      const location = item.note && item.note.startsWith('Location: ') ? item.note.replace('Location: ', '') : null;
      return location ? `${displayCategory} - ${location}` : displayCategory;
    })();

    return (
      <TouchableOpacity onPress={() => openTransactionDetails(item)}>
        <View style={styles.transactionItem}>
          <View style={styles.transactionLeft}>
            <View style={styles.emojiContainer}><Text style={styles.categoryEmoji}>{categoryEmoji}</Text></View>
            <View style={styles.transactionTextWrap}>
              <Text style={styles.transactionCategory} numberOfLines={1} ellipsizeMode="tail">
  {t(`categories.${(displayCategory || 'other').toLowerCase()}`, displayCategory)}
  {isFromSMS && <Text style={{ fontSize: 12, color: '#008080' }}> • SMS</Text>}
</Text>
<Text style={styles.transactionMethod} numberOfLines={1} ellipsizeMode="tail">
  {t(`tx.labels.${(item.payment_method || 'cash').toLowerCase()}`, item.payment_method || 'Cash')}
</Text>

            </View>
          </View>

          <View style={styles.rowRight}>
            <Text style={[styles.transactionAmount, { color: isIncome ? '#4CAF50' : '#FF5722' }]}>
              Rs. {amount.toFixed(2)}
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}><Edit3 size={18} color="#9CA3AF" /></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(item)}><Trash2 size={18} color="#9CA3AF" /></TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => {
    const [year, month, day] = section.title.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const headerStyle = section.alt ? styles.dayHeaderAltA : styles.dayHeaderAltB;

    return (
      <View style={[styles.dayHeader, headerStyle]}>
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayNumber}>{d.getDate()}</Text>
          <Text style={styles.dayLabel}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)}</Text>
        </View>
        <View style={styles.dayHeaderRight}>
          <View style={styles.badgeIncome}><Text style={styles.badgeText}>+ Rs. {section.incomeDay.toFixed(2)}</Text></View>
          <View style={styles.badgeExpense}><Text style={styles.badgeText}>- Rs. {section.expenseDay.toFixed(2)}</Text></View>
        </View>
      </View>
    );
  };

  const renderMonthlyItem = ({ item }) => (
    <View style={styles.monthlyItem}>
      <View style={styles.monthlyLeft}>
        <Text style={styles.monthName}>{item.month}</Text>
        <Text style={styles.monthDateRange}>{item.dateRange}</Text>
      </View>
      <View style={styles.monthlyAmounts}>
        <Text style={styles.monthlyIncome}>+ Rs. {item.income.toFixed(2)}</Text>
        <Text style={styles.monthlyExpense}>- Rs. {item.expenses.toFixed(2)}</Text>
        <Text style={styles.monthlyTotal}>Rs. {item.total.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#008080" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity><Ionicons name="search" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tx.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}><Ionicons name="options" size={24} color="white" /></TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary inline (clickable filter) */}
      <View style={styles.summaryInline}>
        <TouchableOpacity style={styles.summaryInlineItem} onPress={() => setTypeFilter('income')} activeOpacity={0.8}>
          <Text style={styles.summaryInlineLabel}>{t('tx.inline.income')}</Text>
          <Text style={[styles.summaryInlineValue, { color: '#007AFF' }, typeFilter === 'income' && { textDecorationLine: 'underline' }]}>
            {income.toFixed(2)}
          </Text>
        </TouchableOpacity>

        <View style={styles.summaryInlineDivider} />

        <TouchableOpacity style={styles.summaryInlineItem} onPress={() => setTypeFilter('expense')} activeOpacity={0.8}>
          <Text style={styles.summaryInlineLabel}>{t('tx.inline.expense')}</Text>
          <Text style={[styles.summaryInlineValue, { color: '#FF3B30' }, typeFilter === 'expense' && { textDecorationLine: 'underline' }]}>
            {expenses.toFixed(2)}
          </Text>
        </TouchableOpacity>

        <View style={styles.summaryInlineDivider} />

        <TouchableOpacity style={styles.summaryInlineItem} onPress={() => setTypeFilter('all')} activeOpacity={0.8}>
          <Text style={styles.summaryInlineLabel}>{t('tx.inline.total')}</Text>
          <Text style={[styles.summaryInlineValue, typeFilter === 'all' && { textDecorationLine: 'underline' }]}>
            {(income - expenses).toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {selectedTab === 'monthly' ? (
        <View style={styles.monthlyContainer}>
          <FlatList data={monthlyData} renderItem={renderMonthlyItem} keyExtractor={(item, idx) => `${item.month}-${idx}`} showsVerticalScrollIndicator={false} />
        </View>
      ) : selectedTab === 'daily' ? (
        <View style={styles.transactionsContainer}>
          {dailySections.length === 0 ? (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>{t('tx.empty.title')}</Text>
              <Text style={styles.placeholderSubtext}>{t('tx.empty.subtitle')}</Text>
            </View>
          ) : (
            <SectionList
              sections={dailySections}
              keyExtractor={(item) => `${item.type}:${item.id}`}
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
          <Text style={styles.placeholderText}>{t('tx.tabs.summary')}</Text>
          <Text style={styles.placeholderSubtext}>Build your summary view here</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.addButton} onPress={() => { setEditTx(null); setShowTransactionForm(true); }}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Add/Edit Form */}
      <TransactionForm
        visible={showTransactionForm}
        mode={editTx ? 'edit' : 'add'}
        existingTx={editTx}
        editTransaction={editTx}
        onClose={() => { setShowTransactionForm(false); setEditTx(null); }}
        onBack={() => { setShowTransactionForm(false); setEditTx(null); }}
        onTransactionComplete={handleTransactionAdded}
        onUpdate={handleTransactionUpdated}
      />

      {/* Transaction Details Modal */}
      <Modal visible={!!selectedTransaction} transparent animationType="fade" onRequestClose={closeTransactionDetails}>
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{t('tx.details.title')}</Text>
            <Text style={styles.detailLine}>
  <Text style={styles.detailLabel}>{t('tx.details.category')}: </Text>
  {t(`categories.${(selectedTransaction?.category || 'other').toLowerCase()}`, selectedTransaction?.category || 'Other')}
</Text>
            <Text style={styles.detailLine}><Text style={styles.detailLabel}>{t('tx.details.amount')}: </Text>Rs. {Number(selectedTransaction?.amount || 0).toFixed(2)}</Text>
            <Text style={styles.detailLine}>
  <Text style={styles.detailLabel}>{t('tx.details.type')}: </Text>
  {t(`tx.inline.${selectedTransaction?.type}`, selectedTransaction?.type)}
</Text>
            <Text style={styles.detailLine}>
  <Text style={styles.detailLabel}>{t('tx.details.paymentMethod')}: </Text>
  {t(`tx.labels.${(selectedTransaction?.payment_method || 'cash').toLowerCase()}`, selectedTransaction?.payment_method || 'Cash')}
</Text>
            <Text style={styles.detailLine}><Text style={styles.detailLabel}>{t('tx.details.date')}: </Text>{selectedTransaction?.date ?? '-'}</Text>

            {selectedTransaction?.description ? (
              <Text style={styles.detailLine}><Text style={styles.detailLabel}>Description: </Text>{selectedTransaction.description}</Text>
            ) : null}

            {selectedTransaction?.note ? (
              <Text style={styles.detailLine}><Text style={styles.detailLabel}>{t('tx.details.note')}: </Text>{selectedTransaction.note}</Text>
            ) : null}

            {selectedTransaction?.category ? (() => {
              const rem = getRemainingForCategory(selectedTransaction.category);
              if (rem == null) return null;
              return <Text style={styles.detailLine}><Text style={styles.detailLabel}>{t('tx.details.remaining')}: </Text>Rs. {rem.toFixed(2)}</Text>;
            })() : null}

            <TouchableOpacity style={styles.detailsCloseBtn} onPress={closeTransactionDetails}>
              <Text style={{ color: 'white' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={onBack}>
          <Home size={24} color="white" /><Text style={styles.navText}>{t('nav.home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <DollarSign size={24} color="white" /><Text style={styles.navText}>{t('nav.transactions')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <Wallet size={24} color="white" /><Text style={styles.navText}>{t('nav.accounts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={toggleMoreMenu}>
          <MoreHorizontal size={24} color="white" /><Text style={styles.navText}>{t('nav.more')}</Text>
        </TouchableOpacity>
      </View>

      {/* More Menu */}
      <MoreMenu isOpen={isMoreMenuOpen} onClose={closeMoreMenu} onLogout={handleLogout} navigation={navigation} />
    </SafeAreaView>
  );
}

/* --------------------------------- styles --------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 25, paddingBottom: 15, backgroundColor: '#008080' },
  headerTitle: { fontSize: 20, marginLeft: 10, fontWeight: '600', color: 'white' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginLeft: 15 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#008080', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: 'white' },
  tabText: { color: '#D3D3D3', fontSize: 12, fontWeight: '500' },
  activeTabText: { color: 'white' },

  summaryInline: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginTop: 8, marginBottom: 12,
    paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6',
  },
  summaryInlineItem: { flex: 1, alignItems: 'center' },
  summaryInlineDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
  summaryInlineLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  summaryInlineValue: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  monthlyContainer: { flex: 1, backgroundColor: 'white', paddingHorizontal: 20 },
  monthlyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  monthlyLeft: { flex: 1 },
  monthName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  monthDateRange: { fontSize: 12, color: '#666', marginTop: 2 },
  monthlyAmounts: { alignItems: 'flex-end' },
  monthlyIncome: { fontSize: 14, color: '#007AFF', marginBottom: 2 },
  monthlyExpense: { fontSize: 14, color: '#FF3B30', marginBottom: 2 },
  monthlyTotal: { fontSize: 14, fontWeight: 'bold' },

  transactionsContainer: { flex: 1, backgroundColor: 'white', paddingHorizontal: 0 },

  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  dayHeaderAltA: { backgroundColor: '#F0FFFD' },
  dayHeaderAltB: { backgroundColor: '#F9FFFC' },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  dayNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  dayLabel: { fontSize: 12, color: 'white', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  badgeIncome: { backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6 },
  badgeExpense: { backgroundColor: '#FDECEA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },

  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: 'white' },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  emojiContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryEmoji: { fontSize: 20 },
  transactionTextWrap: { flex: 1, minWidth: 0 },
  transactionCategory: { fontSize: 16, fontWeight: '500', color: '#333', flexShrink: 1 },
  transactionMethod: { fontSize: 14, color: '#666', marginTop: 2, flexShrink: 1 },
  rowRight: { alignItems: 'flex-end', marginLeft: 8, minWidth: 90 },
  transactionAmount: { fontSize: 16, fontWeight: '500' },

  addButton: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#F87171', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },

  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  placeholderSubtext: { fontSize: 14, color: '#666' },

  bottomNav: { backgroundColor: '#008080', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  navItem: { alignItems: 'center' },
  navItemInactive: { opacity: 0.7 },
  navText: { color: 'white', fontSize: 12, marginTop: 4 },

  moreModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  moreBackdrop: { flex: 1 },
  moreMenu: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  moreMenuContent: { padding: 24 },
  moreMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  profileSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profileImage: { width: 48, height: 48, backgroundColor: '#008080', borderRadius: 24, overflow: 'hidden', marginRight: 12 },
  profileImageContent: { width: '100%', height: '100%' },
  profileName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  profileEmail: { fontSize: 14, color: '#6B7280' },
  closeButton: { padding: 8 },
  menuItems: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  menuIcon: { marginRight: 16 },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  menuItemSubtitle: { fontSize: 14, color: '#6B7280' },
  logoutItem: { marginTop: 32, backgroundColor: '#FEF2F2' },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#EF4444' },

  actionsRow: { flexDirection: 'row', marginTop: 6 },
  actionBtn: { paddingHorizontal: 6 },

  detailsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailsCard: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' },
  detailsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  detailLine: { marginTop: 6, lineHeight: 20, color: '#333' },
  detailLabel: { fontWeight: '600' },
  detailsCloseBtn: { marginTop: 16, backgroundColor: '#008080', padding: 10, borderRadius: 8, alignItems: 'center' },
});
