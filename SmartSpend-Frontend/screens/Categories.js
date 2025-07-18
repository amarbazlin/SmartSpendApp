import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { 
  Home, 
  Menu, 
  Target, 
  BarChart3, 
  DollarSign, 
  Search, 
  Plus
} from 'lucide-react-native';

const Categories = ({ onBack }) => {
  const categories = [
    {
      id: 1,
      name: 'Food',
      icon: '🍜',
      limit: 100.00,
      remaining: 45.00,
      color: '#E8E8E8',
    },
    {
      id: 2,
      name: 'Transport',
      icon: '🚌',
      limit: 150.00,
      remaining: 65.00,
      color: '#A8C8EC',
    },
    {
      id: 3,
      name: 'Education',
      icon: '📚',
      limit: 150.00,
      remaining: 65.00,
      color: '#F4E4A6',
    },
  ];

  const totalRemaining = categories.reduce((sum, category) => sum + category.remaining, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onBack}>
          <Menu size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budgets</Text>
        <View style={styles.headerSpacer} />
      </View>

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.remainingSection}>
          <Text style={styles.remainingLabel}>Remaining (Monthly)</Text>
          <Text style={styles.remainingAmount}>${totalRemaining.toFixed(2)}</Text>
        </View>

        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <View key={category.id} style={[styles.categoryCard, { backgroundColor: category.color }]}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.iconText}>{category.icon}</Text>
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity>
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <Text style={styles.actionSeparator}> | </Text>
                    <TouchableOpacity>
                      <Text style={styles.actionText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.categoryAmounts}>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>Limit</Text>
                    <Text style={styles.amountValue}>${category.limit.toFixed(2)}</Text>
                  </View>
                  <View style={styles.amountColumn}>
                    <Text style={[styles.amountLabel, styles.remainingText]}>Remaining</Text>
                    <Text style={[styles.amountValue, styles.remainingText]}>
                      ${category.remaining.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.addButton}>
        <Plus size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={onBack}>
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <DollarSign size={24} color="white" />
          <Text style={styles.navText}>Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Target size={24} color="white" />
          <Text style={styles.navText}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <BarChart3 size={24} color="white" />
          <Text style={styles.navText}>Stats</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  headerSpacer: {
    width: 24,
  },
  menuButton: {
    padding: 8,
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
  remainingSection: {
    marginBottom: 24,
  },
  remainingLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  remainingAmount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoriesContainer: {
    marginBottom: 100,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionSeparator: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountColumn: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  remainingText: {
    color: '#EF4444',
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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

export default Categories;