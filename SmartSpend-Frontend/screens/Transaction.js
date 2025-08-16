// Transaction.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  RefreshCw,
  Info,
  Camera,
  Edit3,
  X,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';

/* ----------------------- date helpers ----------------------- */
const ymdLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
const monthStartISO = () => {
  const firstDay = new Date();
  firstDay.setDate(1);
  return firstDay.toISOString().slice(0, 10);
};

/* --------------------- constants --------------------- */
const DEFAULT_INCOME_ICON = '💼';
const DEFAULT_EXPENSE_ICON = '📝';
const DEFAULT_COLOR = '#E8E8E8';

const TransactionForm = ({
  visible,
  onClose = () => {},
  transactionType = 'expense',
  onBack,
  onTransactionComplete,
  mode = 'add',
  editTransaction,
  onUpdate,
  availableThisMonth = Number.POSITIVE_INFINITY,
}) => {
  const [selectedTab, setSelectedTab] = useState(transactionType);
  const [date] = useState(
    new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      weekday: 'short',
    })
  );

  const [userId, setUserId] = useState(null);

  // pickers / categories
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [category, setCategory] = useState('');

  // budget limits map (expense categories only)
  const [limitByCategoryId, setLimitByCategoryId] = useState({});

  // registration-chosen expense names (for filtering)
  const [regChosenExpenseNames, setRegChosenExpenseNames] = useState(null);

  // form fields
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('Cash');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');

  // pickers visibility
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // income category add modal
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeEmoji, setNewIncomeEmoji] = useState('');

  // income edit mode for delete UI
  const [editIncomeMode, setEditIncomeMode] = useState(false);

  const [accounts, setAccounts] = useState([
    { name: 'Cash', emoji: '💵' },
    { name: 'Bank', emoji: '🏦' },
  ]);

  /* --------------------- load data --------------------- */
  useEffect(() => {
    (async () => {
      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) return;
        const uid = userResp.user.id;
        setUserId(uid);

        // get registration-chosen categories to filter expense picker
        const { data: userRow, error: uErr } = await supabase
          .from('users')
          .select('spending_categories')
          .eq('id', uid)
          .maybeSingle();
        if (!uErr && userRow?.spending_categories && Array.isArray(userRow.spending_categories)) {
          setRegChosenExpenseNames(
            new Set(userRow.spending_categories.map((n) => String(n).trim().toLowerCase()))
          );
        } else {
          setRegChosenExpenseNames(null);
        }

        await ensureDefaultSalary(uid);
        await loadCategoriesFromSupabase(uid);
        await loadAccountsFromSupabase();
      } catch (e) {
        console.error('init load error:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && editTransaction) {
      setSelectedTab(editTransaction.type || 'expense');
      setAmount(String(editTransaction.amount || ''));
      setCategory(editTransaction.category || '');
      setAccount(editTransaction.payment_method || editTransaction.account || 'Cash');
      setNote(editTransaction.note || '');
      setDescription(editTransaction.description || '');

      const allCategories = [...categories.income, ...categories.expense];
      const found = allCategories.find((c) => c.name === editTransaction.category);
      if (found) setSelectedCategoryId(found.id);
      else setSelectedCategoryId(editTransaction.category_id || null);
    }
  }, [mode, editTransaction, categories]);

  /* ---------------- ensure "Salary" exists ---------------- */
  const ensureDefaultSalary = async (uid) => {
    try {
      const { data: have, error: qErr } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', uid)
        .eq('type', 'income')
        .eq('name', 'Salary')
        .maybeSingle();
      if (qErr) throw qErr;
      if (!have) {
        const { error: insErr } = await supabase.from('categories').insert([
          {
            user_id: uid,
            type: 'income',
            name: 'Salary',
            icon: DEFAULT_INCOME_ICON,
            color: DEFAULT_COLOR,
            limit_: 0,
          },
        ]);
        if (insErr) console.log('ensureDefaultSalary insert warn:', insErr.message);
      }
    } catch (e) {
      console.log('ensureDefaultSalary error:', e?.message);
    }
  };

  /* --------------------- load categories --------------------- */
  const loadCategoriesFromSupabase = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, type, user_id, limit_')
        .eq('user_id', uid);
      if (error) throw error;

      const incomeRows = (data || []).filter((c) => c.type === 'income');
      const incomeCategories = incomeRows.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.icon || DEFAULT_INCOME_ICON,
      }));

      let expenseRows = (data || []).filter((c) => c.type === 'expense');
      if (regChosenExpenseNames && regChosenExpenseNames.size > 0) {
        expenseRows = expenseRows.filter((c) =>
          regChosenExpenseNames.has(String(c.name).trim().toLowerCase())
        );
      }
      const expenseCategories = expenseRows.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.icon || DEFAULT_EXPENSE_ICON,
      }));

      const limitsMap = {};
      for (const r of expenseRows) limitsMap[r.id] = Number(r.limit_ || 0);

      setLimitByCategoryId(limitsMap);
      setCategories({ income: incomeCategories, expense: expenseCategories });
    } catch (e) {
      console.error('loadCategoriesFromSupabase error:', e);
    }
  };

  /* --------------------- load accounts --------------------- */
  const loadAccountsFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw error;
      if (data?.length) {
        setAccounts(
          data.map((acc) => ({
            name: acc.name,
            emoji: '💳',
          }))
        );
      }
    } catch (e) {
      console.error('loadAccountsFromSupabase error:', e);
    }
  };

  /* --------------------- validators --------------------- */
  const validateFormBasics = () => {
    if (!amount || amount.trim() === '') {
      Alert.alert('Error', 'Please enter an amount');
      return false;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    if (!category || category.trim() === '') {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    if (!account || account.trim() === '') {
      Alert.alert('Error', 'Please select an account');
      return false;
    }
    return true;
  };

  const sumThisMonthForCategory = async (uid, categoryId, excludeExpenseId = null) => {
    const firstDayStr = monthStartISO();

    let { data: rows, error } = await supabase
      .from('expenses')
      .select('id, amount, date, created_at, category_id')
      .eq('user_id', uid)
      .eq('category_id', categoryId)
      .gte('date', firstDayStr);
    if (error) throw error;

    if (!rows || rows.length === 0) {
      const { data: rows2, error: e2 } = await supabase
        .from('expenses')
        .select('id, amount, created_at, category_id')
        .eq('user_id', uid)
        .eq('category_id', categoryId)
        .gte('created_at', firstDayStr);
      if (e2) throw e2;
      rows = rows2 || [];
    }

    return (rows || []).reduce((s, r) => {
      if (excludeExpenseId && r.id === excludeExpenseId) return s;
      return s + Number(r.amount || 0);
    }, 0);
  };

  /* --------------------- submit --------------------- */
  const resetForm = () => {
    setAmount('');
    setCategory('');
    setAccount('Cash');
    setNote('');
    setDescription('');
    setSelectedTab('expense');
    setSelectedCategoryId(null);
  };

  const handleBackPress = () => {
    resetForm();
    onClose?.();
    onBack?.();
  };

  const handleSubmit = async () => {
    if (!validateFormBasics()) return;

    const amt = parseFloat(amount);
    const isExpense = selectedTab === 'expense';

    // overall headroom
    if (isExpense) {
      const originalExpenseAmount =
        mode === 'edit' && editTransaction?.type === 'expense'
          ? Number(editTransaction.amount || 0)
          : 0;
      const allowedOverall =
        (isFinite(availableThisMonth) ? availableThisMonth : Number.POSITIVE_INFINITY) +
        originalExpenseAmount;

      if (amt > allowedOverall) {
        Alert.alert(
          'Not allowed',
          `This expense exceeds your available total.\nAvailable: ${allowedOverall.toFixed(2)}`
        );
        return;
      }
    }

    // category budget guard
    if (isExpense && userId && selectedCategoryId) {
      try {
        const limit = Number(limitByCategoryId[selectedCategoryId] || 0);
        if (limit > 0) {
          const excludeId = mode === 'edit' && editTransaction?.id ? editTransaction.id : null;
          const spentThisMonth = await sumThisMonthForCategory(userId, selectedCategoryId, excludeId);
          const remaining = Math.max(0, limit - spentThisMonth);
          if (amt > remaining) {
            Alert.alert(
              'Over category budget',
              `This will exceed your "${category}" budget for this month.\n\n` +
                `Budget: ${limit.toFixed(2)}\n` +
                `Spent: ${spentThisMonth.toFixed(2)}\n` +
                `Remaining: ${remaining.toFixed(2)}`
            );
            return;
          }
        }
      } catch (e) {
        console.log('Category limit check failed (non-blocking):', e?.message);
      }
    }

    const payload = {
      type: selectedTab,
      date: ymdLocal(new Date()),
      amount: amt,
      category,
      category_id: selectedCategoryId,
      account,
      note,
      description,
    };

    if (mode === 'edit') onUpdate?.(payload);
    else onTransactionComplete?.(payload);

    resetForm();
    onClose?.();
  };

  /* --------------------- add / delete income category --------------------- */
  const openAddIncome = () => {
    if (selectedTab !== 'income') return;
    setNewIncomeName('');
    setNewIncomeEmoji('');
    setShowAddIncomeModal(true);
  };

  const handleAddIncomeCategory = async () => {
    try {
      const name = (newIncomeName || '').trim();
      if (!name) {
        Alert.alert('Required', 'Please enter a category name');
        return;
      }
      // 🚫 disallow numbers in the name
      if (/\d/.test(name)) {
        Alert.alert('Invalid', 'Category name cannot contain numbers.');
        return;
      }

      if (!userId) return;

      // duplicate check for this user
      const { data: exist, error: exErr } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('type', 'income');
      if (exErr) throw exErr;
      const exists = (exist || []).some(
        (r) => String(r.name).trim().toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        Alert.alert('Duplicate', `"${name}" already exists in your income categories.`);
        return;
      }

      const icon = (newIncomeEmoji || DEFAULT_INCOME_ICON).trim() || DEFAULT_INCOME_ICON;

      const { error: insErr } = await supabase.from('categories').insert([
        { user_id: userId, type: 'income', name, icon, color: DEFAULT_COLOR, limit_: 0 },
      ]);
      if (insErr) throw insErr;

      setShowAddIncomeModal(false);
      await loadCategoriesFromSupabase(userId);
      setCategory(name);
      const justAdded = (categories.income || []).find((c) => c.name === name);
      setSelectedCategoryId(justAdded?.id || null);
    } catch (e) {
      console.log('handleAddIncomeCategory error:', e?.message);
      Alert.alert('Failed', e?.message || 'Could not add income category.');
    }
  };

  const handleDeleteIncomeCategory = async (cat) => {
    try {
      if (!userId) return;

      if (cat.name === 'Salary') {
        Alert.alert('Not allowed', 'The default "Salary" category cannot be deleted.');
        return;
      }

      // block delete if used in income rows
      const { data: used, error: usedErr } = await supabase
        .from('income')
        .select('id')
        .eq('user_id', userId)
        .eq('source', cat.name)
        .limit(1);
      if (usedErr) throw usedErr;
      if (used && used.length > 0) {
        Alert.alert(
          'In use',
          `You have income transactions under "${cat.name}". Delete or change those first.`
        );
        return;
      }

      Alert.alert('Delete category?', `Remove "${cat.name}" from your income categories?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: delErr } = await supabase
              .from('categories')
              .delete()
              .eq('id', cat.id)
              .eq('user_id', userId)
              .eq('type', 'income');
            if (delErr) throw delErr;

            if (selectedCategoryId === cat.id) {
              setSelectedCategoryId(null);
              setCategory('');
            }
            await loadCategoriesFromSupabase(userId);
          },
        },
      ]);
    } catch (e) {
      console.log('handleDeleteIncomeCategory error:', e?.message);
      Alert.alert('Failed', e?.message || 'Could not delete category.');
    }
  };

  /* --------------------- UI helpers --------------------- */
  const getTabStyle = (tabType) => {
    if (tabType === selectedTab) {
      return tabType === 'income'
        ? [styles.tab, styles.activeTab, styles.incomeTab]
        : [styles.tab, styles.activeTab, styles.expenseTab];
    }
    return [styles.tab, styles.inactiveTab];
  };

  const getTabTextStyle = (tabType) => {
    if (tabType === selectedTab) {
      return tabType === 'income'
        ? [styles.tabText, styles.activeTabText, styles.incomeTabText]
        : [styles.tabText, styles.activeTabText, styles.expenseTabText];
    }
    return [styles.tabText, styles.inactiveTabText];
  };

  const getSaveButtonStyle = () => {
    return selectedTab === 'income'
      ? [styles.continueButton, styles.incomeSaveButton]
      : [styles.continueButton, styles.expenseSaveButton];
  };

  const getCategoryEmoji = (categoryName) => {
    const all = [...categories.income, ...categories.expense];
    const cat = all.find((c) => c.name === categoryName);
    return cat ? cat.emoji : DEFAULT_EXPENSE_ICON;
  };

  const getAccountEmoji = (accountName) => {
    const acc = accounts.find((a) => a.name === accountName);
    return acc ? acc.emoji : '💳';
  };

  /* --------------------- pickers --------------------- */
  const renderCategoryPicker = () => (
    <Modal
      visible={showCategoryPicker}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setEditIncomeMode(false);
        setShowCategoryPicker(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Category</Text>
            <View style={styles.modalHeaderButtons}>
              {selectedTab === 'income' && (
                <TouchableOpacity
                  style={styles.modalHeaderButton}
                  onPress={() => setEditIncomeMode((v) => !v)}
                >
                  <Edit3 size={20} color="#111827" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => {
                  setEditIncomeMode(false);
                  setShowCategoryPicker(false);
                }}
              >
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.pickerScrollView}>
            <View style={styles.pickerGrid}>
              {(selectedTab === 'income' ? categories.income : categories.expense).map((cat) => (
                <View key={cat.id} style={styles.pickerGridItem}>
                  <View style={{ position: 'relative', alignItems: 'center' }}>
                    {selectedTab === 'income' && editIncomeMode && cat.name !== 'Salary' && (
                      <TouchableOpacity
                        style={styles.deleteBadge}
                        onPress={() => handleDeleteIncomeCategory(cat)}
                      >
                        <Trash2 size={14} color="#fff" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.pickerItemButton}
                      disabled={selectedTab === 'income' && editIncomeMode}
                      onPress={() => {
                        setCategory(cat.name);
                        setSelectedCategoryId(cat.id);
                        setEditIncomeMode(false);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemEmoji}>{cat.emoji}</Text>
                      <Text style={styles.pickerItemText}>{cat.name}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Income add button only on Income tab (bottom-right) */}
          {selectedTab === 'income' && !editIncomeMode && (
            <View style={{ padding: 16 }}>
              <TouchableOpacity
                onPress={openAddIncome}
                style={{
                  alignSelf: 'flex-end',
                  backgroundColor: '#008080',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add category</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Add Income Category Modal */}
      <Modal
        visible={showAddIncomeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddIncomeModal(false)}
      >
        <View style={styles.addOverlay}>
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Add income category</Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.addLabel}>Name *</Text>
              <TextInput
                style={styles.addInput}
                placeholder="e.g., Freelance, Business, Bonus"
                placeholderTextColor="#9CA3AF"
                value={newIncomeName}
                onChangeText={setNewIncomeName}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.addLabel}>Emoji (optional)</Text>
              <TextInput
                style={styles.addInput}
                placeholder="e.g., 💼 💸 🪙"
                placeholderTextColor="#9CA3AF"
                value={newIncomeEmoji}
                onChangeText={setNewIncomeEmoji}
                maxLength={4}
              />
            </View>

            <View style={styles.addButtonsRow}>
              <TouchableOpacity
                style={[styles.addBtn, styles.addCancel]}
                onPress={() => setShowAddIncomeModal(false)}
              >
                <Text style={styles.addBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, styles.addSave]}
                onPress={handleAddIncomeCategory}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );

  const renderAccountPicker = () => (
    <Modal
      visible={showAccountPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAccountPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Account</Text>
            <View style={styles.modalHeaderButtons}>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowAccountPicker(false)}
              >
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.pickerScrollView}>
            <View style={styles.pickerGrid}>
              {accounts.map((acc) => (
                <View key={acc.name} style={styles.pickerGridItem}>
                  <TouchableOpacity
                    style={styles.pickerItemButton}
                    onPress={() => {
                      setAccount(acc.name);
                      setShowAccountPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemEmoji}>{acc.emoji}</Text>
                    <Text style={styles.pickerItemText}>{acc.name}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* --------------------- render --------------------- */
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleBackPress}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedTab === 'income' ? 'Income' : 'Expense'}
          </Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={getTabStyle('income')}
              onPress={() => {
                setSelectedTab('income');
                setCategory('');
                setSelectedCategoryId(null);
              }}
            >
              <Text style={getTabTextStyle('income')}>Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={getTabStyle('expense')}
              onPress={() => {
                setSelectedTab('expense');
                setCategory('');
                setSelectedCategoryId(null);
              }}
            >
              <Text style={getTabTextStyle('expense')}>Expense</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Date</Text>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{date}</Text>
                <TouchableOpacity style={styles.repeatButton}>
                  <RefreshCw size={20} color="#9CA3AF" />
                  <Text style={styles.repeatText}>Rep/Inst.</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Amount *</Text>
              <TextInput
                style={styles.textInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.selectInputWithIcon}
                onPress={() => setShowCategoryPicker(true)}
              >
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputEmoji}>{getCategoryEmoji(category)}</Text>
                  <Text style={category ? styles.inputText : styles.placeholderText}>
                    {category || (selectedTab === 'income' ? 'Select income category' : 'Select category')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Account *</Text>
              <TouchableOpacity
                style={styles.selectInputWithIcon}
                onPress={() => setShowAccountPicker(true)}
              >
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputEmoji}>{getAccountEmoji(account)}</Text>
                  <Text style={account ? styles.inputText : styles.placeholderText}>
                    {account || 'Select account'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Note</Text>
              <View style={styles.noteContainer}>
                <TextInput
                  style={styles.textInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity style={styles.infoButton}>
                  <Info size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.descriptionContainer}>
                <TextInput
                  style={[styles.textInput, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
                <TouchableOpacity style={styles.cameraButton}>
                  <Camera size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={getSaveButtonStyle()} onPress={handleSubmit}>
            <Text style={styles.continueButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {renderCategoryPicker()}
        {renderAccountPicker()}
      </SafeAreaView>
    </Modal>
  );
};






/* --------------------- styles --------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  backButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 16 },
  content: { flex: 1 },
  tabContainer: { flexDirection: 'row', margin: 16, gap: 10 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteBadge: {
  position: 'absolute',
  top: -6,
  right: -6,
  zIndex: 2,
  backgroundColor: '#EF4444',
  borderRadius: 10,
  padding: 4,
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 4,
},

  activeTab: { borderWidth: 2 },
  inactiveTab: { backgroundColor: '#E5E7EB', borderColor: '#E5E7EB' },
  incomeTab: { backgroundColor: 'white', borderColor: '#008080' },
  expenseTab: { backgroundColor: 'white', borderColor: '#EF4444' },
  tabText: { fontSize: 14, fontWeight: '500' },
  activeTabText: { fontWeight: '600' },
  inactiveTabText: { color: '#6B7280' },
  incomeTabText: { color: '#008080' },
  expenseTabText: { color: '#EF4444' },

  formContainer: { paddingHorizontal: 16 },
  fieldContainer: { marginBottom: 24 },
  fieldLabel: { fontSize: 16, fontWeight: '500', color: '#6B7280', marginBottom: 8 },

  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateText: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
  repeatButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  repeatText: { fontSize: 14, color: '#9CA3AF' },

  textInput: {
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  selectInputWithIcon: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputEmoji: { fontSize: 20 },
  inputText: { fontSize: 16, color: '#1F2937' },
  placeholderText: { fontSize: 16, color: '#9CA3AF' },

  noteContainer: { flexDirection: 'row', alignItems: 'center' },
  infoButton: { padding: 4 },

  descriptionContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  descriptionInput: { minHeight: 40, textAlignVertical: 'top' },
  cameraButton: { padding: 4, marginLeft: 8 },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  incomeSaveButton: { backgroundColor: '#008080' },
  expenseSaveButton: { backgroundColor: '#EF4444' },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  /* bottom sheets */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9FAFB',
    height: '55%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalHeaderButtons: { flexDirection: 'row', gap: 16 },
  modalHeaderButton: { padding: 6 },

  pickerScrollView: { flex: 1 },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  pickerGridItem: { width: '33.33%', alignItems: 'center', paddingVertical: 16 },
  pickerItemButton: { alignItems: 'center' },
  pickerItemEmoji: { fontSize: 24, marginBottom: 4 },
  pickerItemText: { fontSize: 12, textAlign: 'center', color: '#1F2937' },

  /* add income modal */
  addOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCard: {
    width: '88%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  addTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  addLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  addInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  addButtonsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addCancel: { backgroundColor: '#F3F4F6' },
  addSave: { backgroundColor: '#008080' },
  addBtnText: { color: '#fff', fontWeight: '700' },
  addBtnTextSecondary: { color: '#111827', fontWeight: '600' },
});

export default TransactionForm;
