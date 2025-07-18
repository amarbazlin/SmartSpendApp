import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
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
  CheckCircle 
} from 'lucide-react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Menu size={24} color="#374151" />
          <View style={styles.headerCenter}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
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
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.greenIcon]}>
                <BarChart3 size={32} color="#059669" />
              </View>
              <Text style={styles.featureText}>Personalized Budgeting</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.blueIcon]}>
                <PiggyBank size={32} color="#2563EB" />
              </View>
              <Text style={styles.featureText}>Expense Analysis</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.grayIcon]}>
                <Target size={32} color="#4B5563" />
              </View>
              <Text style={styles.featureText}>Investment Advice</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, styles.pinkIcon]}>
                <DollarSign size={32} color="#DB2777" />
              </View>
              <Text style={styles.featureText}>Smart Alerts</Text>
            </View>
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
    backgroundColor: '#60A5FA',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
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
    backgroundColor: '#10B981',
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
    backgroundColor: '#4ADE80',
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
    backgroundColor: '#4ADE80',
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
});