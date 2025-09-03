// SmartSpend-Frontend/screens/ChatbotScreen.js
// Requires: npx expo install react-native-markdown-display
import React, { useState, useRef, useEffect, Fragment } from 'react';
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
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { askInvestAssistant } from '../services/chatApi';

function lkr(n) {
  const num = Number(n || 0);
  return `Rs. ${Math.round(num).toLocaleString('en-LK')}`;
}

/** Strip ALL code blocks (fenced + indented) & JSON dumps from model text */
function sanitizeReply(t = '') {
  let out = String(t).replace(/\r\n/g, '\n');

  // 1) Remove fenced code: ```...``` or ~~~...~~~
  out = out.replace(/```[\s\S]*?```/g, '');
  out = out.replace(/~~~[\s\S]*?~~~/g, '');

  // 2) Remove INDENTED code blocks (>=4 spaces or a tab at line start)
  out = out.replace(/(?:^|\n)((?:[ \t]{4,}.*(?:\n|$))+)/g, '\n');

  // 3) Remove obvious JSON blobs
  out = out.replace(/(^|\n)\s*[{[][\s\S]*?[\]}]\s*(?=\n|$)/g, (block) => {
    return /"[^"]+"\s*:/.test(block) ? '' : block;
  });

  // 4) Unwrap inline `code`
  out = out.replace(/`([^`]+)`/g, '$1');

  // 5) Kill hrules / separators
  out = out.replace(/^\s*[-*_]{3,}\s*$/gm, '');

  // 6) Remove boilerplate/disclaimers
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
    .join('\n');

  // 7) Clean empty bullets / excessive blank lines
  out = out
    .replace(/^\s*[-*]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

/** Beautify to readable markdown in EN/SI/TA */
function beautifyMarkdown(t = '', lang = 'en', stepLabel = 'Step') {
  let out = sanitizeReply(t);

  // Normalize bullets
  out = out.replace(/^\s*•\s+/gm, '- ');

  // Convert "1) item" / "1. item" / "1 - item" to bullets (markdown ordered lists
  // from the model are inconsistent in SI/TA)
  out = out.replace(/^\s*\d+\s*[\)\.\-]\s+/gm, '- ');

  // Bold currency & percentages (English/Sinhala/Tamil “Rs/LKR/රු/ரூ”)
  out = out.replace(/\b(?:LKR|Rs\.?|රු\.?|ரூ\.?)\s?\d[\d,]*(?:\.\d+)?\b/gi, (m) => `**${m}**`);
  out = out.replace(/\b\d{1,3}(?:\.\d+)?\s?%/g, (m) => `**${m}**`);

  // Step headings: match Step / පියවර / படி but render with the localized label
  const stepWords = ['Step', 'පියවර', 'படி'];
  const stepRx = new RegExp(
    `^\\s*\\*{0,2}(?:${stepWords.join('|')})\\s*(\\d+)\\s*[:\\-–—]\\s*(.+?)\\s*\\*{0,2}\\.?\\s*$`,
    'i'
  );

  const lines = out.split('\n');
  const outLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(stepRx);
    if (m) {
      const title = m[2].replace(/\*+$/,'').trim();
      if (outLines.length && outLines[outLines.length - 1] !== '') outLines.push('');
      outLines.push(`#### ${stepLabel} ${m[1]} — ${title}`);
      outLines.push('');
      continue;
    }
    outLines.push(line);
  }
  out = outLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

/** Optional invisible primer; harmless if you don’t pass grounding */
function buildSystemPrimer(grounding) {
  const base = [
    `You are SmartSpend's Finance Assistant.`,
    `CRITICAL DATA RULES:`,
    `• Use ONLY the user's actual SmartSpend data or what the user types.`,
    `• If a value is missing, ASK for it. Do NOT assume numbers.`,
    `• Currency is LKR; format like "Rs. 12,345".`,
  ];
  if (grounding && typeof grounding === 'object') {
    base.push(`GROUNDING:`, JSON.stringify(grounding));
  }
  return base.join('\n');
}

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const grounding = route?.params?.grounding || null;

  const { t, i18n } = useTranslation();
  const langMap = { en: 'English', si: 'Sinhala', ta: 'Tamil' };

  const listRef = useRef(null);

  const intro = t('chat.intro', {
    defaultValue:
      'Hi! I’m your SmartSpend Finance Assistant. Let’s build your custom plan to save more and invest wisely. I’ll set smart savings targets and share clear, actionable investment steps tailored to your budget.',
  });

  const [messages, setMessages] = useState([{ role: 'assistant', content: intro }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  // refresh the intro bubble if user changes app language
  useEffect(() => {
    setMessages((msgs) => {
      if (msgs.length === 1 && msgs[0]?.role === 'assistant') {
        return [{ role: 'assistant', content: intro }];
      }
      return msgs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  // Send button sizing
  const [inputBoxHeight, setInputBoxHeight] = useState(46);
  const btnSize = Math.max(34, Math.min(40, Math.round(inputBoxHeight * 0.70)));
  const iconSize = Math.max(16, Math.min(20, Math.round(btnSize * 0.46)));

  // localized quick prompts
  const quickPrompts = [
    t('chat.q1', { defaultValue: 'What should my monthly savings target be?' }),
    t('chat.q2', { defaultValue: 'How should I invest my surplus this month?' }),
    t('chat.q3', { defaultValue: 'What are 3 smart ways I can cut spending?' }),
  ];

  useEffect(() => {
    const id = setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages, busy]);

  async function send(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);

    try {
      const sys = { role: 'system', content: buildSystemPrimer(grounding) };
      const payloadMessages = [sys, ...next];

      // pick target language from current app language
      const appLng = (i18n.language || 'en').slice(0, 2);
      const targetLang = langMap[appLng] || 'English';
      const stepLabel = t('chat.stepLabel', 'Step');

      const res = await askInvestAssistant({
        messages: payloadMessages,
        targetLang,
        grounding,
      });

      const cleaned = beautifyMarkdown(res?.message || '', i18n.language || 'en', stepLabel);
      setMessages([...next, { role: 'assistant', content: cleaned || 'No reply' }]);

      // Only the two metrics we show
      const monthly = res?.suggestions?.monthly_savings_target_lkr ??
                      res?.snapshot?.rules?.monthly_savings_target_lkr;
      const buffer  = res?.suggestions?.emergency_buffer_lkr ??
                      res?.snapshot?.rules?.emergency_buffer_lkr;

      if (monthly != null || buffer != null) {
        setPlan({
          monthly_savings_target_lkr: monthly,
          emergency_buffer_lkr: buffer,
        });
      } else {
        setPlan(null);
      }
    } catch (e) {
      Alert.alert('Chatbot', e?.message || 'Failed');
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      setPlan(null);
    } finally {
      setBusy(false);
    }
  }

  function handleQuickPrompt(p) {
    if (busy) return;
    send(p);
  }

  const [plan, setPlan] = useState(null);

  function clearChat() {
    setMessages([{ role: 'assistant', content: intro }]);
    setPlan(null);
    setInput('');
  }

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.rowWrap, isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isUser && (
          <View style={[styles.avatar, styles.avatarCoach]}>
            <Image source={require('./images/App_Logo.png')} style={styles.avatarImage} />
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.user : styles.bot]}>
          {isUser ? (
            <Text style={styles.msgText}>{item.content}</Text>
          ) : (
            <Markdown style={mdStyles} mergeStyle onLinkPress={() => true}>
              {item.content}
            </Markdown>
          )}
        </View>

        {isUser && (
          <View style={[styles.avatar, styles.avatarUser]}>
            <Ionicons name="person" size={14} color="#0B1220" />
          </View>
        )}
      </View>
    );
  };

  const TypingRow = (
    <View style={[styles.rowWrap, { justifyContent: 'flex-start' }]}>
      <View style={[styles.avatar, styles.avatarCoach]}>
        <Image source={require('./images/App_Logo.png')} style={styles.avatarImage} />
      </View>
      <View style={[styles.bubble, styles.bot, styles.typingBubble]}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    </View>
  );

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
          <Text style={styles.backText}>{t('nav.home')}</Text>
        </Pressable>

        <View style={styles.headerMiddle}>
          <Text style={styles.title}>{t('chat.title')}</Text>
          <Text style={styles.subtitle}>{t('chat.subtitle')}</Text>
        </View>

        <Pressable onPress={clearChat} style={styles.clearBtn} accessibilityLabel="Start a new chat">
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#4C1D95" />
          <Text style={styles.clearText}>{t('chat.newChat')}</Text>
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
        ListFooterComponent={() =>
          busy ? (
            TypingRow
          ) : (
            <Fragment>
              {/* Plan highlights (no "Quick ways to save") */}
              {plan ? (
                <View style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>
                    {t('chat.planHighlights', { defaultValue: 'Plan highlights' })}
                  </Text>

                  {plan.monthly_savings_target_lkr != null && (
                    <View style={[styles.statPill, styles.pillTeal]}>
                      <Text style={styles.statLabel}>
                        {t('chat.monthlySaveTarget', { defaultValue: 'Monthly save target' })}
                      </Text>
                      <Text style={styles.statValue}>{lkr(plan.monthly_savings_target_lkr)}</Text>
                    </View>
                  )}

                  {plan.emergency_buffer_lkr != null && (
                    <View style={[styles.statPill, styles.pillIndigo]}>
                      <Text style={styles.statLabel}>
                        {t('chat.emergencyBuffer', { defaultValue: 'Emergency buffer' })}
                      </Text>
                      <Text style={styles.statValue}>{lkr(plan.emergency_buffer_lkr)}</Text>
                    </View>
                  )}
                </View>
              ) : null}

              {/* Quick prompts */}
              <View style={styles.quickStrip}>
                {quickPrompts.map((p, idx) => (
                  <Pressable
                    key={`${idx}-${p}`}
                    disabled={busy}
                    onPress={() => handleQuickPrompt(p)}
                    style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.chipText}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </Fragment>
          )
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
            placeholder={t('chat.placeholder')}
            placeholderTextColor="#6B21A8"
            multiline
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
        </View>

        <Pressable
          onPress={() => send()}
          disabled={busy}
          hitSlop={10}
          android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true, radius: btnSize / 2 }}
          style={({ pressed }) => [
            styles.sendBtn,
            { height: btnSize, width: btnSize, borderRadius: btnSize / 2 },
            pressed && styles.sendBtnPressed,
            busy && { opacity: 0.9 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <MaterialIcons
            name="send"
            size={iconSize}
            color="#FFFFFF"
            style={{ transform: [{ translateX: 0.5 }, { translateY: Platform.OS === 'ios' ? 0.5 : 0 }] }}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Background
  screen: { flex: 1, backgroundColor: '#F6FAFB' },

  // Header
  header: {
    paddingTop: 12, paddingBottom: 10, paddingHorizontal: 10, backgroundColor: '#008081',
    borderBottomWidth: 1, borderBottomColor: '#E9D5FF', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, gap: 4 },
  backText: { color: '#FFFFFF', fontWeight: '700' },
  headerMiddle: { alignItems: 'center', flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#E9D5FF' },
  subtitle: { fontSize: 12, color: '#FFFFFF', marginTop: 2 },

  // “New Chat” pill
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#C4B5FD', backgroundColor: '#FFFFFF',
  },
  clearText: { color: '#4C1D95', fontWeight: '700' },

  // Messages
  rowWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble: {
    padding: 12, borderRadius: 16, maxWidth: '86%', shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  msgText: { color: '#0B1220', lineHeight: 20 },
  bot: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  user: { alignSelf: 'flex-end', backgroundColor: '#ECFEFF', borderWidth: 1, borderColor: '#BFF0EA' },
  typingBubble: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },

  // Avatars
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarCoach: { backgroundColor: '#FFFFFF' },
  avatarUser: { backgroundColor: '#DBEAFE' },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },

  // Snapshot card
  tipsCard: { marginTop: 8, padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  tipsTitle: { fontWeight: '800', color: '#0B1220', marginBottom: 2 },
  statPill: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  pillTeal: { backgroundColor: '#F0FDFA', borderColor: '#BFF0EA' },
  pillIndigo: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  statLabel: { color: '#334155', fontWeight: '700' },
  statValue: { color: '#0B1220', fontWeight: '800' },

  // Quick prompts — centered
  quickStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  chip: { backgroundColor: '#E7F0FF', borderColor: '#BBD6FE', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { color: '#0B1220', fontWeight: '700', fontSize: 12 },

  // Composer
  composerWrap: { backgroundColor: '#F6FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputWrap: {
    flex: 1, borderWidth: 1, borderColor: '#6D28D9', borderRadius: 14, backgroundColor: '#F3E8FF',
    paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  input: { minHeight: 40, maxHeight: 140, fontSize: 14, color: '#0B1220' },

  // Send button — circular, subtle shadow, deep blue-green
  sendBtn: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#022D36',
    borderWidth: 1, borderColor: '#001A1F', shadowColor: '#000', shadowOpacity: 0.16,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  sendBtnPressed: { backgroundColor: '#01242A', borderColor: '#001319', transform: [{ scale: 0.98 }] },
});

/* Markdown theme tuned for readable steps & lists */
const mdStyles = {
  body: { color: '#0B1220', fontSize: 14, lineHeight: 21 },
  text: { color: '#0B1220' },
  paragraph: { marginTop: 0, marginBottom: 10 },

  heading1: { fontSize: 18, fontWeight: '800', color: '#0B1220', marginTop: 10, marginBottom: 8 },
  heading2: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1220',
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F3E8FF',
    borderColor: '#C4B5FD',
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1220',
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F0FDFA',
    borderColor: '#BFF0EA',
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  heading4: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1220',
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F0FDFA',
    borderColor: '#BFF0EA',
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  strong: { fontWeight: '800', color: '#0B1220' },

  bullet_list: { marginTop: 4, marginBottom: 10 },
  ordered_list: { marginTop: 4, marginBottom: 10 },
  list_item: { flexDirection: 'row', marginBottom: 8 },
  bullet_list_icon: { color: '#0B1220' },
  ordered_list_icon: { color: '#0B1220' },

  code_inline: { display: 'none' },  // defensive: hide if any slips through
  code_block: { display: 'none' },
  fence: { display: 'none' },

  link: { color: '#2563EB' },

  table: { borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 8, marginVertical: 10 },
  th: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: '800',
    color: '#0B1220',
  },
  tr: { borderColor: '#E5E7EB', borderBottomWidth: 1 },
  td: { borderColor: '#E5E7EB', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8 },
};
