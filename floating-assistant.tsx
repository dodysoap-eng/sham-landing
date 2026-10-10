import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";
import { RichContent } from "@/components/rich-content";

type Message = { id: string; role: "user" | "assistant"; content: string };
type StoredChat = { savedAt: number; messages: Message[] };
const RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

export function FloatingAssistant() {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const mutation = trpc.assistant.reply.useMutation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const storageKey = user?.openId ? `sham.chat.v1:${user.openId}` : "sham.chat.v1";
  const welcome = useMemo<Message>(() => ({ id: "floating-welcome", role: "assistant", content: t("assistant.welcome") }), [t]);

  useEffect(() => {
    if (!user?.openId) return;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as StoredChat | Message[];
        const savedAt = Array.isArray(parsed) ? Date.now() : parsed.savedAt;
        if (!Number.isFinite(savedAt) || Date.now() - savedAt > RETENTION_MS) return;
        const stored = Array.isArray(parsed) ? parsed : parsed.messages;
        if (Array.isArray(stored)) setMessages(stored.filter((item) => item?.role && typeof item.content === "string").slice(-12));
      } catch {
        // A malformed local transcript is ignored; the widget starts clean.
      }
    }).catch(() => undefined);
  }, [storageKey, user?.openId]);

  const persist = async (next: Message[]) => {
    await AsyncStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), messages: next.slice(-60) } satisfies StoredChat));
  };

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    const next = [...messages, { id: `${Date.now()}-user`, role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await mutation.mutateAsync({
        messages: next.slice(-20).map(({ role, content: text }) => ({ role, content: text })),
        includeFormulaContext: false,
        suggestIdeas: false,
        provider: "manager",
        locale,
      });
      const complete = [...next, { id: `${Date.now()}-assistant`, role: "assistant" as const, content: response.answer }];
      setMessages(complete);
      await persist(complete);
    } catch (error) {
      const failure = error instanceof Error ? error.message : "تعذر الوصول إلى المدير الذكي.";
      const complete = [...next, { id: `${Date.now()}-error`, role: "assistant" as const, content: failure }];
      setMessages(complete);
      await persist(complete);
    } finally {
      setBusy(false);
    }
  };

  if (!user?.openId || pathname?.includes("/assistant")) return null;
  const visibleMessages = messages.length ? messages : [welcome];
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {open ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.titleBlock}><Text style={styles.title}>{t("assistant.name")}</Text><Text style={styles.subtitle}>{t("assistant.widgetSubtitle")}</Text></View>
            <Pressable accessibilityLabel={t("assistant.closeWidget")} onPress={() => setOpen(false)} style={styles.close}><Ionicons name="close" size={19} color={Brand.colors.ink} /></Pressable>
          </View>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messageContent} keyboardShouldPersistTaps="handled">
            {visibleMessages.map((message) => <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}><RichContent content={message.content} user={message.role === "user"} textStyle={styles.bubbleText} /></View>)}
            {busy ? <View style={[styles.bubble, styles.assistantBubble, styles.loading]}><ActivityIndicator size="small" color={Brand.colors.forest} /><Text style={styles.loadingText}>{t("assistant.loading")}</Text></View> : null}
          </ScrollView>
          <View style={styles.composer}><TextInput value={input} onChangeText={setInput} editable={!busy} placeholder={t("assistant.placeholder")} placeholderTextColor={Brand.colors.muted} style={styles.input} multiline submitBehavior="submit" textAlign="right" onKeyPress={(event) => { const keyEvent = event.nativeEvent as unknown as { key?: string; shiftKey?: boolean }; if (keyEvent.key === "Enter" && !keyEvent.shiftKey) { (event as unknown as { preventDefault?: () => void }).preventDefault?.(); void send(); } }} onSubmitEditing={() => void send()} /><Pressable accessibilityLabel={t("assistant.send")} onPress={() => void send()} disabled={busy || !input.trim()} style={[styles.send, (busy || !input.trim()) && styles.disabled]}><Ionicons name="arrow-up" size={17} color={Brand.colors.paper} /></Pressable></View>
          <Text style={styles.retention}>{t("assistant.retention")}</Text>
        </KeyboardAvoidingView>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={open ? t("assistant.closeWidget") : t("assistant.openWidget")} onPress={() => setOpen((value) => !value)} style={styles.fab}><Ionicons name={open ? "close" : "sparkles"} size={24} color={Brand.colors.paper} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", right: 18, bottom: 18, alignItems: "flex-end", zIndex: 1000 },
  fab: { width: 56, height: 56, borderRadius: 20, backgroundColor: Brand.colors.forest, alignItems: "center", justifyContent: "center", boxShadow: "0px 8px 22px rgba(20,37,29,0.25)" },
  panel: { width: 340, height: 500, maxWidth: "92%", maxHeight: "85%", marginBottom: 12, borderRadius: 22, overflow: "hidden", backgroundColor: Brand.colors.canvas, borderWidth: 1, borderColor: Brand.colors.line, boxShadow: "0px 12px 35px rgba(20,37,29,0.20)" },
  panelHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: Brand.colors.paper, borderBottomWidth: 1, borderBottomColor: Brand.colors.line },
  titleBlock: { flex: 1 },
  title: { color: Brand.colors.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  subtitle: { color: Brand.colors.muted, fontSize: 9, textAlign: "right", marginTop: 3 },
  close: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#F0EEE7" },
  messages: { flex: 1 },
  messageContent: { gap: 8, padding: 12 },
  bubble: { maxWidth: "88%", borderRadius: 15, paddingHorizontal: 11, paddingVertical: 9 },
  userBubble: { alignSelf: "flex-start", backgroundColor: Brand.colors.forest, borderBottomLeftRadius: 4 },
  assistantBubble: { alignSelf: "flex-end", backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, borderBottomRightRadius: 4 },
  bubbleText: { color: Brand.colors.ink, fontSize: 11, lineHeight: 17, textAlign: "right" },
  userText: { color: Brand.colors.paper },
  loading: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  loadingText: { color: Brand.colors.muted, fontSize: 10 },
  composer: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 6, margin: 9, padding: 6, borderRadius: 15, backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line },
  input: { flex: 1, minHeight: 37, maxHeight: 80, color: Brand.colors.ink, fontSize: 11, paddingHorizontal: 7, paddingVertical: 8, writingDirection: "rtl" },
  send: { width: 34, height: 34, borderRadius: 11, backgroundColor: Brand.colors.forest, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  retention: { color: Brand.colors.muted, fontSize: 8, lineHeight: 12, textAlign: "center", paddingHorizontal: 10, paddingBottom: 9 },
});
