import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import TransactionForm from './Transaction';
import { PermissionsAndroid, Platform } from 'react-native';
const SmsAndroid = require('react-native-get-sms-android');
import { parseBankSMS } from '../services/smsParser'; // Assuming you have a utility to parse SMS



const requestSMSPermission = async () => {
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
      readBankMessages();
    } else {
      console.log("SMS permission denied");
    }
  } catch (err) {
    console.warn(err);
  }
};

const readBankMessages = () => {
  const bankSenders = [
    'BOC',         // Bank of Ceylon
    'HNB',         // Hatton National Bank
    'COMBANK',     // Commercial Bank
    'NTB',         // Nations Trust Bank
    'SAMPATH',     // Sampath Bank
    'DFCC',        // DFCC Bank
    'NSB',         // National Savings Bank
    'SEYLAN',      // Seylan Bank
    'UB',          // Union Bank
    'PAN ASIA',    // Pan Asia Bank
    'HSBC',        // HSBC Sri Lanka
    'CARGILLS',    // Cargills Bank
    'STANDARDCHARTERED', // Standard Chartered Bank
    'MCB',         // Muslim Commercial Bank
    'NDB',         // National Development Bank
    'PB',          // People's Bank (sometimes shown as PB or PEOPLE’S BANK)
  ];

  bankSenders.forEach((sender) => {
    const filter = {
      box: 'inbox',
      address: sender,
      maxCount: 20,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.error(`Failed to list SMS from ${sender}:`, fail);
      },
      (count, smsList) => {
        const messages = JSON.parse(smsList);
        messages.forEach(async (msg) => {
          const parsed = parseBankSMS(msg.body);
          if (parsed) {
            const existing = transactions.find(t => t.description === msg.body);
            if (!existing) {
              const transactionData = {
                type: 'expense',
                category: parsed.category,
                amount: parsed.amount,
                description: msg.body,
                account: 'Bank',
              };
              await handleTransactionAdded(transactionData);
            }
          }
        });
      }
    );
  });
};

export default function TransactionsScreen({ onLogout }) {
  const [activeTab, setActiveTab] = useState('Home');
  const [transactions, setTransactions] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Daily');
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
   useEffect(() => {
    fetchTransactions();
    if (Platform.OS === 'android') requestSMSPermission();
  }, []);

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

  // Function to get emoji for category
  const getCategoryEmoji = (category) => {
    // Common category to emoji mapping
    const categoryEmojiMap = {
      // Food & Dining
      'Food': '🍽️',
      'Restaurant': '🍽️',
      'Groceries': '🛒',
      'Coffee': '☕',
      'Fast Food': '🍔',
      'Dining': '🍽️',
      
      // Transportation
      'Transportation': '🚗',
      'Gas': '⛽',
      'Fuel': '⛽',
      'Taxi': '🚕',
      'Bus': '🚌',
      'Train': '🚊',
      'Uber': '🚕',
      'Parking': '🅿️',
      
      // Shopping
      'Shopping': '🛍️',
      'Clothing': '👕',
      'Electronics': '📱',
      'Books': '📚',
      'Gifts': '🎁',
      
      // Entertainment
      'Entertainment': '🎬',
      'Movies': '🎬',
      'Games': '🎮',
      'Music': '🎵',
      'Sports': '⚽',
      
      // Health & Medical
      'Health': '🏥',
      'Medical': '🏥',
      'Pharmacy': '💊',
      'Doctor': '👨‍⚕️',
      'Dental': '🦷',
      
      // Bills & Utilities
      'Bills': '📄',
      'Electricity': '⚡',
      'Water': '💧',
      'Internet': '🌐',
      'Phone': '📞',
      'Rent': '🏠',
      'Insurance': '🛡️',
      
      // Income
      'Salary': '💰',
      'Income': '💰',
      'Bonus': '💵',
      'Investment': '📈',
      'Business': '💼',
      
      // Other
      'Education': '🎓',
      'Travel': '✈️',
      'Fitness': '💪',
      'Beauty': '💄',
      'Pet': '🐕',
      'Charity': '❤️',
      'Other': '💳',
    };

    // Return emoji if found, otherwise return a default emoji
    return categoryEmojiMap[category] || '💳';
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'income';
    const amount = parseFloat(item.amount || 0);
    const categoryEmoji = getCategoryEmoji(item.category);
    
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={styles.emojiContainer}>
            <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
          </View>
          <View>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            <Text style={styles.transactionMethod}>{item.payment_method || 'Cash'}</Text>
          </View>
        </View>
        <Text style={[styles.transactionAmount, { color: isIncome ? '#4CAF50' : '#FF5722' }]}>
          Rs. {amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const tabs = ['Daily', 'Monthly', 'Summary'];

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'Home':
      case 'Transactions':
        return renderTransactionsContent();
      case 'Accounts':
        return renderPlaceholderScreen('Accounts');
      case 'Goals':
        return renderPlaceholderScreen('Goals');
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
        <TouchableOpacity>
          <Ionicons name="chevron-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.dateText}>Jul 2025</Text>
        <TouchableOpacity>
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

      {/* Date and Daily Summary */}
      <View style={styles.dailySummaryContainer}>
        <View style={styles.dateRow}>
          <View style={styles.dateInfo}>
            <Text style={styles.dayNumber}>20</Text>
            <Text style={styles.dayLabel}>Sun</Text>
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
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
        />
      </View>

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
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Home')}
        >
          <Ionicons 
            name="home" 
            size={24} 
            color={activeTab === 'Home' ? '#333' : '#999'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Home' ? '#333' : '#999' }]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Transactions')}
        >
          <Ionicons 
            name="cash" 
            size={24} 
            color={activeTab === 'Transactions' ? '#333' : '#999'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Transactions' ? '#333' : '#999' }]}>
            Transactions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Accounts')}
        >
          <Ionicons 
            name="wallet" 
            size={24} 
            color={activeTab === 'Accounts' ? '#333' : '#999'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Accounts' ? '#333' : '#999' }]}>
            Accounts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Stats')}
        >
          <Ionicons 
            name="bar-chart" 
            size={24} 
            color={activeTab === 'Stats' ? '#333' : '#999'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Stats' ? '#333' : '#999' }]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 50,
    paddingBottom: 15,
    fontcolor: 'white',
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
    shadowColor: 'black',
  },
  tabText: {
    color: '#D3D3D3',
    fontSize: 14,
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
    flexDirection: 'row',
    backgroundColor: 'white',
    height: 80,
    paddingBottom: 10,
    paddingTop: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});