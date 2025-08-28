// SmartSpend-Frontend/screens/ChatbotScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { askInvestAssistant } from '../services/chatApi';

function lkr(n) {
  const num = Number(n || 0);
  return `Rs. ${Math.round(num).toLocaleString('en-LK')}`;
}

/** Strip code blocks / JSON headings / disclaimers from model text */
function sanitizeReply(t = '') {
  let out = String(t);
  out = out.replace(/```[\s\S]*?```/g, '');
  const ban = [
    /summary in json/i,
    /json format/i,
    /\bSUGGESTIONS\b/i,
    /this is general guidance/i,
    /general guidance/i,
    /not financial advice/i,
    /consult(ing)? (a )?financial advisor/i,
    /educational purposes/i,
  ];
  out = out
    .split(/\n+/)
    .filter((line) => !ban.some((rx) => rx.test(line)))
    .join('\n')
    .replace(/\*\*?SUGGESTIONS:?(\*\*)?/gi, '')
    .replace(/^\s*[-*]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const listRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! I’m your SmartSpend coach. Ask about saving, budgeting, or investing — I’ll use your budgets and this month’s spend.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [tips, setTips] = useState(null);

  // Keep Send button proportional to the input height
  const [inputBoxHeight, setInputBoxHeight] = useState(46);
  const btnSize = Math.max(36, Math.min(44, Math.round(inputBoxHeight * 0.78)));
  const iconSize = Math.max(18, Math.min(28, Math.round(btnSize * 0.65))); // bold arrow

  const quickPrompts = [
    'How much should I save this month?',
    'Where can I trim my spending?',
    'What’s a safe emergency buffer for me?',
  ];

  useEffect(() => {
    const id = setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages, tips, busy]);

  async function send(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);

    try {
      const res = await askInvestAssistant({ messages: next, targetLang: 'English' });
      const cleaned = sanitizeReply(res?.message || '');
      setMessages([...next, { role: 'assistant', content: cleaned || 'No reply' }]);

      const sug =
        res?.suggestions && Object.keys(res.suggestions).length > 0
          ? res.suggestions
          : {
              monthly_savings_target_lkr: res?.snapshot?.rules?.monthly_savings_target_lkr,
              emergency_buffer_lkr: res?.snapshot?.rules?.emergency_buffer_lkr,
              category_cuts: res?.snapshot?.rules?.cut_candidates || [],
            };

      const hasValues =
        sug?.monthly_savings_target_lkr != null ||
        sug?.emergency_buffer_lkr != null ||
        (Array.isArray(sug?.category_cuts) && sug.category_cuts.length > 0);

      setTips(hasValues ? sug : null);
    } catch (e) {
      Alert.alert('Chatbot', e?.message || 'Failed');
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      setTips(null);
    } finally {
      setBusy(false);
    }
  }

  function handleQuickPrompt(p) {
    if (busy) return;
    send(p);
  }

  function clearChat() {
    setMessages([
      {
        role: 'assistant',
        content:
          'Hi! I’m your SmartSpend coach. Ask about saving, budgeting, or investing — I’ll use your budgets and this month’s spend.',
      },
    ]);
    setTips(null);
    setInput('');
  }

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.rowWrap,
          isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, styles.avatarCoach]}>
            {/* Update path if your logo is elsewhere */}
            <Image source={require('./images/App_Logo.png')} style={styles.avatarImage} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.user : styles.bot]}>
          <Text style={styles.msgText}>{item.content}</Text>
        </View>
        {isUser && (
          <View style={[styles.avatar, styles.avatarUser]}>
            <Ionicons name="person" size={14} color="#0B1220" />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Home</Text>
        </Pressable>

        <View style={styles.headerMiddle}>
          <Text style={styles.title}>Finance Assistant</Text>
          <Text style={styles.subtitle}>Plan, save, spend smarter</Text>
        </View>

        <Pressable onPress={clearChat} style={styles.clearBtn} accessibilityLabel="Start a new chat">
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#4C1D95" />
          <Text style={styles.clearText}>New Chat</Text>
        </Pressable>
      </View>

      {/* Chat */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 12 }}
        renderItem={renderItem}
        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
        ListFooterComponent={
          <>
            {busy ? (
              <View style={[styles.rowWrap, { justifyContent: 'flex-start' }]}>
                <View style={[styles.avatar, styles.avatarCoach]}>
                  <Image source={require('./images/App_Logo.png')} style={styles.avatarImage} />
                </View>
                <View style={[styles.bubble, styles.bot, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              </View>
            ) : null}

            {tips ? (
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>This month snapshot</Text>

                {tips.monthly_savings_target_lkr != null && (
                  <View style={[styles.statPill, styles.pillTeal]}>
                    <Text style={styles.statLabel}>Save target</Text>
                    <Text style={styles.statValue}>{lkr(tips.monthly_savings_target_lkr)}</Text>
                  </View>
                )}

                {tips.emergency_buffer_lkr != null && (
                  <View style={[styles.statPill, styles.pillIndigo]}>
                    <Text style={styles.statLabel}>Emergency buffer</Text>
                    <Text style={styles.statValue}>{lkr(tips.emergency_buffer_lkr)}</Text>
                  </View>
                )}

                {Array.isArray(tips.category_cuts) && tips.category_cuts.length > 0 && (
                  <View style={styles.cutsBox}>
                    <Text style={styles.cutsTitle}>Top cut ideas</Text>
                    {tips.category_cuts.slice(0, 3).map((c, i) => (
                      <Text key={i} style={styles.cutLine}>
                        • {c?.category}: {lkr(c?.amount_lkr)} — {c?.tip}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {/* Quick prompts (centered) */}
            <View style={styles.quickStrip}>
              {quickPrompts.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => handleQuickPrompt(p)}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.chipText}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </>
        }
      />

      {/* Composer */}
      <View style={styles.composerWrap}>
        <View
          style={styles.inputWrap}
          onLayout={(e) => setInputBoxHeight(Math.max(44, Math.round(e.nativeEvent.layout.height)))}
        >
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything…"
            placeholderTextColor="#6B21A8"
            multiline
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
        </View>

        <Pressable
          onPress={() => send()}
          disabled={busy}
          style={[
            styles.sendBtn,
            {
              height: btnSize,
              width: btnSize,
              borderRadius: btnSize / 2, // perfect circle
            },
            busy && { opacity: 0.7 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            // Slightly thick upward arrow, optically centered
            <Ionicons name="arrow-up-sharp" size={iconSize} color="#FFFFFF" style={{ marginBottom: 1 }} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Background
  screen: { flex: 1, backgroundColor: '#F6FAFB' },

  // Header (teal background; title pastel purple; Home + subtitle white)
  header: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#008081',
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, gap: 4 },
  backText: { color: '#FFFFFF', fontWeight: '700' },
  headerMiddle: { alignItems: 'center', flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#E9D5FF' }, // pastel purple
  subtitle: { fontSize: 12, color: '#FFFFFF', marginTop: 2 },   // white

  // “New Chat” pill
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    backgroundColor: '#FFFFFF',
  },
  clearText: { color: '#4C1D95', fontWeight: '700' },

  // Messages
  rowWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  msgText: { color: '#0B1220', lineHeight: 20 },
  bot: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  user: { alignSelf: 'flex-end', backgroundColor: '#ECFEFF', borderWidth: 1, borderColor: '#BFF0EA' },
  typingBubble: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },

  // Avatars
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarCoach: { backgroundColor: '#FFFFFF' },
  avatarUser: { backgroundColor: '#DBEAFE' },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },

  // Snapshot card
  tipsCard: {
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  tipsTitle: { fontWeight: '800', color: '#0B1220', marginBottom: 2 },
  statPill: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  pillTeal: { backgroundColor: '#F0FDFA', borderColor: '#BFF0EA' },
  pillIndigo: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  statLabel: { color: '#334155', fontWeight: '700' },
  statValue: { color: '#0B1220', fontWeight: '800' },
  cutsBox: { marginTop: 2, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 10 },
  cutsTitle: { color: '#0B1220', fontWeight: '800', marginBottom: 4 },
  cutLine: { color: '#334155', marginTop: 2 },

  // Quick prompts — centered
  quickStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  chip: {
    backgroundColor: '#E7F0FF',
    borderColor: '#BBD6FE',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  chipText: { color: '#0B1220', fontWeight: '700', fontSize: 12 },

  // Composer: pastel-purple input with dark-purple outline
  composerWrap: {
    backgroundColor: '#F6FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#6D28D9',
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  input: { minHeight: 40, maxHeight: 140, fontSize: 14, color: '#0B1220' },

  // Send button (peacock blue) — circular, with thick upward arrow
  sendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014D4E',
    borderWidth: 1,
    borderColor: '#01383A',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
