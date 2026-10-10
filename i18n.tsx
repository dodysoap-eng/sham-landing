import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager, Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "ar" | "en" | "fr" | "es" | "de" | "tr" | "ur" | "fa" | "hi" | "id" | "pt" | "it" | "ru" | "zh" | "ja";
export type LanguageOption = { code: Locale; nativeName: string; englishName: string; rtl?: boolean };

export const LANGUAGES: LanguageOption[] = [
  { code: "ar", nativeName: "العربية", englishName: "Arabic", rtl: true },
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "fr", nativeName: "Français", englishName: "French" },
  { code: "es", nativeName: "Español", englishName: "Spanish" },
  { code: "de", nativeName: "Deutsch", englishName: "German" },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish" },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", rtl: true },
  { code: "fa", nativeName: "فارسی", englishName: "Persian", rtl: true },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese" },
  { code: "it", nativeName: "Italiano", englishName: "Italian" },
  { code: "ru", nativeName: "Русский", englishName: "Russian" },
  { code: "zh", nativeName: "简体中文", englishName: "Chinese" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" },
];

const translations: Partial<Record<Locale, Record<string, string>>> = {
  ar: {
    "brand.name": "شم", "brand.subtitle": "مختبر تركيبات العطر", "nav.today": "اليوم", "nav.calculator": "الحاسبة", "nav.library": "المكتبة", "nav.assistant": "المساعد", "nav.account": "الحساب",
    "sync.saving": "يحفظ", "sync.offline": "غير متصل", "sync.local": "محلي", "sync.loading": "يفتح", "sync.saved": "محفوظ",
    "account.language": "لغة التطبيق", "account.languageHint": "اختر لغة الواجهة. سيتم تطبيق اتجاه الكتابة تلقائيًا.", "account.chooseLanguage": "اختر اللغة", "account.restartHint": "قد تحتاج إلى إعادة فتح التطبيق لتطبيق اتجاه الكتابة بالكامل.",
    "login.eyebrow": "مساحة تركيبك، على طريقتك", "login.title": "ابدأ من قطرة،\nوابنِ تركيبتك بثقة.", "login.body": "احفظ صيغك وجلساتك، وابحث في المراجع، واستعن بمساعد ذكي — مع فصل واضح بين البيانات الموثقة والاقتراحات.", "login.panelTitle": "دخول آمن إلى مساحة العمل", "login.panelBody": "استخدم حساب Manus. لن نطلب كلمة مرورك داخل التطبيق.", "login.button": "المتابعة باستخدام Manus", "login.loading": "جارٍ فتح تسجيل الدخول…", "login.error": "تعذّر بدء الدخول", "login.secure": "تركيباتك محلية افتراضيًا، ويمكنك تفعيل مزامنة نسخة سحابية من صفحة الحساب. رمز الجلسة محفوظ بأمان على Android.", "login.footer": "مراجع تركيب العطور وأدوات تنظيمها", "login.why": "لماذا أحتاج إلى تسجيل الدخول؟",
    "home.eyebrow": "مختبرك اليوم", "home.welcome": "أهلًا، {name}", "home.copy": "رتّب أفكارك العطرية، ثم دع الحاسبة تضبط المقادير.", "home.private": "مساحة عمل خاصة", "home.heroTitle": "من الفكرة إلى\nتركيبة قابلة للتكرار.", "home.heroBody": "أنشئ صيغة، رتّب مكوّناتها، واحفظ خطوات التجربة للعودة إليها لاحقًا.", "home.newFormula": "ابدأ تركيبة جديدة", "home.formulas": "تركيباتك", "home.ingredients": "مكوّناتك", "home.sessions": "جلساتك", "home.saved": "محفوظة في حسابك", "home.inLibrary": "في مكتبتك الخاصة", "home.resume": "قابلة للاستئناف", "home.start": "ابدأ من هنا", "home.quickTools": "أدوات سريعة لمساحة عملك", "home.calculate": "احسب دفعة", "home.calculateDetail": "الأجزاء والتركيز والوزن", "home.search": "ابحث في المراجع", "home.searchDetail": "مكونات وتراكيب منشورة", "home.ask": "اسأل المساعد", "home.askDetail": "إجابة أو فكرة قابلة للمراجعة", "home.reference": "مرجع التركيب", "home.openLibrary": "افتح المكتبة", "home.referenceTitle": "بيانات مرجعية، لا وصفات سلامة", "home.safety": "شفافية السلامة أولًا",
    "assistant.title": "المساعد", "assistant.subtitle": "أفكار وإجابات، تحت مراجعتك", "assistant.name": "مساعد شم", "assistant.clear": "مسح المحادثة؟", "assistant.include": "ضمّن أحدث تركيبة محفوظة", "assistant.optional": "اختياري", "assistant.retry": "أعد المحاولة بنفس الرسالة", "assistant.loading": "يفكّر في سؤالك…", "assistant.placeholder": "اكتب سؤالك عن التركيب…", "assistant.you": "أنت", "assistant.disclaimer": "المخرجات اقتراحات للمراجعة. كتالوج 2016 وبيانات IFRA المحدودة لا يثبتان سلامة المنتج أو وضعه القانوني.",
  },
  en: { "brand.name": "Sham", "brand.subtitle": "Perfume formulation lab", "nav.today": "Today", "nav.calculator": "Calculator", "nav.library": "Library", "nav.assistant": "Assistant", "nav.account": "Account", "sync.saving": "Saving", "sync.offline": "Offline", "sync.local": "Local", "sync.loading": "Opening", "sync.saved": "Saved", "account.language": "App language", "account.languageHint": "Choose the interface language. Text direction is adjusted automatically.", "account.chooseLanguage": "Choose language", "account.restartHint": "You may need to reopen the app to fully apply text direction.", "login.eyebrow": "Your formulation space, your way", "login.title": "Start with a drop,\nbuild with confidence.", "login.body": "Save formulas and sessions, explore references, and get help from an AI assistant—with a clear line between verified data and suggestions.", "login.panelTitle": "Secure workspace access", "login.panelBody": "Use your Manus account. We never ask for your password inside the app.", "login.button": "Continue with Manus", "login.loading": "Opening sign in…", "login.error": "Could not start sign in", "login.secure": "Your formulas are local by default. You can enable cloud sync from Account. Your session token is securely stored on Android.", "login.footer": "Perfume formulation references and tools", "login.why": "Why do I need to sign in?", "home.eyebrow": "Your lab today", "home.welcome": "Hello, {name}", "home.copy": "Organize your fragrance ideas, then let the calculator handle the measurements.", "home.private": "Private workspace", "home.heroTitle": "From an idea to\na repeatable formula.", "home.heroBody": "Create a formula, arrange its ingredients, and save your experiment steps for later.", "home.newFormula": "Start a new formula", "home.formulas": "Your formulas", "home.ingredients": "Your ingredients", "home.sessions": "Your sessions", "home.saved": "Saved to your account", "home.inLibrary": "In your private library", "home.resume": "Ready to resume", "home.start": "Start here", "home.quickTools": "Quick tools for your workspace", "home.calculate": "Calculate a batch", "home.calculateDetail": "Parts, concentration and weight", "home.search": "Search references", "home.searchDetail": "Published ingredients and formulas", "home.ask": "Ask the assistant", "home.askDetail": "A reviewable answer or idea", "home.reference": "Formulation reference", "home.openLibrary": "Open library", "home.referenceTitle": "Reference data, not safety recipes", "home.safety": "Safety transparency first", "assistant.title": "Assistant", "assistant.subtitle": "Ideas and answers, for your review", "assistant.name": "Sham assistant", "assistant.clear": "Clear conversation?", "assistant.include": "Include latest saved formula", "assistant.optional": "Optional", "assistant.retry": "Retry the same message", "assistant.loading": "Thinking…", "assistant.placeholder": "Ask about formulation…", "assistant.you": "You", "assistant.disclaimer": "Outputs are suggestions for review. The 2016 catalog and limited IFRA data do not establish product safety or legal status." },
};

for (const locale of LANGUAGES.map((item) => item.code)) translations[locale] ??= {};
for (const locale of LANGUAGES.map((item) => item.code).filter((item) => item !== "ar" && item !== "en")) {
  const label = LANGUAGES.find((item) => item.code === locale)?.nativeName ?? locale;
  for (const [key, value] of Object.entries(translations.en ?? {})) translations[locale]![key] = value;
  translations[locale]!["account.language"] = label;
}

const STORAGE_KEY = "sham.locale.v1";
const rtlLocales = new Set(LANGUAGES.filter((item) => item.rtl).map((item) => item.code));
const detectLocale = (): Locale => {
  const raw = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase() : "en";
  const match = LANGUAGES.find((item) => raw.startsWith(item.code));
  return match?.code ?? "en";
};

type I18nContextValue = { locale: Locale; isRTL: boolean; language: LanguageOption; setLocale: (locale: Locale) => Promise<void>; t: (key: string, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale());
  const isRTL = rtlLocales.has(locale);
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((saved) => { if (saved && LANGUAGES.some((item) => item.code === saved)) setLocaleState(saved as Locale); }).catch(() => undefined); }, []);
  useEffect(() => { if (Platform.OS !== "web") { I18nManager.allowRTL(isRTL); I18nManager.forceRTL(isRTL); } }, [isRTL]);
  const setLocale = useCallback(async (next: Locale) => { setLocaleState(next); await AsyncStorage.setItem(STORAGE_KEY, next); if (Platform.OS !== "web") { I18nManager.allowRTL(rtlLocales.has(next)); I18nManager.forceRTL(rtlLocales.has(next)); } }, []);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => { let value = translations[locale]?.[key] ?? translations.en?.[key] ?? key; for (const [name, replacement] of Object.entries(vars ?? {})) value = value.replaceAll(`{${name}}`, String(replacement)); return value; }, [locale]);
  const value = useMemo(() => ({ locale, isRTL, language: LANGUAGES.find((item) => item.code === locale) ?? LANGUAGES[0], setLocale, t }), [locale, isRTL, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { const value = useContext(I18nContext); if (!value) throw new Error("useI18n must be used inside I18nProvider"); return value; }
