'use client'

import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'hi' | 'bn';

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard', history: 'History', addTransaction: 'Add Transaction', budgets: 'Budgets',
    insights: 'Insights', reports: 'Reports', settings: 'Settings', totalBalance: 'Total Balance',
    thisMonth: 'This Month', income: 'Income', expense: 'Expense', quickActions: 'Quick Actions',
    voice: 'Voice', scan: 'Scan', manual: 'Manual', import: 'Import',
    pendingConfirmation: 'transactions pending confirmation', weeklyActivity: 'Weekly Activity',
    recentTransactions: 'Recent Transactions', viewAll: 'View All', noTransactions: 'No transactions yet',
    startTracking: 'Start tracking your finances', text: 'Text', parseWithAI: 'Parse with AI',
    typeHere: 'Type something like: Spent 500 on lunch at cafe', listening: 'Listening...',
    tapToSpeak: 'Tap to speak', uploadReceipt: 'Upload Receipt or Statement',
    dragDrop: 'Drag & drop or click to upload', supportedFormats: 'JPG, PNG, WebP, HEIC, PDF (max 10MB)',
    analyzing: 'Analyzing document...', amount: 'Amount', type: 'Type', category: 'Category',
    description: 'Description', date: 'Date', save: 'Save', confirm: 'Confirm', edit: 'Edit',
    discard: 'Discard', confirmAll: 'Confirm All', lowConfidence: 'Low confidence. Please review.',
    confidence: 'Confidence', all: 'All', confirmed: 'Confirmed', draft: 'Draft', search: 'Search',
    fromDate: 'From Date', toDate: 'To Date', selected: 'selected', printSelected: 'Print Selected',
    deleteSelected: 'Delete Selected', printAll: 'Print All', noResults: 'No transactions found',
    transactionDetails: 'Transaction Details', source: 'Source', status: 'Status', delete: 'Delete',
    print: 'Print', deleteConfirmTitle: 'Delete Transaction',
    deleteConfirmMessage: 'Are you sure? This cannot be undone.', cancel: 'Cancel',
    createBudget: 'Create Budget', budgetAmount: 'Budget Amount', period: 'Period', weekly: 'Weekly',
    monthly: 'Monthly', create: 'Create', spent: 'Spent', remaining: 'Remaining', used: 'used',
    noBudgets: 'No budgets yet', createFirst: 'Create a budget to track spending',
    budgetExists: 'Budget already exists', generateInsights: 'Generate Insights',
    analyzingFinances: 'Analyzing your finances...', lastGenerated: 'Last generated',
    insightsRemaining: 'insights remaining', resetsIn: 'resets in', noInsightsYet: 'No insights yet',
    clickGenerate: 'Click to get AI-powered insights', needMoreData: 'Need more transaction data',
    monthlyReports: 'Monthly Reports', viewDetails: 'View Details', totalIncome: 'Total Income',
    totalExpense: 'Total Expense', netSavings: 'Net Savings', categoryBreakdown: 'Category Breakdown',
    comparedToLast: 'Compared to last month', moreSpent: 'more spent', lessSpent: 'less spent',
    generateSummary: 'Generate AI Summary', noReports: 'No reports yet',
    addTransactionsFirst: 'Add transactions to see reports', profile: 'Profile', name: 'Name',
    email: 'Email', language: 'Language', english: 'English', hindi: 'Hindi', bengali: 'Bengali',
    notifications: 'Notifications', budgetAlerts: 'Budget Alerts', monthlyReportsNotif: 'Monthly Reports',
    backup: 'Backup', exportData: 'Export Data', restore: 'Restore', importData: 'Import Data',
    dangerZone: 'Danger Zone', deleteAllData: 'Delete All Data',
    deleteAllConfirm: 'This will delete all data. Cannot be undone.', about: 'About',
    privacyPolicy: 'Privacy Policy', termsOfService: 'Terms of Service', support: 'Support',
    version: 'Version', loading: 'Loading...', error: 'Error', success: 'Success', close: 'Close',
    back: 'Back', next: 'Next', previous: 'Previous', today: 'Today', yesterday: 'Yesterday',
    transactionSaved: 'Transaction saved', transactionDeleted: 'Transaction deleted',
    transactionConfirmed: 'Transaction confirmed', budgetCreated: 'Budget created',
    budgetDeleted: 'Budget deleted', dataExported: 'Data exported', dataImported: 'Data imported',
    dataDeleted: 'All data deleted', insightsGenerated: 'Insights generated',
    errorOccurred: 'An error occurred', logout: 'Logout', add: 'Add',
    incomeThisMonth: 'Income this month', expenseThisMonth: 'Expense this month',
    savingsRate: 'Savings Rate',
  },
  hi: {
    dashboard: 'डैशबोर्ड', history: 'इतिहास', addTransaction: 'लेनदेन जोड़ें', budgets: 'बजट',
    insights: 'अंतर्दृष्टि', reports: 'रिपोर्ट', settings: 'सेटिंग्स', totalBalance: 'कुल शेष',
    thisMonth: 'इस महीने', income: 'आय', expense: 'व्यय', quickActions: 'त्वरित कार्य',
    voice: 'वॉयस', scan: 'स्कैन', manual: 'मैनुअल', import: 'आयात',
    pendingConfirmation: 'लेनदेन पुष्टि के लिए', weeklyActivity: 'साप्ताहिक गतिविधि',
    recentTransactions: 'हाल के लेनदेन', viewAll: 'सभी देखें', noTransactions: 'कोई लेनदेन नहीं',
    startTracking: 'अपने वित्त को ट्रैक करें', text: 'टेक्स्ट', parseWithAI: 'AI से पार्स करें',
    typeHere: 'टाइप करें: कैफे में 500 खर्च किए', listening: 'सुन रहा हूं...',
    tapToSpeak: 'बोलने के लिए टैप करें', uploadReceipt: 'रसीद अपलोड करें',
    dragDrop: 'ड्रैग या क्लिक करें', supportedFormats: 'JPG, PNG, PDF (10MB तक)',
    analyzing: 'विश्लेषण हो रहा है...', amount: 'राशि', type: 'प्रकार', category: 'श्रेणी',
    description: 'विवरण', date: 'तारीख', save: 'सहेजें', confirm: 'पुष्टि करें', edit: 'संपादित करें',
    discard: 'रद्द करें', confirmAll: 'सभी पुष्टि करें', lowConfidence: 'कम विश्वास।',
    confidence: 'विश्वास', all: 'सभी', confirmed: 'पुष्टि', draft: 'ड्राफ्ट', search: 'खोजें',
    fromDate: 'से तारीख', toDate: 'तक तारीख', selected: 'चयनित', printSelected: 'प्रिंट करें',
    deleteSelected: 'हटाएं', printAll: 'सभी प्रिंट', noResults: 'कोई लेनदेन नहीं',
    transactionDetails: 'लेनदेन विवरण', source: 'स्रोत', status: 'स्थिति', delete: 'हटाएं',
    print: 'प्रिंट', deleteConfirmTitle: 'लेनदेन हटाएं',
    deleteConfirmMessage: 'क्या आप निश्चित हैं?', cancel: 'रद्द करें',
    createBudget: 'बजट बनाएं', budgetAmount: 'बजट राशि', period: 'अवधि', weekly: 'साप्ताहिक',
    monthly: 'मासिक', create: 'बनाएं', spent: 'खर्च', remaining: 'शेष', used: 'उपयोग',
    noBudgets: 'कोई बजट नहीं', createFirst: 'बजट बनाएं',
    budgetExists: 'बजट पहले से है', generateInsights: 'अंतर्दृष्टि बनाएं',
    analyzingFinances: 'विश्लेषण हो रहा है...', lastGenerated: 'अंतिम',
    insightsRemaining: 'शेष', resetsIn: 'रीसेट', noInsightsYet: 'कोई अंतर्दृष्टि नहीं',
    clickGenerate: 'AI अंतर्दृष्टि के लिए क्लिक करें', needMoreData: 'अधिक डेटा चाहिए',
    monthlyReports: 'मासिक रिपोर्ट', viewDetails: 'विवरण देखें', totalIncome: 'कुल आय',
    totalExpense: 'कुल व्यय', netSavings: 'शुद्ध बचत', categoryBreakdown: 'श्रेणी विवरण',
    comparedToLast: 'पिछले महीने से', moreSpent: 'अधिक खर्च', lessSpent: 'कम खर्च',
    generateSummary: 'AI सारांश', noReports: 'कोई रिपोर्ट नहीं',
    addTransactionsFirst: 'रिपोर्ट के लिए लेनदेन जोड़ें', profile: 'प्रोफ़ाइल', name: 'नाम',
    email: 'ईमेल', language: 'भाषा', english: 'अंग्रेज़ी', hindi: 'हिंदी', bengali: 'बंगाली',
    notifications: 'सूचनाएं', budgetAlerts: 'बजट अलर्ट', monthlyReportsNotif: 'मासिक रिपोर्ट',
    backup: 'बैकअप', exportData: 'निर्यात करें', restore: 'पुनर्स्थापित', importData: 'आयात करें',
    dangerZone: 'खतरा क्षेत्र', deleteAllData: 'सब हटाएं',
    deleteAllConfirm: 'यह सब कुछ हटा देगा।', about: 'बारे में',
    privacyPolicy: 'गोपनीयता नीति', termsOfService: 'सेवा शर्तें', support: 'सहायता',
    version: 'संस्करण', loading: 'लोड हो रहा...', error: 'त्रुटि', success: 'सफल', close: 'बंद',
    back: 'वापस', next: 'अगला', previous: 'पिछला', today: 'आज', yesterday: 'कल',
    transactionSaved: 'लेनदेन सहेजा', transactionDeleted: 'लेनदेन हटाया',
    transactionConfirmed: 'लेनदेन पुष्टि', budgetCreated: 'बजट बनाया',
    budgetDeleted: 'बजट हटाया', dataExported: 'निर्यात हुआ', dataImported: 'आयात हुआ',
    dataDeleted: 'सब हटाया', insightsGenerated: 'अंतर्दृष्टि बनी',
    errorOccurred: 'त्रुटि हुई', logout: 'लॉगआउट', add: 'जोड़ें',
    incomeThisMonth: 'इस महीने की आय', expenseThisMonth: 'इस महीने का खर्च',
    savingsRate: 'बचत दर',
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড', history: 'ইতিহাস', addTransaction: 'লেনদেন যোগ', budgets: 'বাজেট',
    insights: 'অন্তর্দৃষ্টি', reports: 'রিপোর্ট', settings: 'সেটিংস', totalBalance: 'মোট ব্যালেন্স',
    thisMonth: 'এই মাস', income: 'আয়', expense: 'ব্যয়', quickActions: 'দ্রুত ক্রিয়া',
    voice: 'ভয়েস', scan: 'স্ক্যান', manual: 'ম্যানুয়াল', import: 'আমদানি',
    pendingConfirmation: 'লেনদেন মুলতুবি', weeklyActivity: 'সাপ্তাহিক কার্যকলাপ',
    recentTransactions: 'সাম্প্রতিক লেনদেন', viewAll: 'সব দেখুন', noTransactions: 'কোন লেনদেন নেই',
    startTracking: 'আর্থিক ট্র্যাক করুন', text: 'টেক্সট', parseWithAI: 'AI দিয়ে পার্স',
    typeHere: 'টাইপ করুন: ক্যাফেতে 500 খরচ', listening: 'শুনছি...',
    tapToSpeak: 'বলতে ট্যাপ করুন', uploadReceipt: 'রসিদ আপলোড',
    dragDrop: 'ড্র্যাগ বা ক্লিক করুন', supportedFormats: 'JPG, PNG, PDF (10MB)',
    analyzing: 'বিশ্লেষণ হচ্ছে...', amount: 'পরিমাণ', type: 'প্রকার', category: 'বিভাগ',
    description: 'বিবরণ', date: 'তারিখ', save: 'সংরক্ষণ', confirm: 'নিশ্চিত', edit: 'সম্পাদনা',
    discard: 'বাতিল', confirmAll: 'সব নিশ্চিত', lowConfidence: 'কম আস্থা।',
    confidence: 'আস্থা', all: 'সব', confirmed: 'নিশ্চিত', draft: 'খসড়া', search: 'অনুসন্ধান',
    fromDate: 'থেকে', toDate: 'পর্যন্ত', selected: 'নির্বাচিত', printSelected: 'প্রিন্ট',
    deleteSelected: 'মুছুন', printAll: 'সব প্রিন্ট', noResults: 'কোন লেনদেন নেই',
    transactionDetails: 'লেনদেন বিবরণ', source: 'উৎস', status: 'অবস্থা', delete: 'মুছুন',
    print: 'প্রিন্ট', deleteConfirmTitle: 'লেনদেন মুছুন',
    deleteConfirmMessage: 'আপনি কি নিশ্চিত?', cancel: 'বাতিল',
    createBudget: 'বাজেট তৈরি', budgetAmount: 'বাজেট পরিমাণ', period: 'সময়কাল', weekly: 'সাপ্তাহিক',
    monthly: 'মাসিক', create: 'তৈরি', spent: 'খরচ', remaining: 'অবশিষ্ট', used: 'ব্যবহৃত',
    noBudgets: 'কোন বাজেট নেই', createFirst: 'বাজেট তৈরি করুন',
    budgetExists: 'বাজেট আছে', generateInsights: 'অন্তর্দৃষ্টি তৈরি',
    analyzingFinances: 'বিশ্লেষণ হচ্ছে...', lastGenerated: 'শেষ',
    insightsRemaining: 'বাকি', resetsIn: 'রিসেট', noInsightsYet: 'কোন অন্তর্দৃষ্টি নেই',
    clickGenerate: 'AI অন্তর্দৃষ্টির জন্য ক্লিক', needMoreData: 'আরও ডেটা দরকার',
    monthlyReports: 'মাসিক রিপোর্ট', viewDetails: 'বিস্তারিত', totalIncome: 'মোট আয়',
    totalExpense: 'মোট ব্যয়', netSavings: 'নিট সঞ্চয়', categoryBreakdown: 'বিভাগ বিভাজন',
    comparedToLast: 'গত মাসের তুলনায়', moreSpent: 'বেশি খরচ', lessSpent: 'কম খরচ',
    generateSummary: 'AI সারাংশ', noReports: 'কোন রিপোর্ট নেই',
    addTransactionsFirst: 'রিপোর্টের জন্য লেনদেন যোগ করুন', profile: 'প্রোফাইল', name: 'নাম',
    email: 'ইমেল', language: 'ভাষা', english: 'ইংরেজি', hindi: 'হিন্দি', bengali: 'বাংলা',
    notifications: 'বিজ্ঞপ্তি', budgetAlerts: 'বাজেট সতর্কতা', monthlyReportsNotif: 'মাসিক রিপোর্ট',
    backup: 'ব্যাকআপ', exportData: 'রপ্তানি', restore: 'পুনরুদ্ধার', importData: 'আমদানি',
    dangerZone: 'বিপদ অঞ্চল', deleteAllData: 'সব মুছুন',
    deleteAllConfirm: 'এটি সব মুছে ফেলবে।', about: 'সম্পর্কে',
    privacyPolicy: 'গোপনীয়তা নীতি', termsOfService: 'সেবার শর্তাবলী', support: 'সহায়তা',
    version: 'সংস্করণ', loading: 'লোড হচ্ছে...', error: 'ত্রুটি', success: 'সফল', close: 'বন্ধ',
    back: 'পেছনে', next: 'পরবর্তী', previous: 'পূর্ববর্তী', today: 'আজ', yesterday: 'গতকাল',
    transactionSaved: 'লেনদেন সংরক্ষিত', transactionDeleted: 'লেনদেন মুছে ফেলা',
    transactionConfirmed: 'লেনদেন নিশ্চিত', budgetCreated: 'বাজেট তৈরি',
    budgetDeleted: 'বাজেট মুছে ফেলা', dataExported: 'রপ্তানি হয়েছে', dataImported: 'আমদানি হয়েছে',
    dataDeleted: 'সব মুছে ফেলা', insightsGenerated: 'অন্তর্দৃষ্টি তৈরি',
    errorOccurred: 'ত্রুটি ঘটেছে', logout: 'লগআউট', add: 'যোগ',
    incomeThisMonth: 'এই মাসের আয়', expenseThisMonth: 'এই মাসের খরচ',
    savingsRate: 'সঞ্চয় হার',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('finflow_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('finflow_language', lang);
  };

  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
