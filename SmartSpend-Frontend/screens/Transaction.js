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
} from 'lucide-react-native';
import { supabase } from '../services/supabase';

// Local date yyyy-mm-dd
const ymdLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const TransactionForm = ({
  visible,
  onClose = () => {},
  transactionType = 'expense',
  onBack,
  onTransactionComplete,
  mode = 'add',
  editTransaction,
  onUpdate,

  // NEW: remaining balance you want to protect (e.g., monthly total = income - expenses)
  // Pass this from Home screen. If not provided, no blocking will occur.
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

  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('Cash');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const [accounts, setAccounts] = useState([
    { name: 'Cash', emoji: '💵' },
    { name: 'Transport', emoji: '🚌' },
    { name: 'Bank', emoji: '🏦' },
    { name: 'Card', emoji: '💳' },
  ]);

  useEffect(() => {
    (async () => {
      await loadCategoriesFromSupabase();
      await loadAccountsFromSupabase();
    })();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && editTransaction) {
      setSelectedTab(editTransaction.type || 'expense');
      setAmount(String(editTransaction.amount || ''));
      setCategory(editTransaction.category || '');
      setAccount(
        editTransaction.payment_method || editTransaction.account || 'Cash'
      );
      setNote(editTransaction.note || '');
      setDescription(editTransaction.description || '');

      const allCategories = [...categories.income, ...categories.expense];
      const found = allCategories.find((c) => c.name === editTransaction.category);
      if (found) setSelectedCategoryId(found.id);
    }
  }, [mode, editTransaction, categories]);

  const loadCategoriesFromSupabase = async () => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, type, user_id')
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (error) throw error;

      const incomeCategories = data
        .filter((c) => c.type === 'income')
        .map((c) => ({ id: c.id, name: c.name, emoji: c.icon || '📝' }));

      const expenseCategories = data
        .filter((c) => c.type === 'expense' || c.type == null)
        .map((c) => ({ id: c.id, name: c.name, emoji: c.icon || '📝' }));

      setCategories({ income: incomeCategories, expense: expenseCategories });
    } catch (e) {
      console.error('loadCategoriesFromSupabase error:', e);
    }
  };

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

  const handleBackPress = () => {
    resetForm();
    onClose?.();
    onBack?.();
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setAccount('Cash');
    setNote('');
    setDescription('');
    setSelectedTab('expense');
    setSelectedCategoryId(null);
  };

  const validateForm = () => {
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

  // PURE submit – no DB writes here
  const handleSubmit = () => {
    if (!validateForm()) return;

    const amt = parseFloat(amount);

    // NEW: Block expenses that would make total negative
    if (selectedTab === 'expense') {
      // If editing an expense, user can reuse the original amount without being blocked.
      const originalExpenseAmount =
        mode === 'edit' && editTransaction?.type === 'expense'
          ? Number(editTransaction.amount || 0)
          : 0;

      // Allowed headroom = remaining + original (when editing)
      const allowed = (isFinite(availableThisMonth) ? availableThisMonth : Number.POSITIVE_INFINITY) + originalExpenseAmount;

      if (amt > allowed) {
        Alert.alert(
          'Not allowed',
          `This expense exceeds your available total.\nAvailable: ${allowed.toFixed(2)}`
        );
        return;
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

    if (mode === 'edit') {
      onUpdate?.(payload);
    } else {
      onTransactionComplete?.(payload);
    }

    resetForm();
    onClose?.();
  };

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
    return cat ? cat.emoji : '📝';
  };

  const getAccountEmoji = (accountName) => {
    const acc = accounts.find((a) => a.name === accountName);
    return acc ? acc.emoji : '💳';
  };

  const renderCategoryPicker = () => (
    <Modal
      visible={showCategoryPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Category</Text>
            <View style={styles.modalHeaderButtons}>
              <TouchableOpacity style={styles.modalHeaderButton}>
                <Edit3 size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowCategoryPicker(false)}
              >
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.pickerScrollView}>
            <View style={styles.pickerGrid}>
              {categories[selectedTab].map((cat) => (
                <View key={cat.id} style={styles.pickerGridItem}>
                  <TouchableOpacity
                    style={styles.pickerItemButton}
                    onPress={() => {
                      setCategory(cat.name);
                      setSelectedCategoryId(cat.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemEmoji}>{cat.emoji}</Text>
                    <Text style={styles.pickerItemText}>{cat.name}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
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
              <TouchableOpacity style={styles.modalHeaderButton}>
                <Edit3 size={20} color="#9CA3AF" />
              </TouchableOpacity>
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
                  <Text
                    style={category ? styles.inputText : styles.placeholderText}
                  >
                    {category || 'Select category'}
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
  tabContainer: { flexDirection: 'row', margin: 16 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9FAFB',
    height: '50%',
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
  modalHeaderButton: { padding: 4 },
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
});

export default TransactionForm;
