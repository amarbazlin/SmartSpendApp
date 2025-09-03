// components/BottomNav.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, DollarSign, Wallet, MoreHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function BottomNav({ active = 'home', onHome, onTransactions, onAccounts, onMore }) {
  const { t } = useTranslation();
  const Item = ({ id, icon: Icon, label, onPress }) => (
    <TouchableOpacity
      style={[styles.navItem, active === id ? null : styles.inactive]}
      onPress={onPress}
    >
      <Icon size={24} color="white" />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrap}>
      <Item id="home" icon={Home} label={t('nav.home')} onPress={onHome} />
      <Item id="transactions" icon={DollarSign} label={t('nav.transactions')} onPress={onTransactions} />
      <Item id="accounts" icon={Wallet} label={t('nav.accounts')} onPress={onAccounts} />
      <Item id="more" icon={MoreHorizontal} label={t('nav.more')} onPress={onMore} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#008080',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  navItem: { alignItems: 'center' },
  inactive: { opacity: 0.7 },
  navText: { color: 'white', fontSize: 12, marginTop: 4 },
});
