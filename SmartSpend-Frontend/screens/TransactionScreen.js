import React, { useState, useEffect, useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Modal,
  Alert,
  Dimensions,
  FlatList,
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
  MoreHorizontal
} from 'lucide-react-native';

import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import TransactionForm from './Transaction';
import { PermissionsAndroid, Platform } from 'react-native';
const SmsAndroid = require('react-native-get-sms-android');
import { parseBankSMS } from '../services/smsParser';

const MoreMenu = ({ isOpen, onClose, onLogout }) => {
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
        
        {/* More Menu */}
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
                <View style={styles.profileInfo}>
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
              {/* Passcode Setting */}
              <TouchableOpacity style={styles.menuItem}>
                <Lock size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Passcode</Text>
                  <Text style={styles.menuItemSubtitle}>OFF</Text>
                </View>
              </TouchableOpacity>

              {/* Main Currency Setting */}
              <TouchableOpacity style={styles.menuItem}>
                <DollarSign size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Main Currency Setting</Text>
                  <Text style={styles.menuItemSubtitle}>LKR(Rs.)</Text>
                </View>
              </TouchableOpacity>

              {/* Sub Currency Setting */}
              <TouchableOpacity style={styles.menuItem}>
                <Wallet size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Sub Currency Setting</Text>
                </View>
              </TouchableOpacity>

              {/* Alarm Setting */}
              <TouchableOpacity style={styles.menuItem}>
                <Bell size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Alarm Setting</Text>
                </View>
              </TouchableOpacity>

              {/* Style */}
              <TouchableOpacity style={styles.menuItem}>
                <Palette size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Style</Text>
                </View>
              </TouchableOpacity>

              {/* Language Setting */}
              <TouchableOpacity style={styles.menuItem}>
                <Globe size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Language Setting</Text>
                </View>
              </TouchableOpacity>

              {/* Logout */}
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

export default function TransactionsScreenComponent({ onBack, onLogout }) {

  const [importedFromSMS, setImportedFromSMS] = useState(0);
  const navigation = useNavigation();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Transactions');
  const [transactions, setTransactions] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Daily');
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [categories, setCategories] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());



  const requestSMSPermission = useCallback(async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: "Read SMS Permission",
        message: "SmartSpend needs access to your SMS to track expenses automatically.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      await readBankMessages();
    } else {
      console.log("SMS permission denied");
    }
  } catch (err) {
    console.warn(err);
  }
}, [readBankMessages]);

const readBankMessages = useCallback(async () => {
  
  console.log('[SMS] Starting to read bank messages…');

  // Fast duplicate check (by full SMS body you store in `description`)
  const existingBodies = new Set(transactions.map(t => t.description));
  let inserted = 0;

  const bankSenders = [
    'BOC','HNB','COMBANK','NTB','SAMPATH','DFCC','NSB','SEYLAN','UB',
    'PAN ASIA','HSBC','CARGILLS','STANDARDCHARTERED','MCB','NDB','PB'
  ];

  try {
    for (const sender of bankSenders) {
      const filter = { box: 'inbox', address: sender, maxCount: 20 };

      // Wrap SmsAndroid.list with a promise so we can await it
      await new Promise((resolve) => {
        SmsAndroid.list(
          JSON.stringify(filter),
          (fail) => {
            console.error(`Failed to list SMS from ${sender}:`, fail);
            resolve();
          },
          async (count, smsList) => {
            console.log(`[SMS] Found ${count} messages from ${sender}`);

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
                if (!parsed) {
                  console.log('[SMS] Could not parse:', msg.body);
                  continue;
                }

                if (existingBodies.has(msg.body)) {
                  console.log('[SMS] Skipping duplicate message');
                  continue;
                }

                console.log('[SMS] Parsed & inserting:', { ...parsed, body: msg.body });

                await handleTransactionAdded({
                  type: 'expense',
                  category: parsed.category,
                  amount: parsed.amount,
                  description: msg.body,   // you use this to detect duplicates
                  account: 'Bank',
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

    console.log('[SMS] Done reading all bank messages');
    if (inserted > 0) {
      Alert.alert('SMS import', `${inserted} new transaction${inserted > 1 ? 's' : ''} imported`);
    } else {
      console.log('[SMS] No new transactions imported');
    }
  } catch (e) {
    console.error('[SMS] Fatal error:', e);
  }
}, [transactions, handleTransactionAdded]);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    if (Platform.OS === 'android') requestSMSPermission();
  }, []);

  useEffect(() => {
    if (selectedTab === 'Monthly') {
      generateMonthlyData();
    }
  }, [selectedTab, transactions, currentYear]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) throw error;
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTransactions(data || []);
      calculateTotals(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to fetch transactions');
    }
  };

  const calculateTotals = (transactionData) => {
    const totalIncome = transactionData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const totalExpenses = transactionData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    setIncome(totalIncome);
    setExpenses(totalExpenses);
  };

  const generateMonthlyData = () => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyStats = monthNames.map((month, index) => {
      const monthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.created_at);
        return transactionDate.getFullYear() === currentYear && 
               transactionDate.getMonth() === index;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const startDate = `${String(index + 1).padStart(2, '0')}/01`;
      const endDate = `${String(index + 1).padStart(2, '0')}/${new Date(currentYear, index + 1, 0).getDate()}`;

      return {
        month,
        dateRange: `${startDate} ~ ${endDate}`,
        income: monthIncome,
        expenses: monthExpenses,
        total: monthIncome - monthExpenses
      };
    });

    setMonthlyData(monthlyStats);
  };

  const handleTransactionAdded = async (transactionData) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: transactionData.type,
          category: transactionData.category,
          amount: parseFloat(transactionData.amount),
          description: transactionData.description || transactionData.note,
          payment_method: transactionData.account || 'Cash',
          date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) throw error;

      // Update local state
      const newTransactions = [data[0], ...transactions];
      setTransactions(newTransactions);
      calculateTotals(newTransactions);
      
      setShowTransactionForm(false);
      Alert.alert('Success', 'Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  // Function to get emoji for category from database
  const getCategoryEmoji = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.emoji : '💳';
  };

  const renderTransaction = ({ item }) => {
  const isIncome = item.type === 'income';
  const amount = Number(item.amount) || 0;
  const categoryEmoji = getCategoryEmoji(item.category);
  const isFromSMS =
    (item.payment_method && item.payment_method.toLowerCase() === 'bank') ||
    item.source === 'sms';

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={styles.emojiContainer}>
          <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
        </View>

        <View>
          <Text style={styles.transactionCategory}>
            {item.category}{' '}
            {isFromSMS && (
              <Text style={{ fontSize: 12, color: '#008080' }}>• SMS</Text>
            )}
          </Text>

          {/* Show payment method (fallback to Cash) */}
          <Text style={styles.transactionMethod}>
            {item.payment_method || 'Cash'}
          </Text>

          {/* Optional: uncomment if you want to see the raw SMS / description (1 line) */}
          {/* {item.description ? (
            <Text
              numberOfLines={1}
              style={{ color: '#888', maxWidth: 250, marginTop: 2, fontSize: 12 }}
            >
              {item.description}
            </Text>
          ) : null} */}
        </View>
      </View>

      <Text
        style={[
          styles.transactionAmount,
          { color: isIncome ? '#4CAF50' : '#FF5722' },
        ]}
      >
        Rs. {amount.toFixed(2)}
      </Text>
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
        <Text style={styles.monthlyIncome}>Rs. {item.income.toFixed(2)}</Text>
        <Text style={styles.monthlyExpense}>Rs. {item.expenses.toFixed(2)}</Text>
        <Text style={[styles.monthlyTotal, { color: item.total >= 0 ? '#4CAF50' : '#FF5722' }]}>
          Rs. {item.total.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  
  const navigateToHome = () => {
  setCurrentScreen('home');
    
  
};
const toggleMoreMenu = () => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
  };

  const closeMoreMenu = () => {
    setIsMoreMenuOpen(false);
  };

  const handleLogout = () => {
    closeMoreMenu();
    if (onLogout) {
      onLogout();
    }
  };


  const tabs = ['Daily', 'Monthly', 'Summary'];

  const renderCurrentScreen = () => {
    switch (activeTab) {
      
      case 'Transactions':
        return renderTransactionsContent();
      case 'Accounts':
        return renderPlaceholderScreen('Accounts');
      case 'Stats':
        return renderPlaceholderScreen('Stats');
      default:
        return renderTransactionsContent();
    }
  };

  const renderPlaceholderScreen = (screenName) => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>{screenName} Screen</Text>
      <Text style={styles.placeholderSubtext}>Coming Soon</Text>
    </View>
  );
  {importedFromSMS > 0 && (
  <View style={{ backgroundColor: '#E6FFFA', padding: 8 }}>
    <Text style={{ color: '#008080', textAlign: 'center' }}>
      {importedFromSMS} transactions imported from SMS
    </Text>
  </View>
  )}

  const renderTransactionsContent = () => (
  <>
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

    {/* Date Navigator */}
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

    {/* Summary Cards */}
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Income</Text>
        <Text style={[styles.summaryAmount, { color: '#007AFF' }]}>{income.toFixed(2)}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Exp.</Text>
        <Text style={[styles.summaryAmount, { color: '#FF3B30' }]}>{expenses.toFixed(2)}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryAmount}>{(income - expenses).toFixed(2)}</Text>
      </View>
    </View>

    {/* Debug button visible on all tabs */}
    <TouchableOpacity
      style={{ padding: 10, backgroundColor: '#008080', margin: 10, borderRadius: 8 }}
      onPress={readBankMessages}
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>Import SMS (Debug)</Text>
    </TouchableOpacity>

    {/* Content based on selected tab */}
    {selectedTab === 'Monthly' ? (
      <View style={styles.monthlyContainer}>
        <FlatList
          data={monthlyData}
          renderItem={renderMonthlyItem}
          keyExtractor={(item) => item.month}
          showsVerticalScrollIndicator={false}
        />
      </View>
    ) : (
      <>
        {/* Date and Daily Summary */}
        <View style={styles.dailySummaryContainer}>
          <View style={styles.dateRow}>
            <View style={styles.dateInfo}>
              <Text style={styles.dayNumber}>23</Text>
              <Text style={styles.dayLabel}>Wed</Text>
            </View>
            <View style={styles.dailyAmounts}>
              <Text style={styles.dailyIncome}>Rs. 0.00</Text>
              <Text style={styles.dailyExpense}>Rs. {expenses.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsContainer}>
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id?.toString?.() ?? String(item.id)}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </>
    )}

    {/* Add Transaction Button */}
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => setShowTransactionForm(true)}
    >
      <Ionicons name="add" size={30} color="white" />
    </TouchableOpacity>

    {/* Transaction Form Modal */}
    <TransactionForm
      visible={showTransactionForm}
      onClose={() => setShowTransactionForm(false)}
      onBack={() => setShowTransactionForm(false)}
      onTransactionComplete={handleTransactionAdded}
    />
  </>
);


  return (
    <SafeAreaView style={styles.container}>
      {renderCurrentScreen()}
      
      {/* Bottom Navigation */}
       <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}
        onPress={onBack}>
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 25,
    paddingBottom: 15,
    backgroundColor: '#008080',
  },
  headerTitle: {
    fontSize: 20,
    marginLeft: 10,
    fontWeight: '600',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 15,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008080',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#008080',
  },
  
  dateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#008080',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'white',
  },
  tabText: {
    color: '#D3D3D3',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlyContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  monthlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthlyLeft: {
    flex: 1,
  },
  monthName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  monthDateRange: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  monthlyAmounts: {
    alignItems: 'flex-end',
  },
  monthlyIncome: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  monthlyExpense: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 2,
  },
  monthlyTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dailySummaryContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  dayLabel: {
    fontSize: 12,
    color: 'white',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dailyAmounts: {
    alignItems: 'flex-end',
  },
  dailyIncome: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  dailyExpense: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  transactionsContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionMethod: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
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