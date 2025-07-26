import React, { useState, useEffect } from 'react';
import TransactionsScreenComponent from './TransactionScreen';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  StatusBar,
  Modal,
  Dimensions,
  ActivityIndicator,
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

// Import your Categories and Transaction components
import CategoryManager from './Categories'; // Adjust the path as needed
import Transaction from './Transaction'; // Adjust the path as needed

import { supabase } from '../services/supabase'; // Adjust the path as needed
import ChartsScreen from './Charts';
const { width } = Dimensions.get('window');

// More Menu Component (replacing the side menu)
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
  const [balanceData, setBalanceData] = useState({
    totalBalance: 0,
    totalExpense: 0,
    totalIncome: 0,
    expensePercentage: 0
  });

  // Fetch balance data from database
  useEffect(() => {
    fetchBalanceData();
  }, []);

  const fetchBalanceData = async () => {
    try {
      // Fetch all income transactions
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('amount');

      if (incomeError) {
        console.error('Error fetching income:', incomeError);
        return;
      }

      // Fetch all expense transactions
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('amount');

      if (expenseError) {
        console.error('Error fetching expenses:', expenseError);
        return;
      }

      // Calculate totals
      const totalIncome = incomeData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalExpense = expenseData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalBalance = totalIncome - totalExpense;
      const expensePercentage = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

      setBalanceData({
        totalBalance,
        totalExpense,
        totalIncome,
        expensePercentage
      });
    } catch (error) {
      console.error('Error calculating balance:', error);
    }
  };

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

  const handleLogout = () => {
    closeMoreMenu();
    if (onLogout) {
      onLogout();
    }
  };

  // Feature handlers
  const handleChatbot = () => {
    // Navigate to chatbot screen
    console.log('Navigate to Chatbot');
  };

  const handleStatistics = () => {
    // Navigate to statistics screen
    console.log('Navigate to Statistics');
  };

  const handleBudgets = () => {
    // Navigate to budgets screen
    console.log('Navigate to Budgets');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs.${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  };

  // Render Categories screen when navigated to
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

  // Render Transaction screen when navigated to
  if (currentScreen === 'transaction') {
    return (
      <Transaction
        onBack={navigateToHome} 
        transactionType={transactionType}
        onTransactionComplete={navigateToHome}
      />
    );
  }

  // Render TransactionsScreen when navigated to
  if (currentScreen === 'transactionsScreen') {
  return (
    <TransactionsScreenComponent
      onBack={navigateToHome}
      onLogout={handleLogout}
    />
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
         <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {/* Header - Removed menu and search */}
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
                <Text style={styles.balanceAmount}>{formatCurrency(balanceData.totalBalance)}</Text>
              </View>
              <View style={styles.balanceRight}>
                <View style={styles.expenseLabel}>
                  <Eye size={16} color="white" />
                  <Text style={styles.balanceLabelText}>Total Expense</Text>
                </View>
                <Text style={styles.expenseAmount}>-{formatCurrency(balanceData.totalExpense)}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(balanceData.expensePercentage, 100)}%` }]}>
                  <Text style={styles.progressText}>{balanceData.expensePercentage}%</Text>
                </View>
                <Text style={styles.progressGoal}>{formatCurrency(balanceData.totalIncome)}</Text>
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <CheckCircle size={16} color="white" />
              <Text style={styles.statusText}>
                {balanceData.expensePercentage}% Of Your Expenses, {balanceData.expensePercentage <= 30 ? 'Looks Good' : balanceData.expensePercentage <= 70 ? 'Monitor Closely' : 'Consider Reducing'}.
              </Text>
            </View>
          </View>

          {/* New Features Section */}
          <View style={styles.newFeaturesSection}>
            <TouchableOpacity style={styles.newFeatureItem} onPress={handleChatbot}>
              <View style={[styles.newFeatureIcon, styles.chatbotIcon]}>
                <MessageCircle size={28} color="#7C3AED" />
              </View>
              <View style={styles.newFeatureContent}>
                <Text style={styles.newFeatureTitle}>AI Chatbot</Text>
                <Text style={styles.newFeatureSubtitle}>Get personalized financial advice</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newFeatureItem} onPress={navigateToCharts}>
              <View style={[styles.newFeatureIcon, styles.statisticsIcon]}>
                <PieChart size={28} color="#059669" />
              </View>
              <View style={styles.newFeatureContent}>
                <Text style={styles.newFeatureTitle}>Statistics</Text>
                <Text style={styles.newFeatureSubtitle}>View detailed spending analytics</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newFeatureItem} onPress={navigateToCategories}>
              <View style={[styles.newFeatureIcon, styles.budgetsIcon]}>
                <Calculator size={28} color="#DC2626" />
              </View>
              <View style={styles.newFeatureContent}>
                <Text style={styles.newFeatureTitle}>Budgets</Text>
                <Text style={styles.newFeatureSubtitle}>Plan and track your spending limits</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.transactionsSection}>
            
            
            <View style={styles.transactionsList}>
              
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Updated Bottom Navigation */}
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