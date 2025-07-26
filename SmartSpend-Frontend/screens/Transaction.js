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

const TransactionForm = ({ 
  visible, 
  onClose = () => {}, 
  transactionType = 'expense', 
  onBack, 
  onTransactionComplete,
  mode = 'add',        // ✅ Add this
  editTransaction,     // ✅ Add this
  onUpdate             // ✅ Add this
}) => {
  const [selectedTab, setSelectedTab] = useState(transactionType);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: '2-digit',
    weekday: 'short' 
  }));
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
    { name: 'Card', emoji: '💳' }
  ]);

 useEffect(() => {
  (async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
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
    setAccount(editTransaction.payment_method || editTransaction.account || 'Cash');
    setNote(editTransaction.note || '');
    setDescription(editTransaction.description || '');
    
    // Find category ID if it exists
    const allCategories = [...categories.income, ...categories.expense];
    const foundCategory = allCategories.find(cat => cat.name === editTransaction.category);
    if (foundCategory) {
      setSelectedCategoryId(foundCategory.id);
    }
  }
}, [mode, editTransaction, categories]);

  const loadCategoriesFromSupabase = async () => {
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error('No user session', userErr);
      return;
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon, type, user_id')
      .or(`user_id.is.null,user_id.eq.${user.id}`);

    if (error) throw error;

    console.log('Fetched categories:', data);

    // Separate categories
    const incomeCategories = data
      .filter(c => c.type === 'income')
      .map(c => ({
        id: c.id,
        name: c.name,
        emoji: c.icon || '📝',
      }));

    const expenseCategories = data
      .filter(c => c.type === 'expense' || c.type == null)
      .map(c => ({
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
      const { data, error } = await supabase
        .from('accounts')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setAccounts(data.map(acc => ({
          name: acc.name,
          emoji: '💳' // Use default emoji since column might not exist
        })));
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const addNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      // Insert without emoji column to avoid schema error
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name: newCategoryName.trim(),
            type: selectedTab
          }
        ])
        .select();

      if (error) throw error;

      // Update local state
      const newCategory = { name: newCategoryName.trim(), emoji: '📝' };
      setCategories(prev => ({
        ...prev,
        [selectedTab]: [...prev[selectedTab], newCategory]
      }));

      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategory(false);
      setShowCategoryPicker(false);
      Alert.alert('Success', 'Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category. Please try again.');
    }
  };

  const addNewAccount = async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    try {
      // Insert without emoji column to avoid schema error
      const { data, error } = await supabase
        .from('accounts')
        .insert([
          {
            name: newAccountName.trim()
          }
        ])
        .select();

      if (error) throw error;

      // Update local state
      const newAccount = { name: newAccountName.trim(), emoji: '💳' };
      setAccounts(prev => [...prev, newAccount]);

      setAccount(newAccountName.trim());
      setNewAccountName('');
      setShowAddAccount(false);
      setShowAccountPicker(false);
      Alert.alert('Success', 'Account added successfully!');
    } catch (error) {
      console.error('Error adding account:', error);
      Alert.alert('Error', 'Failed to add account. Please try again.');
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

 const persistTransaction = async () => {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error('No user session');

  const amt = parseFloat(amount);

  if (selectedTab === 'income') {
    // your income table columns: id, user_id, source, amount, date, note
    const { error } = await supabase.from('income').insert([
      {
        user_id: user.id,
        source: category_id || 'Other',                   // <- map category to "source"
        amount: amt,
        date: new Date().toISOString().slice(0, 10),   // since column type is DATE
        note: note || null,
      },
    ]);
    if (error) throw error;
  } else {
    // expense flow (adjust column names to match your expenses table)
    const { error } = await supabase.from('expenses').insert([
      {
        user_id: user.id,
        
        date: new Date().toISOString().slice(0, 10),
        amount: amt,
        category_id: selectedCategoryId,
        account,
        note: note || null,
        description: description || null,
      },
    ]);
    if (error) throw error;
  }
};

const handleSave = async () => {
  if (!validateForm()) return;
  try {
    if (mode === 'edit') {
      // ✅ Handle edit mode
      onUpdate?.({
        amount: parseFloat(amount),
        category: category,
        category_id: selectedCategoryId,
        account,
        note,
        description,
      });
    } else {
      // ✅ Handle add mode
      onTransactionComplete?.({
        type: selectedTab,
        date: new Date().toISOString().split('T')[0],
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

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      Alert.alert('Error', 'User session expired.');
      return;
    }

    const amt = parseFloat(amount);

    if (selectedTab === 'income') {
      // Insert to income table
      const { error } = await supabase
        .from('income')
        .insert([{
          user_id: user.id,
          source: category || 'Other',
          amount: amt,
          date: new Date().toISOString().slice(0, 10),
          note: note || null,
        }]);

      if (error) throw error;

      // Let the parent know (so it can mirror to transactions / refresh UI)
      onTransactionComplete?.({
        type: 'income',
        date: new Date().toISOString().split('T')[0],
        amount: amt,
        category,                // name shown in UI
        category_id: null,       // income doesn’t use it
        account,
        note,
        description,
      });

    } else {
      // EXPENSE
      if (!selectedCategoryId) {
        Alert.alert('Error', 'Please pick a category');
        return;
      }

      const { error } = await supabase
        .from('expenses')
        .insert([{
          user_id: user.id,
          category_id: selectedCategoryId,     // <-- use the state!
          amount: amt,
          payment_method: account || 'Cash',
          note: note || '',
          description: description || null,
          date: new Date().toISOString().slice(0, 10),
        }]);

      if (error) throw error;

      // Notify parent
      onTransactionComplete?.({
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: amt,
        category,                 // name (used to render list)
        category_id: selectedCategoryId, // uuid (used to join)
        account,
        note,
        description,
      });
    }

    Alert.alert('Saved', 'Transaction added. Add another one.');

    // Reset only the fields you want to clear for the "continue" flow
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
      ? [styles.saveButton, styles.incomeSaveButton]
      : [styles.saveButton, styles.expenseSaveButton];
  };

  // Get category emoji helper function
  const getCategoryEmoji = (categoryName) => {
    const allCategories = [...categories.income, ...categories.expense];
    const category = allCategories.find(cat => cat.name === categoryName);
    return category ? category.emoji : '📝';
  };

  // Get account emoji helper function
  const getAccountEmoji = (accountName) => {
    const account = accounts.find(acc => acc.name === accountName);
    return account ? account.emoji : '💳';
  };

  const renderAddCategoryModal = () => (
    <Modal
      visible={showAddCategory}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddCategory(false)}
    >
      <View style={styles.newModalOverlay}>
        <View style={styles.newModalContainer}>
          {/* Header matching the design */}
          <View style={styles.newModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddCategory(false)}
              style={styles.newBackButton}
            >
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.newModalHeaderTitle}>
              {selectedTab === 'income' ? 'Income' : 'Expense'}
            </Text>
            <Text style={styles.newModalHeaderAction}>Add</Text>
          </View>

          {/* Content */}
          <View style={styles.newModalContent}>
            <View style={styles.newInputContainer}>
              <TextInput
                style={styles.newTextInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Category Name"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.newSaveButton}
              onPress={addNewCategory}
            >
              <Text style={styles.newSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAddAccountModal = () => (
    <Modal
      visible={showAddAccount}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddAccount(false)}
    >
      <View style={styles.newModalOverlay}>
        <View style={styles.newModalContainer}>
          {/* Header matching the design */}
          <View style={styles.newModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddAccount(false)}
              style={styles.newBackButton}
            >
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.newModalHeaderTitle}>Account</Text>
            <Text style={styles.newModalHeaderAction}>Add</Text>
          </View>

          {/* Content */}
          <View style={styles.newModalContent}>
            <View style={styles.newInputContainer}>
              <TextInput
                style={styles.newTextInput}
                value={newAccountName}
                onChangeText={setNewAccountName}
                placeholder="Account Name"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.newSaveButton}
              onPress={addNewAccount}
            >
              <Text style={styles.newSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
                      setSelectedCategoryId(cat.id);    // <- store the uuid
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
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleBackPress}
    >
      <SafeAreaView style={styles.container}>
        {/* Updated Header with teal background and search icon */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedTab === 'income' ? 'Income' : 'Expense'}
          </Text>
        
        </View>

        

        <ScrollView style={styles.content}>
          {/* Tab Selection */}
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
            
            <TouchableOpacity style={getTabStyle('transfer')}>
              <Text style={getTabTextStyle('transfer')}>Transfer</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Date Field */}
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

            {/* Amount Field */}
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

            {/* Updated Category Field with emoji */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Category *</Text>
              <TouchableOpacity 
                style={styles.selectInputWithIcon}
                onPress={() => setShowCategoryPicker(true)}
              >
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputEmoji}>{getCategoryEmoji(category)}</Text>
                  <Text style={category ? styles.inputText : styles.placeholderText}>
                    {category || 'Select category'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Updated Account Field with emoji */}
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

            {/* Note Field */}
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

            {/* Description Field */}
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

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={getSaveButtonStyle()}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        {/* Modals */}
        {renderCategoryPicker()}
        {renderAccountPicker()}
        {renderAddCategoryModal()}
        {renderAddAccountModal()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    marginRight: 140,
    fontWeight: '600',
  },
  searchButton: {
    padding: 8,
  },
  tealHeader: {
    backgroundColor: '#6B7280',
    paddingBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  navArrow: {
    padding: 8,
  },
  navArrowText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '300',
  },
  monthText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
  },
  activeTab: {
    borderWidth: 2,
  },
  inactiveTab: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  incomeTab: {
    backgroundColor: 'white',
    borderColor: '#008080',
  },
  expenseTab: {
    backgroundColor: 'white',
    borderColor: '#EF4444',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  inactiveTabText: {
    color: '#6B7280',
  },
  incomeTabText: {
    color: '#008080',
  },
  expenseTabText: {
    color: '#EF4444',
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repeatText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  textInput: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontSize: 16,
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectInputWithIcon: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputEmoji: {
    fontSize: 20,
  },
  inputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    padding: 4,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  descriptionInput: {
    minHeight: 40,
    textAlignVertical: 'top',
  },
  cameraButton: {
    padding: 4,
    marginLeft: 8,
  },
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
  incomeSaveButton: {
    backgroundColor: '#008080',
  },
  expenseSaveButton: {
    backgroundColor: '#EF4444',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  // New modal styles to match the white theme and keyboard-like appearance
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9FAFB',
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalHeaderButton: {
    padding: 4,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  pickerGridItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  pickerItemBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    width: '90%',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default TransactionForm;