// i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Pure-JS device language guesser (no expo-localization) */
export function getDeviceLang() {
  try {
    const loc = Intl?.DateTimeFormat?.().resolvedOptions?.().locale;
    if (loc) return loc.split('-')[0].toLowerCase();
  } catch {}
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.split('-')[0].toLowerCase();
    }
  } catch {}
  return 'en';
}

// Prefer saved language; else device; else English
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const saved = await AsyncStorage.getItem('appLanguage');
      if (saved) return callback(saved);
    } catch {}
    const best = getDeviceLang();
    return callback(['en', 'si', 'ta'].includes(best) ? best : 'en');
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    try { await AsyncStorage.setItem('appLanguage', lng); } catch {}
  },
};

const resources = {
  /* ============================== ENGLISH ============================== */
  en: {
    translation: {
      nav: { home: 'Home', transactions: 'Transactions', accounts: 'Accounts', more: 'More' },

      common: {
        back: 'Back', import: 'Import', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
        search: 'Search…', success: 'Success', error: 'Error', close: 'Close', ok: 'OK',
      },

      menu: {
        passcode: 'Passcode', mainCurrency: 'Main Currency Setting', subCurrency: 'Sub Currency Setting',
        alarm: 'Alarm Setting', style: 'Style', language: 'Language Setting', logout: 'Logout',
      },

      actions: { addIncome: '+ Add Income', addExpense: '+ Add Expense', save: 'Save' },

      home: {
        totalBalance: 'Total Balance', totalExpense: 'Total Expense', goalAmount: 'Goal',
        expenseShare: '{{percent}}% of Your Expenses,',
        status: { good: 'Looks Good', monitor: 'Monitor Closely', reduce: 'Consider Reducing' },
        smartSmsImport: { title: 'Smart SMS Import', subtitle: 'Import bank transactions' },
        aiChatbot: { title: 'AI Chatbot', subtitle: 'Get personalized financial advice' },
        statistics: { title: 'Statistics', subtitle: 'View detailed spending analytics' },
        budgets: { title: 'Budgets', subtitle: 'Plan and track your spending limits' },

        sms: {
          title: 'SMS import', inst1: 'Grant SMS permission on Android when prompted.',
          inst2: 'We’ll auto-read bank messages and add transactions.',
          inst3: 'Or paste an SMS below to import it manually.',
          placeholder: 'Paste a bank SMS here…', import: 'Import',
          imported_one: 'Imported 1 transaction from SMS',
          imported_other: 'Imported {{count}} transactions from SMS',
          enterText: 'Please enter the SMS text.', parseFail: 'Could not parse SMS text.',
        },
      },

      tx: {
        title: 'Transactions',
        tabs: { daily: 'Daily', monthly: 'Monthly', summary: 'Summary' },
        headers: { income: 'Income', expense: 'Expense', total: 'Total' },
        placeholders: { search: 'Search transactions…' },
        actions: { add: 'Add', update: 'Update' },
        labels: { cash: 'Cash', bank: 'Bank', sms: 'SMS' },
        inline: { income: 'Income', expense: 'Expense', total: 'Total' },
        empty: { title: 'No transactions this month', subtitle: 'Add one using the + button below' },
        deleteConfirm: 'Are you sure you want to delete this transaction?',
        guard: { title: 'Not allowed', msg: 'This would make your monthly total negative.\nAvailable this month: Rs. {{amount}}' },
        msg: { added: 'Transaction added successfully', updated: 'Transaction updated successfully', fetchFail: 'Failed to fetch transactions', noUser: 'No user session' },
        details: { title: 'Transaction Details', category: 'Category', amount: 'Amount', type: 'Type', paymentMethod: 'Payment Method', date: 'Date', note: 'Note', remaining: 'Remaining (this month)' },
      },

      charts: { spendingByCategory: 'Spending by Category', totalSpent: 'Total Spent: {{amount}}' },

      categories: {
        food: 'Food', shopping: 'Shopping', bills: 'Bills', transport: 'Transport',
        income: 'Income', interest: 'Interest', refund: 'Refund', qr: 'QR Payment',
        atm: 'ATM Withdrawal', cashAdvance: 'Cash Advance', other: 'Other',
      },

      language: {
        title: 'Language', subtitle: 'Choose your app language', system: 'System language: {{lang}}',
        english: 'English', sinhala: 'Sinhala (සිංහල)', tamil: 'Tamil (தமிழ்)', done: 'Done',
      },

      chat: {
        title: 'Finance Assistant',
        subtitle: 'Plan, save, spend smarter',
        newChat: 'New Chat',
        placeholder: 'Ask anything…',
        // NEW
        intro:
          "Hi! I’m your SmartSpend Finance Assistant. Let’s build your custom plan to save more and invest wisely. I’ll set smart savings targets and share clear, actionable investment steps tailored to your budget.",
        q1: 'What should my monthly savings target be?',
        q2: 'How should I invest my surplus this month?',
        q3: 'What are 3 smart ways I can cut spending?',
        planHighlights: 'Plan highlights',
        monthlySaveTarget: 'Monthly save target',
        emergencyBuffer: 'Emergency buffer',
        stepLabel: 'Step',
      }, 

            budgets: {
        title: 'Budgets',
        searchPlaceholder: 'Search categories…',
        viewSmartPlan: 'View Smart Plan',
        leftToAssign: 'Left to assign: Rs. {{amount}}',
        limit: 'Limit',
        remaining: 'Remaining',
        edit: 'Edit',
        remove: 'Remove',
        groups: {
          essentials: 'Essentials (Must-haves)',
          wants: 'Wants',
          savings: 'Savings / Investments',
        },
      },

    },
  },

  /* ============================== SINHALA ============================== */
  si: {
    translation: {
      nav: { home: 'මුල් පිටුව', transactions: 'ගනුදෙනු', accounts: 'ගිණුම්', more: 'තවත්' },

      common: {
        back: 'ආපසු', import: 'ආනයන', cancel: 'අවලංගු', delete: 'මකන්න', edit: 'සංස්කරණය',
        search: 'සෙවීම…', success: 'සාර්ථකයි', error: 'දෝෂයක්', close: 'අවසන්', ok: 'හරි',
      },

      menu: {
        passcode: 'මුරසංකේතය', mainCurrency: 'ප්‍රධාන මුදල් ඒකකය', subCurrency: 'උප මුදල් සැකසුම',
        alarm: 'අගුළු/අමතක නොවුම', style: 'පෙනුම', language: 'භාෂා සැකසුම', logout: 'පිටවෙන්න',
      },

      actions: { addIncome: '+ ආදායම එක් කරන්න', addExpense: '+ වියදම එක් කරන්න', save: 'සුරකින්න' },

      home: {
        totalBalance: 'මුළු ශේෂය', totalExpense: 'මුළු වියදම', goalAmount: 'ඉලක්කය',
        expenseShare: 'ඔබගේ වියදම් වලින් {{percent}}%ක්,',
        status: { good: 'හොඳයි', monitor: 'අවධානයෙන් බලන්න', reduce: 'අඩු කිරීමට සලකා බලන්න' },
        smartSmsImport: { title: 'Smart SMS ආනයනය', subtitle: 'බැංකු ගනුදෙණු ආනයනය කරන්න' },
        aiChatbot: { title: 'AI කතාබොට්', subtitle: 'පුද්ගලික මූල්‍ය උපදෙස් ලබා ගන්න' },
        statistics: { title: 'සංඛ්‍යා ලේඛන', subtitle: 'වියදම් විශ්ලේෂණය බලන්න' },
        budgets: { title: 'බජට්', subtitle: 'වියදම් සීමා සැලසුම් කර නිරීක්ෂණය කරන්න' },

        sms: {
          title: 'SMS ආනයනය', inst1: 'ඇන්ඩ්‍රොයිඩ් එකේ ඉල්ලූ විට SMS අවසරය දෙන්න.',
          inst2: 'බැංකු පණිවිඩ ස්වයංක්‍රියව කියවා ගනුදෙනු එක් කරමු.',
          inst3: 'හෝ පහළෙහි SMS එකක් ඇලවලා අතින් ආනයනය කරන්න.',
          placeholder: 'බැංකු SMS එක මෙහි ඇලවන්න…', import: 'ආනයනය',
          imported_one: 'SMS එකෙන්ගනුදෙනු1ක්ආනයනයවිය',
          imported_other: 'SMS වලින් ගනුදෙනු {{count}}ක් ආනයනය විය',
          enterText: 'කරුණාකර SMS පාඨය ඇතුල් කරන්න.', parseFail: 'SMS පාඨය විග්‍රහ කළ නොහැකි විය.',
        },
      },

      tx: {
        title: 'ගනුදෙනු',
        tabs: { daily: 'දිනපතා', monthly: 'මාසික', summary: 'සාරාංශ' },
        headers: { income: 'ආදායම', expense: 'වියදම', total: 'මුලු එකතුව' },
        placeholders: { search: 'ගනුදෙනු සොයන්න…' },
        actions: { add: 'එක් කරන්න', update: 'යාවත්කාලීන' },
        labels: { cash: 'මුදල්', bank: 'බෑංකු', sms: 'SMS' },
        inline: { income: 'ආදායම', expense: 'වියදම', total: 'මුළු එකතුව' },
        empty: { title: 'මෙම මාසයට ගනුදෙනු නොමැත', subtitle: 'පහළ + බොත්තමෙන් එකක් එක් කරන්න' },
        deleteConfirm: 'මෙම ගනුදෙනුව මකා දැමීමට ඔබට විශ්වාසද?',
        guard: { title: 'අවසන් කිරීම අසාර්ථකයි', msg: 'මෙම ක්‍රියාව මඟින් මාසික ශේෂය අඩු වෙයි.\nමෙම මාසයේ ඉතිරි: Rs. {{amount}}' },
        msg: { added: 'ගනුදෙනුව සාර්ථක ලෙස එකතු විය', updated: 'ගනුදෙනුව යාවත්කාලීන විය', fetchFail: 'ගනුදෙනු ලබා ගැනීම අසාර්ථක විය', noUser: 'පරිශීලක සැසිය නොපවතියි' },
        details: { title: 'ගනුදෙනු විස්තර', category: 'වර්ගය', amount: 'මුදල', type: 'වාර්ගිකය', paymentMethod: 'ගෙවීමේ ක්‍රමය', date: 'දිනය', note: 'සටහන', remaining: 'මෙම මාසයේ ඉතිරි' },
      },

      charts: { spendingByCategory: 'ප්‍රවර්ග අනුව වියදම්', totalSpent: 'ගෙවූ මුදල: {{amount}}' },

      categories: {
        food: 'ආහාර', shopping: 'සාප්පු සවාරි', bills: 'බිල්පත්', transport: 'ගමනාගමනය',
        income: 'ආදායම', interest: 'පොලී', refund: 'ආපසු මුදල්', qr: 'QR ගෙවීම',
        atm: 'ATM නැගීම', cashAdvance: 'මුදල් කඩඉම්', other: 'අනිත්',
      },

      language: {
        title: 'භාෂාව', subtitle: 'යෙදුමේ භාෂාව තෝරන්න', system: 'පද්ධති භාෂාව: {{lang}}',
        english: 'English', sinhala: 'සිංහල (Sinhala)', tamil: 'Tamil (தமிழ்)', done: 'අවසන්',
      },

      chat: {
        title: 'මූල්‍ය සහායකයා',
        subtitle: 'ප්‍රවීණ ලෙස සැලසුම් කර සුරකින්න',
        newChat: 'නව සංවාදය',
        placeholder: 'ඕනෑම දෙයක් අසන්න…',
        intro:
          'ආයුබෝවන්! මම ඔබේ SmartSpend මූල්‍ය සහායකයා. වැඩි ලෙස ඉතිරි කර බුද්ධිමතාකාරී ලෙස ආයෝජනය කිරීමට ඔබට සහාය වෙමි. ඔබගේ අයවැයට ගැළපෙන සරල, ක්‍රියාත්මක පියවරන් සමඟ ඉතිරි කිරීමේ ඉලක්ක සකසන්නෙමි.',
        q1: 'මගේ මාසික ඉතිරි කිරීමේ ඉලක්කය කොපමණ විය යුතුද?',
        q2: 'මේ මාසයේ අමතර මුදල් ආයෝජනය කරන්නේ කෙසේද?',
        q3: 'වියදම් අඩු කිරීමට සමාර්ථ 3 ක් මොනවාද?',
        planHighlights: 'සැලසුමේ විශේෂාංග',
        monthlySaveTarget: 'මාසික ඉතිරි කිරීමේ ඉලක්කය',
        emergencyBuffer: 'හදිසි අරමුදල',
        stepLabel: 'පියවර',
      },
            budgets: {
        title: 'බජට්',
        searchPlaceholder: 'ප්‍රවර්ග සොයන්න…',
        viewSmartPlan: 'Smart සැලැස්ම බලන්න',
        leftToAssign: 'පවරන්න ඉතිරි: Rs. {{amount}}',
        limit: 'සීමාව',
        remaining: 'ඉතිරි',
        edit: 'සංස්කරණය',
        remove: 'ඉවත් කරන්න',
        groups: {
          essentials: 'අත්‍යවශ්‍ය (නිවාස/ආහාර/සම්භන්ධ)',
          wants: 'අභිරුචි',
          savings: 'ඉතිරි / ආයෝජන',
        },
      },

    },
  },

  /* =============================== TAMIL =============================== */
  ta: {
    translation: {
      nav: { home: 'முகப்பு', transactions: 'பரிவர்த்தனைகள்', accounts: 'கணக்குகள்', more: 'மேலும்' },

      common: {
        back: 'பின் செல்', import: 'இறக்குமதி', cancel: 'ரத்து', delete: 'அழி', edit: 'திருத்து',
        search: 'தேடு…', success: 'வெற்றி', error: 'பிழை', close: 'மூடு', ok: 'சரி',
      },

      menu: {
        passcode: 'கடவுக்குறியீடு', mainCurrency: 'முதன்மை நாணய அமைப்பு', subCurrency: 'துணை நாணய அமைப்பு',
        alarm: 'எச்சரிக்கை அமைப்பு', style: 'அலங்காரம்', language: 'மொழி அமைப்பு', logout: 'வெளியேறு',
      },

      actions: { addIncome: '+ வருமானம் சேர்', addExpense: '+ செலவு சேர்', save: 'சேமிக்க' },

      home: {
        totalBalance: 'மொத்த இருப்பு', totalExpense: 'மொத்த செலவு', goalAmount: 'இலக்கு',
        expenseShare: 'உங்கள் செலவுகளின் {{percent}}%,',
        status: { good: 'நன்றாக உள்ளது', monitor: 'கவனமாக இருக்கவும்', reduce: 'குறைக்க பரிசீலிக்கவும்' },
        smartSmsImport: { title: 'ஸ்மார்ட் SMS இறக்குமதி', subtitle: 'வங்கி பரிவர்த்தனைகளை இறக்குமதி செய்யுங்கள்' },
        aiChatbot: { title: 'AI சாட்பாட்', subtitle: 'தனிப்பயன் நிதி ஆலோசனை பெறுங்கள்' },
        statistics: { title: 'புள்ளிவிபரம்', subtitle: 'செலவு பகுப்பாய்வை காணவும்' },
        budgets: { title: 'பட்ஜெட்கள்', subtitle: 'செலவு வரம்புகளை திட்டமிடவும் கண்காணிக்கவும்' },

        sms: {
          title: 'SMS இறக்குமதி', inst1: 'Android இல் கேட்கும் போது SMS அனுமதியை வழங்கவும்.',
          inst2: 'வங்கி செய்திகள் தானாகப் படித்து பரிவர்த்தனைகளைச் சேர்ப்போம்.',
          inst3: 'அல்லது கீழே ஒரு SMS ஐ ஒட்டி கையால் இறக்குமதி செய்யவும்.',
          placeholder: 'ஒரு வங்கி SMS ஐ இங்கே ஒட்டவும்…', import: 'இறக்குமதி',
          imported_one: 'SMS இலிருந்து 1 பரிவர்த்தனை இறக்குமதி செய்யப்பட்டது',
          imported_other: 'SMS இலிருந்து {{count}} பரிவர்த்தனைகள் இறக்குமதி செய்யப்பட்டன',
          enterText: 'தயவுசெய்து SMS உரையை உள்ளிடவும்.', parseFail: 'SMS உரையை பகுப்பாய்வு செய்ய முடியவில்லை.',
        },
      },

      tx: {
        title: 'பரிவர்த்தனைகள்',
        tabs: { daily: 'நாளாந்த', monthly: 'மாதாந்த', summary: 'சுருக்கம்' },
        headers: { income: 'வருமானம்', expense: 'செலவு', total: 'மொத்தம்' },
        placeholders: { search: 'பரிவர்த்தனைகளைத் தேடு…' },
        actions: { add: 'சேர்', update: 'புதுப்பிப்பு' },
        labels: { cash: 'பணம்', bank: 'வங்கி', sms: 'SMS' },
        inline: { income: 'வருமானம்', expense: 'செலவு', total: 'மொத்தம்' },
        empty: { title: 'இந்த மாதத்திற்கு பரிவர்த்தனைகள் இல்லை', subtitle: 'கீழே உள்ள + பொத்தானை பயன்படுத்தி ஒன்றைச் சேர்க்கவும்' },
        deleteConfirm: 'இந்த பரிவர்த்தனையை நீக்கவா?',
        guard: { title: 'அனுமதி இல்லை', msg: 'இது இந்த மாதத் தொகையை எதிர்மறை ஆக்கும்.\nஇந்த மாதம் மீதமுள்ளது: Rs. {{amount}}' },
        msg: { added: 'பரிவர்த்தனை வெற்றிகரமாக சேர்க்கப்பட்டது', updated: 'பரிவர்த்தனை புதுப்பிக்கப்பட்டது', fetchFail: 'பரிவர்த்தனைகளை பெற முடியவில்லை', noUser: 'பயனர் அமர்வு இல்லை' },
        details: { title: 'பரிவர்த்தனை விவரங்கள்', category: 'வகை', amount: 'தொகை', type: 'வகை', paymentMethod: 'கட்டண முறை', date: 'தேதி', note: 'குறிப்பு', remaining: 'இந்த மாதம் மீதமுள்ளது' },
      },

      charts: { spendingByCategory: 'வகைப் படி செலவுகள்', totalSpent: 'மொத்த செலவு: {{amount}}' },

      categories: {
        food: 'உணவு', shopping: 'ஷாப்பிங்', bills: 'பில்கள்', transport: 'போக்குவரத்து',
        income: 'வருமானம்', interest: 'வட்டி', refund: 'பணம் திரும்ப', qr: 'QR கட்டணம்',
        atm: 'ATM பணம் எடுப்பு', cashAdvance: 'பண முன்பணம்', other: 'மற்றவை',
      },

      language: {
        title: 'மொழி', subtitle: 'பயன்பாட்டு மொழியைத் தேர்வு செய்யவும்', system: 'கணினி மொழி: {{lang}}',
        english: 'English', sinhala: 'Sinhala (සිංහල)', tamil: 'Tamil (தமிழ்)', done: 'முடிந்தது',
      },

      chat: {
        title: 'நிதி உதவியாளர்',
        subtitle: 'திட்டமிடு, சேமி, புத்திசாலியாக செலவு செய்',
        newChat: 'புதிய உரையாடல்',
        placeholder: 'ஏதாவது கேளுங்கள்…',
        intro:
          'வணக்கம்! நான் உங்கள் SmartSpend நிதி உதவியாளர். மேலும் சேமித்து அறிவுடன் முதலீடு செய்ய உங்கள் திட்டத்தை தனிப்பயனாக்க உதவுகிறேன். தெளிவான, செயல்படுத்தக்கூடிய படிகளுடன் புத்திசாலி இலக்குகளை அமைக்கிறேன்.',
        q1: 'என் மாத சேமிப்பு இலக்கு எவ்வளவு இருக்க வேண்டும்?',
        q2: 'இந்த மாதத்தில் என் உபரி பணத்தை எப்படி முதலீடு செய்வது?',
        q3: 'செலவை குறைக்க 3 சாணக்கியமான வழிகள் என்ன?',
        planHighlights: 'திட்டத்தின் முக்கிய அம்சங்கள்',
        monthlySaveTarget: 'மாத சேமிப்பு இலக்கு',
        emergencyBuffer: 'அவசர நிதி',
        stepLabel: 'படி',
      },
            budgets: {
        title: 'பட்ஜெட்கள்',
        searchPlaceholder: 'வகைகளைத் தேடு…',
        viewSmartPlan: 'ஸ்மார்ட் திட்டத்தை காண்க',
        leftToAssign: 'ஒதுக்க எஞ்சியது: Rs. {{amount}}',
        limit: 'வரம்பு',
        remaining: 'மீதம்',
        edit: 'திருத்து',
        remove: 'அகற்று',
        groups: {
          essentials: 'அத்தியாவசியங்கள்',
          wants: 'விருப்பங்கள்',
          savings: 'சேமிப்பு / முதலீடு',
        },
      },

    },
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'si', 'ta'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    compatibilityJSON: 'v3',
  });

export default i18n;
