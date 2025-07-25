// charts.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { VictoryPie } from 'victory-native';
import { supabase } from '../services/supabase';
import {
  Home,
  Wallet,
  DollarSign,
  MoreHorizontal,
  X,
  Bell,
  Palette,
  Globe,
  LogOut,
  Lock,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = (v = 0) => `Rs. ${Number(v).toFixed(2)}`;

/** -------- fallback palette in the same “warm / vivid” vibe -------- */
const FALLBACK_PALETTE = [
  '#F87171', // red-400
  '#FB923C', // orange-400
  '#FBBF24', // amber-400
  '#4ADE80', // green-400
  '#34D399', // teal-400
  '#60A5FA', // blue-400
  '#A78BFA', // violet-400
  '#F472B6', // pink-400
  '#22D3EE', // cyan-400
  '#FACC15', // yellow-400
  '#2DD4BF', // teal-300
  '#FB7185', // rose-400
];

/** Convert #RRGGBB to rgba(r,g,b,alpha) string */
function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─────────────────────  OPTIONAL: same More menu UI you used  ─────────────────────
const MoreMenu = ({ isOpen, onClose, onLogout }) => (
  <Modal
    visible={isOpen}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
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
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Amar Bazlin</Text>
                <Text style={styles.profileEmail}>aamarbazlin.com</Text>
              </View>
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

// ──────────────────────────  MAIN SCREEN  ──────────────────────────
export default function ChartsScreen({ onBack, onTransactions, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          Alert.alert('Error', 'Unable to fetch user session');
          setLoading(false);
          return;
        }

        // Fetch categories (with user-specific & global) + include color/icon
        const { data: allCategories, error: catError } = await supabase
          .from('categories')
          .select('id, name, icon, color, limit_')
          .or(`user_id.is.null,user_id.eq.${user.id}`)
          .order('id', { ascending: false });

        if (catError) throw catError;

        // Fetch user expenses
        const { data: expenses, error: expenseErr } = await supabase
          .from('expenses')
          .select('category_id, amount')
          .eq('user_id', user.id);

        if (expenseErr) throw expenseErr;

        const spentMap = {};
        (expenses || []).forEach(exp => {
          spentMap[exp.category_id] = (spentMap[exp.category_id] || 0) + Number(exp.amount || 0);
        });

        const enriched = (allCategories || []).map(cat => ({
          ...cat,
          spent: spentMap[cat.id] || 0,
          limit: cat.limit_ || 0,
        }));

        setCategories(enriched);
      } catch (e) {
        Alert.alert('Error', e.message || 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // derive data for chart + list
  const { totalSpent, listData, chartData, colorScale } = useMemo(() => {
    const total = categories.reduce((sum, c) => sum + (c.spent || 0), 0);

    const withPct = categories
      .filter(c => (c.spent || 0) > 0)
      .map((c, idx) => {
        const color = c.color || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
        return {
          ...c,
          color,
          percent: total === 0 ? 0 : ((c.spent || 0) / total) * 100,
        };
      })
      .sort((a, b) => b.percent - a.percent);

    const data = withPct.map(c => ({
      x: c.name,
      y: c.spent || 0,
      percent: c.percent,
      emoji: c.icon,
      color: c.color,
    }));

    return {
      totalSpent: total,
      listData: withPct,
      chartData: data,
      colorScale: withPct.map(d => d.color),
    };
  }, [categories]);

  const toggleMoreMenu = () => setIsMoreMenuOpen(prev => !prev);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.muted}>Loading charts…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending by Category</Text>
        <Text style={styles.totalText}>Total Spent: {formatCurrency(totalSpent)}</Text>
      </View>

      {/* Pie chart */}
      <View style={styles.chartWrapper}>
        {totalSpent === 0 ? (
          <Text style={styles.muted}>No spending yet to chart.</Text>
        ) : (
          <VictoryPie
            data={chartData}
            colorScale={colorScale}
            innerRadius={0}
            padAngle={2}
            animate={{ duration: 500 }}
            width={SCREEN_WIDTH}
            height={SCREEN_WIDTH * 0.75}
            labels={({ datum }) =>
              `${datum.emoji ? `${datum.emoji} ` : ''}${datum.x}\n${datum.percent.toFixed(1)} %`
            }
            labelRadius={({ radius }) => radius + 20}
            style={{
              labels: { fontSize: 12, fill: '#6B7280', textAlign: 'center' },
            }}
          />
        )}
      </View>

      {/* Legend / list */}
      <FlatList
        data={listData}
        keyExtractor={item => item.id?.toString() ?? item.name}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const bg = hexToRgba(item.color, 0.15);
          return (
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: bg }]}>
              <Text style={[styles.badgeText, { color: item.color }]}>
                {Math.round(item.percent)}%
              </Text>
            </View>

            <Text style={styles.name}>
              {item.icon ? `${item.icon} ` : ''}{item.name}
            </Text>

            <Text style={styles.amount}>{formatCurrency(item.spent || 0)}</Text>
          </View>
        )}}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>No categories with spending.</Text>
          </View>
        }
      />

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemInactive]} onPress={onBack}>
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

      <MoreMenu
        isOpen={isMoreMenuOpen}
        onClose={toggleMoreMenu}
        onLogout={onLogout}
      />
    </SafeAreaView>
  );
}

// ──────────────────────────  STYLES  ──────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#9CA3AF' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  totalText: {
    fontSize: 14,
    color: '#6B7280',
  },

  chartWrapper: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  badge: {
    minWidth: 44,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeText: { fontWeight: '600' },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1F2937' },
  amount: { fontSize: 15, fontWeight: '600', color: '#374151' },

  bottomNav: {
    backgroundColor: '#008080',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  navItem: { alignItems: 'center' },
  navItemInactive: { opacity: 0.7 },
  navText: { color: 'white', fontSize: 12, marginTop: 4 },

  // More menu (copied to match your Categories.js)
  moreModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  moreBackdrop: { flex: 1 },
  moreMenu: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moreMenuContent: { padding: 24 },
  moreMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  profileSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profileImage: {
    width: 48,
    height: 48,
    backgroundColor: '#008080',
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  profileImageContent: { width: '100%', height: '100%' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  profileEmail: { fontSize: 14, color: '#6B7280' },
  closeButton: { padding: 8 },
  menuItems: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuIcon: { marginRight: 16 },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  menuItemSubtitle: { fontSize: 14, color: '#6B7280' },
  logoutItem: { marginTop: 32, backgroundColor: '#FEF2F2' },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#EF4444' },
});
