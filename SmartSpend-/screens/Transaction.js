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
  Star,
  RefreshCw,
  Info,
  Camera,
  Edit3,
  X,
  Search,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';

// Helper to get local date in yyyy-mm-dd
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
}) => {
  const [selectedTab, setSelectedTab] = useState(transactionType);
  const [date, setDate] = useState(
    new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      weekday: 'short',
    })
  );
  
  const [pickedCategory, setPickedCategory] = useState(null);
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('Cash');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  const [accounts, setAccounts] = useState([
    { name: 'Cash', emoji: '💵' },
    { name: 'Transport', emoji: '🚌' },
    { name: 'Bank Accounts', emoji: '🏦' },
    { name: 'Card', emoji: '💳' },
  ]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('No user session', error);
        return;
      }
      setUser(user);

      await loadCategoriesFromSupabase(user);
      await loadAccountsFromSupabase(user);
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
      const foundCategory = allCategories.find(
        (cat) => cat.name === editTransaction.category
      );
      if (foundCategory) {
        setSelectedCategoryId(foundCategory.id);
      }
    }
  }, [mode, editTransaction, categories]);

  const loadCategoriesFromSupabase = async () => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        console.error('No user session', userErr);
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, type, user_id')
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (error) throw error;

      const incomeCategories = data
        .filter((c) => c.type === 'income')
        .map((c) => ({
          id: c.id,
          name: c.name,
          emoji: c.icon || '📝',
        }));

      const expenseCategories = data
        .filter((c) => c.type === 'expense' || c.type == null)
        .map((c) => ({
          id: c.id,
          name: c.name,
          emoji: c.icon || '📝',
        }));

      setCategories({
        income: incomeCategories,
        expense: expenseCategories,
      });
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  };

  const loadAccountsFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        setAccounts(
          data.map((acc) => ({
            name: acc.name,
            emoji: '💳',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleBackPress = () => {
    resetForm();

    if (onClose && typeof onClose === 'function') {
      onClose();
    }

    if (onBack && typeof onBack === 'function') {
      onBack();
    }
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setAccount('Cash');
    setNote('');
    setDescription('');
    setSelectedTab('expense');
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

  const handleSave = async () => {
    if (!validateForm()) return;
    const todayLocal = ymdLocal(new Date());

    try {
      if (mode === 'edit') {
        onUpdate?.({
          amount: parseFloat(amount),
          category: category,
          category_id: selectedCategoryId,
          account,
          note,
          description,
        });
      } else {
        onTransactionComplete?.({
          type: selectedTab,
          date: todayLocal,
          amount: parseFloat(amount),
          category: category,
          category_id: selectedCategoryId,
          account,
          note,
          description,
        });
      }

      resetForm();
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Failed to save transaction');
    }
  };

  const handleContinue = async () => {
    if (!validateForm()) return;
    const todayLocal = ymdLocal(new Date());

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        Alert.alert('Error', 'User session expired.');
        return;
      }

      const amt = parseFloat(amount);

      if (selectedTab === 'income') {
        const { error } = await supabase.from('income').insert([
          {
            user_id: user.id,
            source: category || 'Other',
            amount: amt,
            date: todayLocal,
            note: note || null,
          },
        ]);

        if (error) throw error;

        onTransactionComplete?.({
          type: 'income',
          date: todayLocal,
          amount: amt,
          category,
          category_id: null,
          account,
          note,
          description,
        });
      } else {
        if (!selectedCategoryId) {
          Alert.alert('Error', 'Please pick a category');
          return;
        }

        const { error } = await supabase.from('expenses').insert([
          {
            user_id: user.id,
            category_id: selectedCategoryId,
            amount: amt,
            payment_method: account || 'Cash',
            note: note || '',
            description: description || null,
            date: todayLocal,
          },
        ]);

        if (error) throw error;

        onTransactionComplete?.({
          type: 'expense',
          date: todayLocal,
          amount: amt,
          category,
          category_id: selectedCategoryId,
          account,
          note,
          description,
        });
      }

      Alert.alert('Saved', 'Transaction added. Add another one.');

      setAmount('');
      setNote('');
      setDescription('');
      setCategory('');
      setSelectedCategoryId(null);
    } catch (e) {
      console.error('Continue error:', e);
      Alert.alert('Error', e.message || 'Failed to save transaction.');
    }
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
    const allCategories = [...categories.income, ...categories.expense];
    const category = allCategories.find((cat) => cat.name === categoryName);
    return category ? category.emoji : '📝';
  };

  const getAccountEmoji = (accountName) => {
    const account = accounts.find((acc) => acc.name === accountName);
    return account ? account.emoji : '💳';
  };

  const renderCategoryPicker = () => (
    <Modal
      visible={showCategoryPicker}
      transparent={true}
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
              {categories[selectedTab].map((cat, index) => (
                <View key={index} style={styles.pickerGridItem}>
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

              <View style={styles.pickerGridItem}>
                <TouchableOpacity
                  style={styles.pickerItemButton}
                  onPress={() => {
                    setShowCategoryPicker(false);
                    setShowAddCategory(true);
                  }}
                >
                  <Text style={styles.pickerItemEmoji}>➕</Text>
                  <Text style={styles.pickerItemText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAccountPicker = () => (
    <Modal
      visible={showAccountPicker}
      transparent={true}
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
              {accounts.map((acc, index) => (
                <View key={index} style={styles.pickerGridItem}>
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

              <View style={styles.pickerGridItem}>
                <TouchableOpacity
                  style={styles.pickerItemButton}
                  onPress={() => {
                    setShowAccountPicker(false);
                    setShowAddAccount(true);
                  }}
                >
                  <Text style={styles.pickerItemEmoji}>➕</Text>
                  <Text style={styles.pickerItemText}>Add</Text>
                </TouchableOpacity>
              </View>
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
              }}
            >
              <Text style={getTabTextStyle('income')}>Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={getTabStyle('expense')}
              onPress={() => {
                setSelectedTab('expense');
                setCategory('');
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
        

          <TouchableOpacity
            style={getSaveButtonStyle()}
            onPress={handleContinue}
          >
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: 'white',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  incomeSaveButton: { backgroundColor: '#008080' },
  expenseSaveButton: { backgroundColor: '#EF4444' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    
  },
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
