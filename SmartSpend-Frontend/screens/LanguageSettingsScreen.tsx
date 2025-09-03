// screens/LanguageSettingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const LANGS = [
  { code: 'en', labelKey: 'language.english' },
  { code: 'si', labelKey: 'language.sinhala' },
  { code: 'ta', labelKey: 'language.tamil' },
];

export default function LanguageSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(i18n.language?.slice(0, 2) || 'en');

  useEffect(() => {
    navigation?.setOptions?.({ headerShown: false });
  }, [navigation]);

  const choose = async (code) => {
    setSelected(code);
    await i18n.changeLanguage(code);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('language.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

      <View style={styles.card}>
        {LANGS.map((l, idx) => (
          <TouchableOpacity
            key={l.code}
            onPress={() => choose(l.code)}
            style={[styles.row, idx !== LANGS.length - 1 && styles.rowDivider]}
          >
            <Text style={styles.rowText}>{t(l.labelKey)}</Text>
            <View style={[styles.radio, selected === l.code && styles.radioOn]} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.doneText}>{t('language.done')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderColor: '#EEE',
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 18, color: '#374151' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { paddingHorizontal: 16, paddingVertical: 12, color: '#6B7280' },

  card: {
    backgroundColor: '#fff', margin: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  row: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDivider: { borderBottomWidth: 1, borderColor: '#F3F4F6' },
  rowText: { fontSize: 16, color: '#111827' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB' },
  radioOn: { borderColor: '#008080', backgroundColor: '#008080' },

  doneBtn: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#008080', borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
