// screens/Categories.js
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { supabase } from '../services/supabase';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Image,
  ActivityIndicator, SafeAreaView, StatusBar, Alert, Dimensions,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StyleSheet,
} from 'react-native';
import {
  Home, Wallet, DollarSign, Lock, X, Bell, Palette, Globe, LogOut, MoreHorizontal,
} from 'lucide-react-native';
import { fetchRecommendation, getBudgetingIncome } from './fetchRecommendation';

const { width: screenWidth } = Dimensions.get('window');

/* -------------------- Helpers & Validation -------------------- */
const MONEY_CAP = 1000000; // max budget limit
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const money = (v) =>
  (Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s = '') => s.trim().toLowerCase();

const parseMoney = (v) => {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > MONEY_CAP) return MONEY_CAP;
  return Math.round(n * 100) / 100;
};

const validateBudgetTotals = (categories, income) => {
  const total = categories.reduce((s, c) => s + (Number(c.limit) || 0), 0);
  const totalR = round2(total);
  const incomeR = round2(Number(income) || 0);
  return {
    total: totalR,
    leftover: round2(incomeR - totalR),
    over: totalR > incomeR,
  };
};

// role guesser (no DB column required)
const guessRole = (name = '') => {
  const n = name.toLowerCase();
  if (n === 'buffer' || n === 'emergency' || n === 'rainy day') return 'buffer';
  if (n.includes('shop') || n.includes('gift') || n.includes('hobby')) return 'flex';
  if (['rent','housing','utilities','food','transport','healthcare','medicine'].some(k => n.includes(k)))
    return 'critical';
  return 'flex';
};


// Make sure user has a Buffer category (no “role” column needed)
async function ensureBufferExists(uid) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id,name')
    .eq('user_id', uid)
    .eq('type', 'expense');

  const hasBuffer = (existing || []).some((c) => norm(c.name) === 'buffer');
  if (!hasBuffer) {
    await supabase.from('categories').insert([
      {
        user_id: uid,
        name: 'Buffer',
        icon: '🧰',
        color: '#E0E7FF',
        type: 'expense',
       
      },
    ]);
  }
}

/* --------------------------- UI bits -------------------------- */
const Icon = ({ name, size = 24, color = '#000' }) => {
  const iconMap = { menu: '☰', search: '🔍', plus: '+', close: '✕', home: '🏠', dollar: '$', target: '🎯', chart: '📊' };
  return <Text style={[{ fontSize: size, color }, styles.iconText]}>{iconMap[name] || name}</Text>;
};

/* --------------------------- More Menu ------------------------ */
const MoreMenu = ({ isOpen, onClose, onLogout }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) return;

        setEmail(user.email ?? '');
        const metaName =
          user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.username || '';
        if (metaName) setName(metaName);
        else {
          const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle();
          setName(profile?.name || '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.moreModalOverlay}>
        <TouchableOpacity style={styles.moreBackdrop} onPress={onClose} activeOpacity={1} />
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
                  <Text style={styles.menuItemSubtitle}>LKR (Rs.)</Text>
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

              <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={onLogout}>
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

/* ----------------------- Category Form Modal ------------------ */
const CategoryFormModal = memo(function CategoryFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  availableIcons,
  availableColors,
  existingNames = [],
}) {
  const [localForm, setLocalForm] = useState({ name: '', limit: '', icon: '📦', color: '#E8E8E8' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const { name = '', limit = '', icon = '📦', color = '#E8E8E8' } = initialData || {};
    setLocalForm({ name, limit: limit !== undefined && limit !== null ? String(limit) : '', icon, color });
    setError('');
  }, [visible, initialData]);

  const updateFormName = useCallback((text) => setLocalForm((p) => ({ ...p, name: text })), []);
  const updateFormLimit = useCallback((text) => {
    const numericText = text.replace(/[^0-9.]/g, '');
    const parts = numericText.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
    setLocalForm((p) => ({ ...p, limit: formatted }));
  }, []);
  const updateFormIcon = useCallback((icon) => setLocalForm((p) => ({ ...p, icon })), []);
  const updateFormColor = useCallback((color) => setLocalForm((p) => ({ ...p, color })), []);

  const handleSave = useCallback(() => {
    setError('');
    const name = localForm.name.trim();
    if (!name) {
      setError('Name is required');
      return;
    }
    const duplicate = existingNames.some(
      (n) => n !== norm(initialData?.name || '') && norm(n) === norm(name)
    );
    if (duplicate) {
      setError('You already have a category with this name');
      return;
    }
    const moneyVal = parseMoney(localForm.limit);
    if (moneyVal === null) {
      setError('Enter a valid amount');
      return;
    }
    onSave({ ...localForm, name, limit: moneyVal });
  }, [localForm, onSave, existingNames, initialData]);

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
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

            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="none" contentContainerStyle={{ paddingBottom: 16 }}>
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

                {!!error && <Text style={{ color: '#DC2626' }}>{error}</Text>}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Icon</Text>
                  <View style={styles.iconGrid}>
                    {availableIcons.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        onPress={() => updateFormIcon(icon)}
                        style={[styles.iconOption, localForm.icon === icon && styles.selectedIcon]}
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
                  <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
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

/* --------------------------- Delete Modal --------------------- */
const DeleteModal = memo(function DeleteModal({ visible, onClose, onConfirm, categoryName }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} presentationStyle="overFullScreen">
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
              Are you sure you want to delete "{categoryName}"? This action cannot be undone.
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

/* -------------------------- Main Screen ----------------------- */
const CategoryManager = ({ onBack, onLogout, onTransactions }) => {
  const [userId, setUserId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [userIncome, setUserIncome] = useState(0);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

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
    () => ['#E8E8E8', '#A8C8EC', '#F4E4A6', '#F8BBD9', '#C7D2FE', '#A7F3D0', '#FEF3C7', '#FECACA', '#D1FAE5', '#DBEAFE', '#E0E7FF', '#FCE7F3'],
    []
  );
  const DEFAULT_COLORS = {
  critical: '#DBEAFE', // light blue
  flex: '#FEF3C7',     // light yellow
  buffer: '#FECACA',   // light red
};

  /* Load user + data */
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
      await ensureBufferExists(user.id);
      await fetchCategories(user.id);
      await fetchUserIncome(user.id);
    })();
  }, []);

  /* Real-time spend updates */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { category, amount } = payload.new;
          setCategories((prev) =>
            prev.map((c) => (c.name === category ? { ...c, spent: (c.spent || 0) + Number(amount) } : c))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchUserIncome = useCallback(async (uidParam = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = uidParam || user?.id;
      if (!uid) return;

      // pulls base users.monthly_income + this month's rows from `income`
      const { income } = await getBudgetingIncome(uid);
      setUserIncome(Number(income) || 0);
    } catch (e) {
      console.log('fetchUserIncome error:', e?.message || e);
      setUserIncome(0);
    }
  }, []);

  const fetchCategories = useCallback(async (uidParam = null) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = uidParam || user?.id;
      if (!uid) throw new Error('No session');

      const { data: allCategories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', uid)
        .eq('type', 'expense')
        .order('id', { ascending: false });
      if (catError) throw catError;

      const firstDay = new Date();
      firstDay.setDate(1);
      const firstDayStr = firstDay.toISOString().split('T')[0];

      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('amount, category_id, date')
        .eq('user_id', uid)
        .gte('date', firstDayStr);
      if (expError) throw expError;

      const spentMap = {};
      (expenses || []).forEach((exp) => {
        spentMap[exp.category_id] = (spentMap[exp.category_id] || 0) + Number(exp.amount || 0);
      });

      const enriched = (allCategories || []).map((cat) => ({
        ...cat,
        spent: spentMap[cat.id] || 0,
        limit: Number(cat.limit_ || 0),
      }));

      setCategories(enriched);
    } catch (e) {
      Alert.alert('Error fetching categories', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  /* AI Budget */
  const handleGetAIBudget = async () => {
    try {
      setIsLoadingRecommendation(true);
      const rec = await fetchRecommendation(); // updates Supabase limits too
      if (rec) {
        setRecommendation(rec);
        await fetchCategories(); // refresh cards with new limits
        //Alert.alert('AI Budget Applied', 'Limits updated based on your current income.');
      }
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  /* Totals banner (rounded to avoid -0.01 drift) */
  const totals = useMemo(() => validateBudgetTotals(categories, userIncome), [categories, userIncome]);

  /* CRUD handlers */
  const handleAdd = useCallback(() => {
    setFormInitialData(null);
    setShowFormModal(true);
  }, []);
  const handleEdit = useCallback((category) => {
    setFormInitialData({ ...category, limit: category.limit });
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

        // client-side duplicate check (case-insensitive)
        const lower = norm(form.name);
        const exists = categories.some((c) => c.id !== formInitialData?.id && norm(c.name) === lower);
        if (exists) {
          Alert.alert('Duplicate', 'You already have a category with this name.');
          return;
        }

        const parsedLimit = parseMoney(form.limit);
        if (parsedLimit === null) {
          Alert.alert('Error', 'Please enter a valid amount.');
          return;
        }

        // Over-income guard
        const currentLimit = formInitialData?.id
          ? Number(categories.find((c) => c.id === formInitialData.id)?.limit || 0)
          : 0;
        const newTotal = (Number(totals?.total) || 0) - currentLimit + parsedLimit;
        if ((Number(userIncome) || 0) > 0 && newTotal > Number(userIncome)) {
          Alert.alert('Over budget', `This change would exceed your income by Rs. ${money(newTotal - userIncome)}. Please lower a limit and try again.`);
          return;
        }

        const categoryData = {
          name: form.name.trim(),
          icon: form.icon || '📦',
          limit_: parsedLimit,
          color: form.color || '#E8E8E8',
          user_id: user.id,
          type: 'expense',
        };

        if (formInitialData?.id) {
          const { error: upErr } = await supabase.from('categories').update(categoryData).eq('id', formInitialData.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from('categories').insert([categoryData]);
          if (insErr) throw insErr;
        }

        await fetchCategories();
        setShowFormModal(false);
        setFormInitialData(null);
      } catch (e) {
        Alert.alert('Save Error', e.message || 'Failed to save category.');
      }
    },
    [categories, formInitialData, fetchCategories, totals?.total, userIncome]
  );

  const confirmDelete = useCallback(async () => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deletingCategory.id);
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
    if (onLogout) onLogout();
  };

  /* Filter + Group */
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [categories, searchTerm]
  );

  const grouped = useMemo(() => {
    const crit = [];
    const flex = [];
    const buffer = [];
    (filteredCategories || []).forEach((c) => {
      const role = guessRole(c.name);
      if (role === 'buffer') buffer.push(c);
      else if (role === 'critical') crit.push(c);
      else flex.push(c);
    });
    return {
      crit,
      flex,
      buffer,
      totals: {
        crit: crit.reduce((s, x) => s + Number(x.limit || 0), 0),
        flex: flex.reduce((s, x) => s + Number(x.limit || 0), 0),
        buffer: buffer.reduce((s, x) => s + Number(x.limit || 0), 0),
      },
    };
  }, [filteredCategories]);

  /* Small components */
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

  // AI recommendation display (friendlier, visual, explained terms)
  const RecommendationDisplay = () => {
    if (!recommendation) return null;

    // bucket by role
    const buckets = { critical: [], flex: [], buffer: [] };
    Object.entries(recommendation).forEach(([name, amt]) => {
      const role = guessRole(name);
      buckets[role]?.push([name, Number(amt) || 0]);
    });

    const Row = ({ name, amt }) => {
      const pct = userIncome ? Math.max(0, Math.min(100, (amt / userIncome) * 100)) : 0;
      return (
        <View style={styles.recRow} key={name}>
          <View style={styles.recRowTop}>
            <Text style={styles.recName} numberOfLines={1}>{name}</Text>
            <Text style={styles.recAmount}>Rs. {money(amt)} <Text style={styles.recPct}>({pct.toFixed(1)}%)</Text></Text>
          </View>
          <View style={styles.recBarTrack}>
            <View style={[styles.recBarFill, { width: `${pct}%` }]} />
          </View>
        </View>
      );
    };

    const Section = ({ title, hint, items }) => {
      if (!items?.length) return null;
      return (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.recSectionTitle}>{title}</Text>
          <Text style={styles.recSectionHint}>{hint}</Text>
          {items.map(([n, a]) => <Row key={n} name={n} amt={a} />)}
        </View>
      );
    };

    return (
      <View style={styles.recCard}>
        <Text style={styles.recHeader}>💡 Your Smart Budget Plan</Text>
        <Text style={styles.recIntro}>
          Based on your monthly income of Rs. {money(userIncome)}, here’s an easy plan for this month.
        </Text>

        <Section
          title="Essentials (Must‑haves)"
          hint="Bills and basics you can’t skip."
          items={buckets.critical}
        />
        <Section
          title="Flexible Spending (Wants)"
          hint="Optional items you can adjust."
          items={buckets.flex}
        />
        <Section
          title="Emergency Fund (Buffer)"
          hint="Money set aside for surprises or tough months."
          items={buckets.buffer}
        />

        <Text style={styles.recFooterNote}>
          You can edit any limit in the category cards below.
        </Text>
      </View>
    );
  };

  /* Category card with inline validation */
  const CategoryCard = ({ category }) => {
    const remaining = (Number(category.limit) || 0) - (Number(category.spent) || 0);
    const isOverBudget = remaining < 0;

    const [editedLimit, setEditedLimit] = useState(String(category.limit));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
      setEditedLimit(String(category.limit));
    }, [category.limit]);

    const saveLimit = async () => {
      setError('');
      const newLimit = parseMoney(editedLimit);
      if (newLimit === null) {
        setError('Enter a valid amount');
        return;
      }

      // Over-income guard for inline edits
      const currentLimit = Number(category.limit || 0);
      const newTotal = (Number(totals?.total) || 0) - currentLimit + newLimit;
      if ((Number(userIncome) || 0) > 0 && newTotal > Number(userIncome)) {
        setError(`Over income by Rs. ${money(newTotal - userIncome)}. Please lower a limit.`);
        return;
      }

      setIsSaving(true);
      const { error: upErr } = await supabase.from('categories').update({ limit_: newLimit }).eq('id', category.id);
      setIsSaving(false);
      if (upErr) Alert.alert('Failed to update limit');
      else await fetchCategories();
    };

    const onChange = (text) => {
      const numeric = text.replace(/[^0-9.]/g, '');
      const parts = numeric.split('.');
      const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numeric;
      setEditedLimit(formatted);
    };
    const role = guessRole(category.name);
    const cardColor = category.color && category.color !== '#E8E8E8'
      ? category.color
      : DEFAULT_COLORS[role] || '#FFFFFF';
    

    return (
      
      <View style={[styles.categoryCard, { backgroundColor: cardColor }]}>
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
                onChangeText={onChange}
                onBlur={saveLimit}
                editable={!isSaving}
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1,
                  borderColor: error ? '#DC2626' : '#ccc',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  fontWeight: '600',
                  minWidth: 80,
                  color: '#1F2937',
                  backgroundColor: '#fff',
                }}
              />
              {!!error && <Text style={{ color: '#DC2626', fontSize: 12 }}>{error}</Text>}
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, isOverBudget && styles.overBudget]}>Rs.{money(remaining)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
  <View style={{ flex: 1, backgroundColor: '#008080' }}>
    {/* Paint the notch / status area */}
    <SafeAreaView style={{ backgroundColor: '#008080' }}>
      <StatusBar barStyle="light-content" backgroundColor="#008080" />
    </SafeAreaView>

    {/* App content area */}
    <SafeAreaView style={styles.container}>

      <Header />

      {/* Budget totals banner (rounded) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {userIncome <= 0 ? (
          <Text style={{ color: '#DC2626' }}>
            Add your monthly income to keep budgets in check.
          </Text>
        ) : totals.over ? (
          <Text style={{ color: '#DC2626' }}>
            Over by Rs. {money(totals.total - userIncome)}. Lower your limits to fit your income.
          </Text>
        ) : (
          <Text style={{ color: '#065f46', fontSize: 16 }}>
            Left to assign: Rs. {money(totals.leftover)} 
          </Text>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
        <View style={{ padding: 20 }}>
          {/* Friendlier AI Button + hint */}
          <TouchableOpacity
            onPress={handleGetAIBudget}
            style={[styles.aiButton, isLoadingRecommendation && styles.aiButtonDisabled]}
            disabled={isLoadingRecommendation}
          >
            {isLoadingRecommendation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.aiButtonText}> View Smart Plan</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.aiButtonHint}>
            Creates a personalized budgeting plan based on your income and age. Clicking the above button will reset your custom edits back to the smart plan.
          </Text>

          {/* Friendlier AI Summary */}
          <RecommendationDisplay />
        </View>

        {/* Grouped category cards */}
        <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
          {grouped.crit.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>
                Essentials (Must‑haves) — Rs. {money(grouped.totals.crit)}
              </Text>
              {grouped.crit.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>
          )}

          {grouped.flex.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>
                Flexible Spending (Nice‑to‑haves) — Rs. {money(grouped.totals.flex)}
              </Text>
              {grouped.flex.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>
          )}

          {grouped.buffer.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>
                Emergency Fund (Buffer) — Rs. {money(grouped.totals.buffer)}
              </Text>
              {grouped.buffer.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity onPress={handleAdd} style={styles.fab}>
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={onBack}>
          <Home size={24} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={onTransactions}>
          <DollarSign size={24} color="white" />
          <Text style={styles.navText}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]}>
          <Wallet size={24} color="white" />
          <Text style={styles.navText}>Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={toggleMoreMenu}>
          <MoreHorizontal size={24} color="white" />
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* More Menu */}
      <MoreMenu isOpen={isMoreMenuOpen} onClose={closeMoreMenu} onLogout={handleLogoutClick} />

      {/* Form Modal */}
      <CategoryFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveForm}
        initialData={formInitialData}
        availableIcons={availableIcons}
        availableColors={availableColors}
        existingNames={categories.map((c) => norm(c.name))}
      />

      {/* Delete Modal */}
      <DeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        categoryName={deletingCategory?.name}
      />
        </SafeAreaView>
  </View>
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
    backgroundColor: '#008080',
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
    color: '#ffffff',
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

  /* Friendlier AI button */
  aiButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#5CAF56',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButtonDisabled: {
    backgroundColor: '#5CAF56',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  aiButtonHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },

  /* Friendlier AI budget styles */
  recCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E6F7FB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0891b2',
  },
  recHeader: {
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 6,
    color: '#0F172A',
  },
  recIntro: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  recSectionTitle: {
    fontWeight: '700',
    color: '#0F172A',
  },
  recSectionHint: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  recRow: {
    marginBottom: 10,
  },
  recRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recName: {
    fontWeight: '600',
    color: '#111827',
    maxWidth: '55%',
  },
  recAmount: {
    fontWeight: '600',
    color: '#111827',
  },
  recPct: {
    fontWeight: '400',
    color: '#6B7280',
  },
  recBarTrack: {
    height: 8,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  recBarFill: {
    height: 8,
    backgroundColor: '#0891b2',
    borderRadius: 999,
  },
  recFooterNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
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
