import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { supabase } from '../services/supabase';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {
  Home,
  Wallet,
  DollarSign,
  Lock,
  X,
  Bell,
  Palette,
  Globe,
  LogOut,
  MoreHorizontal,
} from 'lucide-react-native';
import { fetchRecommendation } from './fetchRecommendation';

const { width: screenWidth } = Dimensions.get('window');

/* ------------------------------------------------------------------ */
/* --------------------------- UTIL ICON ---------------------------- */
/* ------------------------------------------------------------------ */
const Icon = ({ name, size = 24, color = '#000' }) => {
  const iconMap = {
    menu: '☰',
    search: '🔍',
    plus: '+',
    close: '✕',
    home: '🏠',
    dollar: '$',
    target: '🎯',
    chart: '📊',
  };
  return (
    <Text style={[{ fontSize: size, color }, styles.iconText]}>
      {iconMap[name] || name}
    </Text>
  );
};

/* ------------------------------------------------------------------ */
/* --------------------------- MORE MENU ---------------------------- */
/* ------------------------------------------------------------------ */
const MoreMenu = ({ isOpen, onClose, onLogout }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadUser = async () => {
      try {
        setLoading(true);

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

        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.username ||
          '';

        if (metaName) {
          setName(metaName);
          return;
        }

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

        const { data: profileByEmail, error: errByEmail } = await supabase
          .from('users')
          .select('name')
          .eq('email', user.email)
          .maybeSingle();

        if (errByEmail) {
          console.log('profileByEmail error =>', errByEmail);
        }

        setName(profileByEmail?.name || '');
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

/* ------------------------------------------------------------------ */
/* ---------------------- CATEGORY FORM MODAL ----------------------- */
/* ------------------------------------------------------------------ */
const CategoryFormModal = memo(function CategoryFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  availableIcons,
  availableColors,
}) {
  const [localForm, setLocalForm] = useState({
    name: '',
    limit: '',
    icon: '📦',
    color: '#E8E8E8',
  });

  useEffect(() => {
    if (visible) {
      const { name = '', limit = '', icon = '📦', color = '#E8E8E8' } =
        initialData || {};
      setLocalForm({
        name: name ?? '',
        limit: limit !== undefined && limit !== null ? String(limit) : '',
        icon,
        color,
      });
    }
  }, [visible, initialData]);

  const updateFormName = useCallback((text) => {
    setLocalForm((p) => ({ ...p, name: text }));
  }, []);

  const updateFormLimit = useCallback((text) => {
    const numericText = text.replace(/[^0-9.]/g, '');
    const parts = numericText.split('.');
    const formattedText =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
    setLocalForm((p) => ({ ...p, limit: formattedText }));
  }, []);

  const updateFormIcon = useCallback((icon) => {
    setLocalForm((p) => ({ ...p, icon }));
  }, []);

  const updateFormColor = useCallback((color) => {
    setLocalForm((p) => ({ ...p, color }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localForm);
  }, [localForm, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {initialData?.id ? 'Edit Category' : 'Add New Category'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={localForm.name}
                    onChangeText={updateFormName}
                    placeholder="Enter category name"
                    placeholderTextColor="#9CA3AF"
                    blurOnSubmit={false}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Budget Limit</Text>
                  <TextInput
                    style={styles.textInput}
                    value={localForm.limit}
                    onChangeText={updateFormLimit}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Icon</Text>
                  <View style={styles.iconGrid}>
                    {availableIcons.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        onPress={() => updateFormIcon(icon)}
                        style={[
                          styles.iconOption,
                          localForm.icon === icon && styles.selectedIcon,
                        ]}
                      >
                        <Text style={styles.iconOptionText}>{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Color</Text>
                  <View style={styles.colorGrid}>
                    {availableColors.map((color) => (
                      <TouchableOpacity
                        key={color}
                        onPress={() => updateFormColor(color)}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          localForm.color === color && styles.selectedColor,
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>
                      {initialData?.id ? 'Save Changes' : 'Add Category'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

/* ------------------------------------------------------------------ */
/* ------------------------ DELETE MODAL ---------------------------- */
/* ------------------------------------------------------------------ */
const DeleteModal = memo(function DeleteModal({ visible, onClose, onConfirm, categoryName }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: undefined }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete Category</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.deleteConfirmation}>
            <View style={styles.deleteIcon}>
              <Icon name="trash" size={24} color="#DC2626" />
            </View>
            <Text style={styles.deleteTitle}>Delete Category</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete "{categoryName}"? This action cannot
              be undone.
            </Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onConfirm} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

/* ------------------------------------------------------------------ */
/* ----------------------- CATEGORY MANAGER ------------------------- */
/* ------------------------------------------------------------------ */
const CategoryManager = ({ onBack, onLogout, onTransactions }) => {
  const [userId, setUserId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [userIncome, setUserIncome] = useState(0); // 🔥 ADDED: Store user income
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false); // 🔥 ADDED: Missing state

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const availableIcons = useMemo(
    () => ['🍜', '🚌', '📚', '🎬', '🛍️', '💪', '⚡', '💄', '🏠', '🎮', '☕', '🎵'],
    []
  );
  const availableColors = useMemo(
    () => [
      '#E8E8E8',
      '#A8C8EC',
      '#F4E4A6',
      '#F8BBD9',
      '#C7D2FE',
      '#A7F3D0',
      '#FEF3C7',
      '#FECACA',
      '#D1FAE5',
      '#DBEAFE',
      '#E0E7FF',
      '#FCE7F3',
    ],
    []
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        Alert.alert('Error', 'Unable to fetch user session');
        return;
      }
      setUserId(user.id);
      await fetchCategories(user.id);
      await fetchUserIncome(user.id); // 🔥 ADDED: Fetch user income
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { category, amount } = payload.new;
          setCategories((prev) =>
            prev.map((c) =>
              c.name === category
                ? { ...c, spent: (c.spent || 0) + Number(amount) }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 🔥 ADDED: Fetch user income
  const fetchUserIncome = useCallback(async (uid) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('monthly_income')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user income:', error);
        return;
      }

      setUserIncome(profile?.monthly_income || 0);
    } catch (error) {
      console.error('Error fetching user income:', error);
    }
  }, []);

  // 🔥 FIXED: AI Budget Handler
const handleGetAIBudget = async () => {
  try {
    setIsLoadingRecommendation(true);
    const rec = await fetchRecommendation(); // will update Supabase limits too
    if (rec) {
      setRecommendation(rec);
      await fetchCategories(); // refresh cards with new limits
      Alert.alert('Done', 'AI limits applied to your categories.');
    }
  } finally {
    setIsLoadingRecommendation(false);
  }
};


  const fetchCategories = useCallback(async (uidParam = null) => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      const uid = uidParam || user?.id;
      if (userError || !uid) {
        Alert.alert('Error', 'Unable to fetch user session');
        setLoading(false);
        return;
      }

      // Get only expense categories for user
      const { data: allCategories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${uid}`)
        .eq('type', 'expense')
        .order('id', { ascending: false });

      if (catError) throw catError;

      // Fetch this month's expenses grouped by category
      const firstDay = new Date();
      firstDay.setDate(1);
      const firstDayStr = firstDay.toISOString().split('T')[0];

      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('amount, category_id, date')
        .eq('user_id', uid)
        .gte('date', firstDayStr);

      if (expError) throw expError;

      // Build map of category_id -> spent amount
      const spentMap = {};
      expenses?.forEach(exp => {
        spentMap[exp.category_id] = (spentMap[exp.category_id] || 0) + Number(exp.amount || 0);
      });

      const enriched = allCategories.map(cat => ({
        ...cat,
        spent: spentMap[cat.id] || 0,
        limit: cat.limit_ || 0,
      }));

      setCategories(enriched);
    } catch (e) {
      Alert.alert('Error fetching categories', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [categories, searchTerm]
  );

  const totalRemaining = useMemo(
    () =>
      categories.reduce((sum, category) => {
        const remaining = category.limit - category.spent;
        return sum + Math.max(remaining, 0);
      }, 0),
    [categories]
  );




  const testYourAiService = async () => {
  const yourAiUrl = 'http://10.3.1.6:5050';
  
  console.log('🔍 Testing your AI service specifically...');
  
  try {
    // Test basic connection
    console.log(`🔍 Testing basic connection to ${yourAiUrl}`);
    const basicTest = await fetch(yourAiUrl, {
      method: 'GET',
      timeout: 5000,
    });
    
    console.log(`✅ Basic connection successful - Status: ${basicTest.status}`);
    
    // Test recommend endpoint
    console.log(`🔍 Testing recommend endpoint...`);
    const recommendTest = await fetch(`${yourAiUrl}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        age: 30,
        income: 100000,
        gender: 'male',
        employment: 'employed',
        dependents: 0
      }),
      timeout: 10000,
    });
    
    console.log(`📊 Recommend response status: ${recommendTest.status}`);
    
    if (recommendTest.ok) {
      const data = await recommendTest.json();
      console.log(`🎉 SUCCESS! AI service is working:`, data);
      return { success: true, url: yourAiUrl, data };
    } else {
      const errorText = await recommendTest.text();
      console.log(`❌ Recommend endpoint failed: ${errorText}`);
      return { success: false, error: `Status ${recommendTest.status}: ${errorText}` };
    }
    
  } catch (error) {
    console.log(`❌ Connection to your AI service failed:`, error.message);
    return { success: false, error: error.message };
  }
};






  const handleAdd = useCallback(() => {
    setFormInitialData(null);
    setShowFormModal(true);
  }, []);

  const handleEdit = useCallback((category) => {
    setFormInitialData({
      ...category,
      limit: category.limit,
    });
    setShowFormModal(true);
  }, []);

  const handleDelete = useCallback((category) => {
    setDeletingCategory(category);
    setShowDeleteModal(true);
  }, []);

  const handleSaveForm = useCallback(
    async (form) => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          Alert.alert('Error', 'User session expired.');
          return;
        }

        const parsedLimit = parseFloat(form.limit);
        if (isNaN(parsedLimit) || parsedLimit < 0) {
          Alert.alert('Error', 'Please enter a valid positive number for limit.');
          return;
        }

        const categoryData = {
          name: form.name.trim(),
          icon: form.icon,
          limit_: parsedLimit,
          color: form.color,
          user_id: user.id,
          type: 'expense',
        };

        if (formInitialData?.id) {
          const { error: upErr } = await supabase
            .from('categories')
            .update(categoryData)
            .eq('id', formInitialData.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase
            .from('categories')
            .insert([categoryData]);
          if (insErr) throw insErr;
        }

        await fetchCategories();
        setShowFormModal(false);
        setFormInitialData(null);
      } catch (e) {
        Alert.alert('Save Error', e.message || 'Failed to save category.');
      }
    },
    [fetchCategories, formInitialData]
  );

  const confirmDelete = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deletingCategory.id);

      if (error) throw error;

      await fetchCategories();
      setShowDeleteModal(false);
      setDeletingCategory(null);
    } catch (e) {
      Alert.alert('Delete Error', e.message || 'Failed to delete category.');
    }
  }, [deletingCategory, fetchCategories]);

  const toggleMoreMenu = () => setIsMoreMenuOpen((p) => !p);
  const closeMoreMenu = () => setIsMoreMenuOpen(false);

  const handleLogoutClick = async () => {
    closeMoreMenu();

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      return;
    }

    if (onLogout) {
      onLogout();
    }
  };

 
  // 🔥 IMPROVED: Better recommendation display in JSX
const RecommendationDisplay = () => {
  if (!recommendation) return null;

  console.log('🔥 Rendering recommendation display with data:', recommendation);

  return (
    <View style={{
      marginTop: 20,
      padding: 20,
      backgroundColor: '#f0f9ff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#0891b2',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <Text style={{
        fontWeight: 'bold',
        fontSize: 20,
        color: '#0f172a',
        marginBottom: 15,
        textAlign: 'center'
      }}>
        🤖 AI Budget Recommendations
      </Text>
      
      {userIncome > 0 && (
        <Text style={{
          fontSize: 16,
          color: '#475569',
          marginBottom: 15,
          textAlign: 'center',
          fontWeight: '500'
        }}>
          Based on Monthly Income: Rs. {userIncome.toLocaleString()}
        </Text>
      )}

      <View style={{ gap: 8 }}>
        {Object.entries(recommendation).map(([category, amount]) => {
          const numAmount = Number(amount);
          const percentage = userIncome > 0 ? ((numAmount / userIncome) * 100).toFixed(1) : 0;
          
          return (
            <View key={category} style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 15,
              backgroundColor: 'white',
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: category.toLowerCase() === 'savings' ? '#16a34a' : '#0891b2',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#1e293b',
                flex: 1,
                textTransform: 'capitalize'
              }}>
                {category}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: category.toLowerCase() === 'savings' ? '#16a34a' : '#0f172a'
                }}>
                  Rs. {numAmount.toLocaleString()}
                </Text>
                {userIncome > 0 && (
                  <Text style={{
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: '500'
                  }}>
                    ({percentage}% of income)
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{
        marginTop: 20,
        padding: 15,
        backgroundColor: '#dcfce7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#16a34a'
      }}>
        <Text style={{
          fontSize: 14,
          color: '#15803d',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          ✅ Budget limits have been updated for your expense categories
        </Text>
      </View>
    </View>
  );
};

  /* ---------------- UI small components ---------------- */

  const LoadingSpinner = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0D9488" />
      <Text style={styles.loadingText}>Loading categories...</Text>
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="menu" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budgets</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#6B7280"
            blurOnSubmit={false}
          />
        </View>
      </View>
    </View>
  );

  


  const CategoryCard = ({ category }) => {
  const remaining = category.limit - category.spent;
  const isOverBudget = remaining < 0;
  const [editedLimit, setEditedLimit] = useState(String(category.limit));
  const [isSaving, setIsSaving] = useState(false);

  const saveLimit = async () => {
    const newLimit = parseFloat(editedLimit);
    if (isNaN(newLimit)) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('categories')
      .update({ limit_: newLimit })
      .eq('id', category.id);

    setIsSaving(false);
    if (error) {
      Alert.alert('Failed to update limit');
    } else {
      await fetchCategories();
    }
  };

  return (
    <View style={[styles.categoryCard, { backgroundColor: category.color }]}>
      <View style={styles.categoryContent}>
        <View style={styles.categoryIconContainer}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
        </View>

        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <View style={styles.categoryActions}>
            <TouchableOpacity onPress={() => handleEdit(category)} style={styles.actionButton}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>|</Text>
            <TouchableOpacity onPress={() => handleDelete(category)} style={styles.actionButton}>
              <Text style={styles.actionText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.categoryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Limit</Text>
            <TextInput
              value={editedLimit}
              onChangeText={setEditedLimit}
              onBlur={saveLimit}
              editable={!isSaving}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 4,
                fontWeight: '600',
                minWidth: 80,
                color: '#1F2937',
                backgroundColor: '#fff',
              }}
            />
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={[styles.statValue, isOverBudget && styles.overBudget]}>
              Rs.{remaining.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Remaining (Monthly)</Text>
          <Text style={styles.summaryAmount}>Rs.{totalRemaining.toFixed(2)}</Text>
        </View>
<View style={{ padding: 20 }}>
  <TouchableOpacity
    onPress={handleGetAIBudget}
    style={{
      padding: 15,
      backgroundColor: isLoadingRecommendation ? '#94a3b8' : '#0891b2',
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 10
    }}
    disabled={isLoadingRecommendation}
  >
    {isLoadingRecommendation ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
        🤖 Get AI Budget
      </Text>
    )}
  </TouchableOpacity>

  {!!recommendation && (
    <View style={{
      marginTop: 10, padding: 14, backgroundColor: '#f0f9ff',
      borderRadius: 12, borderWidth: 1, borderColor: '#0891b2'
    }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
        AI–Suggested Monthly Budget (Rs.)
      </Text>
      {Object.entries(recommendation).map(([name, amt]) => {
        const pct = userIncome ? ((Number(amt) / userIncome) * 100).toFixed(1) : null;
        return (
          <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
            <Text style={{ fontWeight: '600' }}>{name}</Text>
            <Text>Rs. {Number(amt).toLocaleString()} {pct ? `(${pct}%)` : ''}</Text>
          </View>
        );
      })}
      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        You can still edit any limit in the category cards below.
      </Text>
    </View>
  )}
</View>
  


        <View style={styles.categoriesContainer}>
          {filteredCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity onPress={handleAdd} style={styles.fab}>
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity

          style={[styles.navItem, styles.navItemInactive]}
          onPress={onBack}
        >
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, styles.navItemInactive]}
          onPress={onTransactions}
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
        onLogout={handleLogoutClick}
      />

      {/* Form Modal */}
      <CategoryFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveForm}
        initialData={formInitialData}
        availableIcons={availableIcons}
        availableColors={availableColors}
      />

      {/* Delete Modal */}
      <DeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        categoryName={deletingCategory?.name}
      />
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/* ------------------------------- STYLES --------------------------- */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryContainer: {
    marginVertical: 24,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderWidth: 0.7,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: '#CD5C5C',
    fontSize: 14,
    marginLeft: 4,
  },
  separator: {
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  statValue: {
    fontWeight: '600',
    color: '#1F2937',
    fontSize: 16,
  },
  overBudget: {
    color: '#DC2626',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#F59E0B',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
  // More Menu
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
  // Modals (shared)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: (screenWidth - 120) / 6,
    height: 48,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  iconOptionText: {
    fontSize: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: (screenWidth - 120) / 6,
    height: 40,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  selectedColor: {
    borderColor: '#1F2937',
    borderWidth: 3,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#0D9488',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteConfirmation: {
    alignItems: 'center',
  },
  deleteIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#FEF2F2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  deleteMessage: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 80,
  },
  iconText: {
    fontFamily: 'System',
  },
});

export default CategoryManager;


