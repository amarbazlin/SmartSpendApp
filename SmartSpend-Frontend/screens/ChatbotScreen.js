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
import { supabase } from '../services/supabase';

function lkr(n) {
  const num = Number(n || 0);
  return `Rs. ${Math.round(num).toLocaleString('en-LK')}`;
}

/** Strip model junk */
function sanitizeReply(t = '') {
  let out = String(t).replace(/\r\n/g, '\n');

  out = out.replace(/```[\s\S]*?```/g, '');
  out = out.replace(/~~~[\s\S]*?~~~/g, '');
  out = out.replace(/(?:^|\n)((?:[ \t]{4,}.*(?:\n|$))+)/g, '\n');
  out = out.replace(/(^|\n)\s*[{[][\s\S]*?[\]}]\s*(?=\n|$)/g, (block) => {
    return /"[^"]+"\s*:/.test(block) ? '' : block;
  });
  out = out.replace(/`([^`]+)`/g, '$1');
  out = out.replace(/^\s*[-*_]{3,}\s*$/gm, '');
  out = out.replace(/^"[^"]+"\s*$/gm, '');

  const ban = [
    /summary in json/i,
    /json format/i,
    /general guidance/i,
    /not financial advice/i,
    /benchmark/i,
  ];
  out = out
    .split(/\n+/)
    .filter((line) => !ban.some((rx) => rx.test(line)))
    .join('\n');

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/** Beautify markdown */
function beautifyMarkdown(t = '') {
  let out = sanitizeReply(t);

  // Normalize bullets & numbers
  out = out.replace(/^\s*•\s+/gm, '- ');
  out = out.replace(/^\s*\d+\s*[\)\.]\s+/gm, (m) => {
    const num = m.match(/\d+/)?.[0];
    return num ? `${num}. ` : '- ';
  });

  // Merge broken lines in bullets
  out = out.replace(/(\n[-\d]\.? [^\n]+)\n(\s+[^\n]+)/g, (_, a, b) => `${a} ${b.trim()}`);

  // Bold Rs + %
  out = out.replace(/\b(?:LKR|Rs\.?|රු\.?|ரூ\.?)\s?\d[\d,]*(?:\.\d+)?\b/gi, (m) => `**${m}**`);
  out = out.replace(/\b\d{1,3}(?:\.\d+)?\s?%/g, (m) => `**${m}**`);

  return out.trim();
}

/** Invisible primer */
function buildSystemPrimer(grounding) {
  const base = [
    `You are SmartSpend's Finance Assistant.`,
    `CRITICAL DATA RULES:`,
    `• Use ONLY the user's actual SmartSpend data or what the user types.`,
    `• If a value is missing, ASK for it. Do NOT assume numbers.`,
    `• Currency is LKR; format like "Rs. 12,345".`,
    `• The "smart_plan" values represent the USER'S BUDGET LIMITS (planned allocations), NOT actual expenses.`,
    `• Always call them "budget limits" or "planned allocations". Never call them "expenses".`,
    `• If asked about actual spending, only respond if explicit transaction/expense data is provided.`,
  ];

  if (grounding && typeof grounding === 'object') {
    if (grounding.smartPlan) {
      base.push(
        `USER BUDGET LIMITS (smart_plan for this month):`,
        JSON.stringify(grounding.smartPlan, null, 2)
      );
    }
    if (grounding.income) {
      base.push(`USER INCOME: Rs. ${grounding.income}`);
    }
  }

  return base.join('\n');
}

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [groundingState, setGroundingState] = useState(route?.params?.grounding || null);

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
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    setMessages((msgs) => {
      if (msgs.length === 1 && msgs[0]?.role === 'assistant') {
        return [{ role: 'assistant', content: intro }];
      }
      return msgs;
    });
  }, [i18n.language]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("user_grounding")
          .select("smart_plan,income")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.log("Grounding fetch error:", error.message);
          return;
        }

        if (data) {
          setGroundingState((prev) => ({
            ...prev,
            smartPlan: data.smart_plan,
            income: data.income,
          }));
        }
      } catch (e) {
        console.log("Grounding fetch failed:", e.message);
      }
    })();
  }, []);

  const [inputBoxHeight, setInputBoxHeight] = useState(46);
  const btnSize = Math.max(34, Math.min(40, Math.round(inputBoxHeight * 0.70)));
  const iconSize = Math.max(16, Math.min(20, Math.round(btnSize * 0.46)));

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

    let isActive = true;

    try {
      const sys = {
        role: 'system',
        content: buildSystemPrimer(groundingState),
      };

      const payloadMessages = [sys, ...next];

      const appLng = (i18n.language || 'en').slice(0, 2);
      const targetLang = langMap[appLng] || 'English';

      const res = await askInvestAssistant({
        messages: payloadMessages,
        targetLang,
        grounding: groundingState,
      });

      if (!isActive) return;
      const cleaned = beautifyMarkdown(res?.message || '', i18n.language || 'en');

      const planObj = res?.grounding?.smartPlan || groundingState?.smartPlan;
const userQuery = text.toLowerCase();

let finalMessage;

// ✅ Case 1: Budget-related queries → strict mode
if (
  userQuery.includes("budget") ||
  userQuery.includes("budgets") ||
  userQuery.includes("limits") ||
  userQuery.includes("breakdown") ||
  userQuery.includes("summary") ||
  (userQuery.includes("all") && userQuery.includes("categories")) || // ✅ flexible "all categories"
  (userQuery.includes("all") && userQuery.includes("budgets"))      // ✅ flexible "all budgets"
) {
  if (planObj && typeof planObj === "object") {
    if (
      userQuery.includes("all budgets") ||
      userQuery.includes("breakdown") ||
      userQuery.includes("limits") ||
      userQuery.includes("summary") ||
      (userQuery.includes("all") && userQuery.includes("categories"))
    ) {
      finalMessage =
        `**Your Budget Limits This Month:**\n` +
        Object.entries(planObj)
          .map(([cat, val]) => `- ${cat}: ${lkr(val)}`)
          .join("\n");
    } else {
      const categories = Object.keys(planObj).map((c) => c.toLowerCase());
      const matched = categories.find((cat) =>
        userQuery.includes(cat.toLowerCase())
      );
      if (matched) {
        const val =
          planObj[matched.charAt(0).toUpperCase() + matched.slice(1)];
        finalMessage = `Your budget limit for **${matched}** this month is **${lkr(val)}**.`;
      } else {
        finalMessage =
          "Please specify a category (e.g., Food, Shopping, Transport).";
      }
    }
  } else {
    finalMessage = "I don’t see any budget data yet. Please set up your SmartPlan.";
  }
} else {
  finalMessage = cleaned;
}



      setMessages([...next, { role: "assistant", content: finalMessage || "No reply" }]);

      const monthly =
        res?.suggestions?.monthly_savings_target_lkr ??
        res?.snapshot?.rules?.monthly_savings_target_lkr;
      const buffer =
        res?.suggestions?.emergency_buffer_lkr ??
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
  if (isActive) {
    const errorMsg =
      e?.message ||
      "⚠️ Sorry, something went wrong with the Finance Assistant. Please try again later.";
    setMessages([...next, { role: "assistant", content: errorMsg }]);
    setPlan(null);
  }
} finally {
      if (isActive) setBusy(false);
    }

    return () => {
      isActive = false;
    };
  }

  function handleQuickPrompt(p) {
    if (busy) return;
    send(p);
  }

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
            <View style={{ flexShrink: 1 }}>
              {item.content ? (
                <Markdown style={mdStyles} mergeStyle onLinkPress={() => true}>
                  {item.content}
                </Markdown>
              ) : (
                <Text style={styles.msgText}>…</Text>
              )}
            </View>
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
        extraData={messages}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 12 }}
        renderItem={renderItem}
        removeClippedSubviews={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
        ListFooterComponent={() =>
          busy ? (
            TypingRow
          ) : (
            <Fragment>
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
  screen: { flex: 1, backgroundColor: '#F6FAFB' },

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

  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#C4B5FD', backgroundColor: '#FFFFFF',
  },
  clearText: { color: '#4C1D95', fontWeight: '700' },

  rowWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble: {
    padding: 12, borderRadius: 16, maxWidth: '86%', shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  msgText: { color: '#0B1220', lineHeight: 20 },
  bot: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  user: { alignSelf: 'flex-end', backgroundColor: '#ECFEFF', borderWidth: 1, borderColor: '#BFF0EA' },
  typingBubble: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },

  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarCoach: { backgroundColor: '#FFFFFF' },
  avatarUser: { backgroundColor: '#DBEAFE' },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },

  tipsCard: { marginTop: 8, padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  tipsTitle: { fontWeight: '800', color: '#0B1220', marginBottom: 2 },
  statPill: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  pillTeal: { backgroundColor: '#F0FDFA', borderColor: '#BFF0EA' },
  pillIndigo: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  statLabel: { color: '#334155', fontWeight: '700' },
  statValue: { color: '#0B1220', fontWeight: '800' },

  quickStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  chip: { backgroundColor: '#E7F0FF', borderColor: '#BBD6FE', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { color: '#0B1220', fontWeight: '700', fontSize: 12 },

  composerWrap: { backgroundColor: '#F6FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputWrap: {
    flex: 1, borderWidth: 1, borderColor: '#6D28D9', borderRadius: 14, backgroundColor: '#F3E8FF',
    paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  input: { minHeight: 40, maxHeight: 140, fontSize: 14, color: '#0B1220' },

  sendBtn: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#022D36',
    borderWidth: 1, borderColor: '#001A1F', shadowColor: '#000', shadowOpacity: 0.16,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  sendBtnPressed: { backgroundColor: '#01242A', borderColor: '#001319', transform: [{ scale: 0.98 }] },
});

const mdStyles = {
  body: { color: '#0B1220', fontSize: 15, lineHeight: 22 },
  text: { color: '#0B1220' },
  paragraph: { marginTop: 0, marginBottom: 10 },
  strong: { fontWeight: '800', color: '#0B1220' },

  bullet_list: { marginVertical: 6, paddingLeft: 18 },
  ordered_list: { marginVertical: 6, paddingLeft: 18 },
  list_item: { flexDirection: 'row', marginBottom: 6 },

  bullet_list_icon: { color: '#1E3A8A' },
  ordered_list_icon: { color: '#1E3A8A' },

  heading1: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 4,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E40AF',
    marginTop: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 4,
  },
};
