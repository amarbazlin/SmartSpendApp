import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { 
  Home, 
  Menu, 
  Wallet, 
  Target, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Search, 
  PiggyBank, 
  CreditCard, 
  Eye, 
  CheckCircle,
  Lock,
  User,
  Mail,
  X,
  Bell,
  Palette,
  Globe,
  LogOut,
  Settings
} from 'lucide-react-native';

// Import your Categories component
import Categories from './Categories'; // Adjust the path as needed

const { width } = Dimensions.get('window');

// Side Menu Component
const SideMenu = ({ isOpen, onClose, onLogout }) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Menu */}
        <View style={styles.sideMenu}>
          <ScrollView style={styles.menuContent}>
            {/* Header with Close Button */}
            <View style={styles.menuHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileImage}>
                  <Image
                    source={require('./images/App_Logo.png')}
                    style={styles.profileImageContent}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>John Doe</Text>
                  <Text style={styles.profileEmail}>john@example.com</Text>
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
        
        {/* Backdrop */}
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={onClose}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
};

export default function HomeScreen({ onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigateToCategories = () => {
    setCurrentScreen('categories');
  };

  const navigateToHome = () => {
    setCurrentScreen('home');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    closeMenu();
    if (onLogout) {
      onLogout();
    }
  };

  // Render Categories screen when navigated to
  if (currentScreen === 'categories') {
    return <Categories onBack={navigateToHome} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleMenu}>
            <Menu size={24} color="#374151" />
          </TouchableOpacity>
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
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              placeholder="Search"
              placeholderTextColor="#6B7280"
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={styles.content}>
          {/* Income & Expense Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.incomeButton]}>
              <Text style={styles.buttonText}>+ Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.expenseButton]}>
              <Text style={styles.buttonText}>+ Add Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLeft}>
                <View style={styles.balanceLabel}>
                  <BarChart3 size={16} color="white" />
                  <Text style={styles.balanceLabelText}>Total Balance</Text>
                </View>
                <Text style={styles.balanceAmount}>$7,783.00</Text>
              </View>
              <View style={styles.balanceRight}>
                <View style={styles.expenseLabel}>
                  <Eye size={16} color="white" />
                  <Text style={styles.balanceLabelText}>Total Expense</Text>
                </View>
                <Text style={styles.expenseAmount}>-$1,187.40</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill}>
                  <Text style={styles.progressText}>30%</Text>
                </View>
                <Text style={styles.progressGoal}>$20,000.00</Text>
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <CheckCircle size={16} color="white" />
              <Text style={styles.statusText}>30% Of Your Expenses, Looks Good.</Text>
            </View>
          </View>

          {/* Feature Shortcuts */}
          <View style={styles.featuresGrid}>
            <TouchableOpacity style={styles.featureItem} onPress={navigateToCategories}>
              <View style={[styles.featureIcon, styles.greenIcon]}>
                <BarChart3 size={32} color="#059669" />
              </View>
              <Text style={styles.featureText}>Personalized Budgeting</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.blueIcon]}>
                <PiggyBank size={32} color="#2563EB" />
              </View>
              <Text style={styles.featureText}>Expense Analysis</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.grayIcon]}>
                <Target size={32} color="#4B5563" />
              </View>
              <Text style={styles.featureText}>Investment Advice</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.pinkIcon]}>
                <DollarSign size={32} color="#DB2777" />
              </View>
              <Text style={styles.featureText}>Smart Alerts</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Recent Transaction</Text>
            
            <View style={styles.transactionsList}>
              <View style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <CreditCard size={20} color="#D97706" />
                  </View>
                  <View>
                    <Text style={styles.transactionTitle}>Deposit from account</Text>
                    <Text style={styles.transactionDate}>28 January 2021</Text>
                  </View>
                </View>
                <Text style={styles.transactionAmountRed}>-$850</Text>
              </View>

              <View style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.transactionIcon, styles.blueTransactionIcon]}>
                    <Text style={styles.transactionIconText}>P</Text>
                  </View>
                  <View>
                    <Text style={styles.transactionTitle}>Deposit Paypal</Text>
                    <Text style={styles.transactionDate}>25 January 2021</Text>
                  </View>
                </View>
                <Text style={styles.transactionAmountGreen}>+$2,500</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <DollarSign size={24} color="white" />
          <Text style={styles.navText}>Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <Target size={24} color="white" />
          <Text style={styles.navText}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <BarChart3 size={24} color="white" />
          <Text style={styles.navText}>Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Side Menu */}
      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={closeMenu} 
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  headerSpacer: {
    width: 24,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#6B7280',
    fontSize: 16,
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
    backgroundColor: '#00B8A9',
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
    backgroundColor: '#00B8A9',
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
    fontSize: 30,
    fontWeight: 'bold',
  },
  expenseAmount: {
    color: '#FCA5A5',
    fontSize: 24,
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
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  featureIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  greenIcon: {
    backgroundColor: '#DCFCE7',
  },
  blueIcon: {
    backgroundColor: '#DBEAFE',
  },
  grayIcon: {
    backgroundColor: '#F3F4F6',
  },
  pinkIcon: {
    backgroundColor: '#FCE7F3',
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  transactionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
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
    backgroundColor: '#00B8A9',
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
  // Side Menu Styles
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    width: width * 0.8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuContent: {
    flex: 1,
    padding: 24,
  },
  menuHeader: {
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
    backgroundColor: '#00B8A9',
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