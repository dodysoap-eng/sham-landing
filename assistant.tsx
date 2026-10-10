import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader, AppScreen, Button, Notice, Pill } from "@/components/sham-ui";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useShamWorkspace } from "@/lib/sham-workspace-context";
import { calculateFormula } from "@/lib/sham-domain";
import { confirmAction } from "@/lib/ui-notify";
import { useI18n } from "@/lib/i18n";

type AssistantProvider = "builtin" | "arena";
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type ApiMessage = { role: "user" | "assistant"; content: string };
type PendingTurn = { messages: ApiMessage[]; formulaContext?: string; suggestIdeas: boolean };
const welcome: ChatMessage = { id: "hello", role: "assistant", content: "مرحبًا، أنا مساعد شم. أستطيع شرح أدوات الحاسبة، تنظيم ملاحظاتك، أو اقتراح أفكار للتجربة. أي فكرة سأعرضها كمقترح للمراجعة — لن أغيّر تركيبتك تلقائيًا.", createdAt: new Date().toISOString() };

export default function AssistantScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { workspace, syncStatus } = useShamWorkspace();
  const mutation = trpc.assistant.reply.useMutation();
  const arenaStatus = trpc.assistant.status.useQuery();
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [includeContext, setIncludeContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [provider, setProvider] = useState<AssistantProvider>("builtin");
  const historyRef = useRef<ApiMessage[]>([]);
  const pendingRef = useRef<PendingTurn | null>(null);
  const scroller = useRef<ScrollView>(null);
  const storageKey = user?.openId ? `sham.chat.v1:${user.openId}` : "sham.chat.v1";

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!live || !raw) return;
      try {
        const saved = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(saved)) {
          const safe = saved.filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string").slice(-60);
          historyRef.current = safe.map(({ role, content }) => ({ role, content }));
          setMessages([welcome, ...safe]);
        }
      } catch { /* keep the welcome message if the local transcript is invalid */ }
    }).catch(() => undefined);
    return () => { live = false; };
  }, [storageKey]);

  const saveTranscript = useCallback(async (next: ChatMessage[]) => {
    const entries = next.filter((message) => message.id !== "hello").slice(-60);
    await AsyncStorage.setItem(storageKey, JSON.stringify(entries));
  }, [storageKey]);

  const runPending = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    setBusy(true);
    setError("");
    setCanRetry(false);
    try {
      const response = await mutation.mutateAsync({
        messages: pending.messages.slice(-20),
        includeFormulaContext: Boolean(pending.formulaContext),
        formulaContext: pending.formulaContext,
        suggestIdeas: pending.suggestIdeas,
        provider,
      });
      const nextHistory = [...pending.messages, { role: "assistant" as const, content: response.answer }];
      historyRef.current = nextHistory;
      const transcript = [welcome, ...nextHistory.map((message, index) => ({ id: `message-${index}-${message.role}`, role: message.role, content: message.content, createdAt: new Date().toISOString() }))];
      setMessages(transcript);
      await saveTranscript(transcript);
      pendingRef.current = null;
      setCanRetry(false);
      requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر الوصول إلى المساعد. بقيت رسالتك محفوظة للمحاولة مرة أخرى.");
      setCanRetry(true);
    } finally {
      setBusy(false);
    }
  }, [mutation, provider, saveTranscript]);

  const send = useCallback(async (text: string, suggestIdeas = false) => {
    const content = text.trim();
    if (!content || busy) return;
    const nextHistory = [...historyRef.current, { role: "user" as const, content }].slice(-20);
    historyRef.current = nextHistory;
    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: "user", content, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage].slice(-61);
    setMessages(nextMessages);
    setInput("");
    setError("");
    const latest = workspace.formulas[0];
    const formulaContext = includeContext && latest ? (() => {
      const calc = calculateFormula(latest);
      return `اسم التركيبة: ${latest.title}\nفئة المنتج: ${latest.productCategory}\nالتركيز المدخل: ${latest.concentrationPercent}%\nحجم الدفعة: ${latest.targetBatchGrams} g\nالمكونات: ${calc.rows.map((row) => `${row.name}: ${row.amount} ${latest.inputMode === "parts" ? "جزء" : "%"}${row.cas ? `, CAS ${row.cas}` : ""}`).join("؛ ")}\nملاحظات المستخدم: ${latest.notes || "لا توجد"}`;
    })() : undefined;
    pendingRef.current = { messages: nextHistory, formulaContext, suggestIdeas };
    void saveTranscript(nextMessages);
    await runPending();
  }, [busy, messages, workspace.formulas, includeContext, saveTranscript, runPending]);

  const clearChat = async () => {
    const accepted = await confirmAction("مسح المحادثة؟", "سيُحذف سجل المساعد المحلي من هذا الجهاز لهذا الحساب.");
    if (!accepted) return;
    historyRef.current = [];
    pendingRef.current = null;
    setMessages([welcome]);
    setError("");
    setCanRetry(false);
    await AsyncStorage.removeItem(storageKey);
  };

  const latestFormula = workspace.formulas[0];
  const quickPrompts = ["كيف أوازن الطبقات العطرية؟", "اشرح لي حساب تركيز الدفعة.", "ما الذي أراجعه قبل تجربة تركيبة؟"];
  return (
    <AppScreen scroll={false} contentStyle={{ gap: 10, paddingBottom: 10 }}>
      <AppHeader title={t("assistant.title")} subtitle={t("assistant.subtitle")} syncStatus={syncStatus} />
      <View style={styles.providerRow}><Text style={styles.providerLabel}>محرك الذكاء الاصطناعي</Text><View style={styles.providerButtons}><Pressable onPress={() => setProvider("builtin")} style={[styles.providerButton, provider === "builtin" && styles.providerActive]}><Text style={provider === "builtin" ? styles.providerActiveText : styles.providerText}>شم AI</Text></Pressable><Pressable disabled={!arenaStatus.data?.arenaConfigured} onPress={() => setProvider("arena")} style={[styles.providerButton, provider === "arena" && styles.providerActive, !arenaStatus.data?.arenaConfigured && styles.providerDisabled]}><Text style={provider === "arena" ? styles.providerActiveText : styles.providerText}>Arena AI {!arenaStatus.data?.arenaConfigured ? "(غير مفعّل)" : ""}</Text></Pressable></View></View>
      <View style={styles.chatIntro}><View style={styles.botIcon}><Ionicons name="sparkles" size={20} color={Brand.colors.copper} /></View><View style={{ flex: 1 }}><Text style={styles.introTitle}>{t("assistant.name")}</Text><Text style={styles.introText}>يساعدك في العمل؛ لا يعتمد سلامة ولا يغيّر بياناتك.</Text></View><Pressable accessibilityLabel={t("assistant.clear")} onPress={() => void clearChat()} style={styles.clearButton}><Ionicons name="trash-outline" size={17} color={Brand.colors.muted} /></Pressable></View>
      <View style={styles.consent}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeContext }} onPress={() => setIncludeContext((value) => !value)} style={[styles.checkbox, includeContext && styles.checked]}>{includeContext ? <Ionicons name="checkmark" size={13} color={Brand.colors.paper} /> : null}</Pressable><View style={{ flex: 1 }}><Text style={styles.consentTitle}>{t("assistant.include")}</Text><Text style={styles.consentText}>{includeContext && latestFormula ? `ستُشارك «${latestFormula.title}» مع المساعد لهذه الرسالة.` : "اختياري؛ لن يُرسل أي سياق للتركيبة دون تفعيل هذا الخيار."}</Text></View><Pill label={t("assistant.optional")} /></View>
      <ScrollView ref={scroller} style={styles.transcript} contentContainerStyle={styles.transcriptContent} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
        {messages.map((message) => <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}><Text style={[styles.bubbleText, message.role === "user" && styles.userText]}>{message.content}</Text><Text style={[styles.time, message.role === "user" && styles.userTime]}>{message.role === "assistant" ? "مساعد شم" : "أنت"}</Text></View>)}
        {busy ? <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}><ActivityIndicator size="small" color={Brand.colors.forest} /><Text style={styles.loadingText}>يفكّر في سؤالك…</Text></View> : null}
      </ScrollView>
      {error ? <Notice title="لم يكتمل الرد" body={error} tone="danger" /> : null}
      {canRetry ? <Button label={t("assistant.retry")} onPress={() => void runPending()} variant="secondary" icon="refresh" /> : null}
      <View style={styles.quickRow}>
        {quickPrompts.map((prompt) => <Pressable key={prompt} onPress={() => void send(prompt)} disabled={busy} style={styles.quickPrompt}><Text style={styles.quickPromptText}>{prompt}</Text></Pressable>)}
        <Pressable onPress={() => void send("اقترح ثلاث أفكار عملية لتطوير طريقة عملي في تركيب العطور. اكتبها كمقترحات قصيرة أراجعها بنفسي.", true)} disabled={busy} style={[styles.quickPrompt, styles.ideaPrompt]}><Ionicons name="bulb-outline" size={14} color={Brand.colors.copper} /><Text style={styles.ideaPromptText}>اقترح أفكارًا جديدة</Text></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}>
        <View style={styles.composer}><TextInput value={input} onChangeText={setInput} editable={!busy} maxLength={1000} placeholder={t("assistant.placeholder")} placeholderTextColor={Brand.colors.muted} style={styles.input} multiline textAlign="right" onSubmitEditing={() => void send(input)} returnKeyType="send" /><Pressable onPress={() => void send(input)} disabled={busy || !input.trim()} style={[styles.sendButton, (busy || !input.trim()) && styles.sendDisabled]}><Ionicons name="arrow-up" size={19} color={Brand.colors.paper} /></Pressable></View>
      </KeyboardAvoidingView>
      <Text style={styles.disclaimer}>المخرجات اقتراحات للمراجعة. كتالوج 2016 وبيانات IFRA المحدودة لا يثبتان سلامة المنتج أو وضعه القانوني.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  providerRow: { gap: 7, padding: 10, backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, borderRadius: 15 },
  providerLabel: { color: Brand.colors.muted, textAlign: "right", fontSize: 10, fontWeight: "700" },
  providerButtons: { flexDirection: "row-reverse", gap: 7 },
  providerButton: { flex: 1, alignItems: "center", borderRadius: 10, paddingVertical: 8, backgroundColor: "#EEEDE7" },
  providerActive: { backgroundColor: Brand.colors.forest },
  providerDisabled: { opacity: 0.45 },
  providerText: { color: Brand.colors.muted, fontSize: 10, fontWeight: "700" },
  providerActiveText: { color: Brand.colors.paper, fontSize: 10, fontWeight: "800" },
  chatIntro: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  botIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: Brand.colors.forestDeep, alignItems: "center", justifyContent: "center" },
  introTitle: { color: Brand.colors.ink, textAlign: "right", fontSize: 15, fontWeight: "900" },
  introText: { color: Brand.colors.muted, textAlign: "right", fontSize: 10, lineHeight: 15, marginTop: 2 },
  clearButton: { width: 35, height: 35, borderRadius: 12, backgroundColor: Brand.colors.paper, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Brand.colors.line },
  consent: { flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 11, backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, borderRadius: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.4, borderColor: Brand.colors.muted, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: Brand.colors.forest, borderColor: Brand.colors.forest },
  consentTitle: { color: Brand.colors.ink, textAlign: "right", fontSize: 10, fontWeight: "800" },
  consentText: { color: Brand.colors.muted, textAlign: "right", fontSize: 9, lineHeight: 13, marginTop: 3 },
  transcript: { flex: 1, minHeight: 160 },
  transcriptContent: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  bubble: { maxWidth: "88%", borderRadius: 17, paddingHorizontal: 13, paddingVertical: 11, gap: 6 },
  userBubble: { alignSelf: "flex-start", backgroundColor: Brand.colors.forest, borderBottomLeftRadius: 5 },
  assistantBubble: { alignSelf: "flex-end", backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, borderBottomRightRadius: 5 },
  bubbleText: { color: Brand.colors.ink, fontSize: 12, lineHeight: 19, textAlign: "right" },
  userText: { color: Brand.colors.paper },
  time: { color: Brand.colors.muted, textAlign: "right", fontSize: 8 },
  userTime: { color: "#D5E6DE" },
  loadingBubble: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  loadingText: { color: Brand.colors.muted, fontSize: 11 },
  quickRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  quickPrompt: { backgroundColor: "#EBEEE7", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 7 },
  quickPromptText: { color: Brand.colors.forest, fontSize: 9, fontWeight: "700" },
  ideaPrompt: { flexDirection: "row-reverse", alignItems: "center", gap: 5, backgroundColor: Brand.colors.copperPale },
  ideaPromptText: { color: Brand.colors.warningInk, fontSize: 9, fontWeight: "800" },
  composer: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8, backgroundColor: Brand.colors.paper, borderColor: Brand.colors.line, borderWidth: 1, borderRadius: 18, padding: 7 },
  input: { flex: 1, minHeight: 40, maxHeight: 96, color: Brand.colors.ink, fontSize: 12, paddingHorizontal: 8, paddingVertical: 9, writingDirection: "rtl" },
  sendButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: Brand.colors.forest, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.45 },
  disclaimer: { color: Brand.colors.muted, textAlign: "center", fontSize: 8, lineHeight: 13 },
});
