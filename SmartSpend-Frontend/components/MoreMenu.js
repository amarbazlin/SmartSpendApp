// components/MoreMenu.js
import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Lock, DollarSign, Wallet, Bell, Palette, Globe, LogOut, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';

export default function MoreMenu({ isOpen, onClose, onLogout, navigation }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setEmail(user?.email ?? '');
        const metaName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.user_metadata?.username ||
          '';
        if (metaName) setName(metaName);
        else {
          const { data: profileByEmail } = await supabase
            .from('users')
            .select('name')
            .eq('email', user?.email)
            .maybeSingle();
          setName(profileByEmail?.name || '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <ScrollView style={{ padding: 24 }}>
            <View style={styles.header}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Image source={require('../screens/images/App_Logo.png')} style={{ width: '100%', height: '100%' }} />
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{name || '—'}</Text>
                    <Text style={styles.email}>{email}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* items */}
            <TouchableOpacity style={styles.item}>
              <Lock size={20} color="#6B7280" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('menu.passcode')}</Text>
                <Text style={styles.sub}>OFF</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item}>
              <DollarSign size={20} color="#6B7280" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('menu.mainCurrency')}</Text>
                <Text style={styles.sub}>LKR (Rs.)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item}>
              <Wallet size={20} color="#6B7280" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('menu.subCurrency')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item}>
              <Bell size={20} color="#6B7280" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('menu.alarm')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item}>
              <Palette size={20} color="#6B7280" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('menu.style')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                onClose?.();
                navigation?.navigate('LanguageSettings');
              }}
            >
              <Globe size={20} color="#6B7280" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('menu.language')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.item, styles.logout]} onPress={onLogout}>
              <LogOut size={20} color="#EF4444" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.logoutText}>{t('menu.logout')}</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, backgroundColor: '#008080', borderRadius: 24, overflow: 'hidden', marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  email: { fontSize: 14, color: '#6B7280' },

  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  icon: { marginRight: 16 },
  title: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  sub: { fontSize: 14, color: '#6B7280' },
  logout: { marginTop: 32, backgroundColor: '#FEF2F2' },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#EF4444' },
});
