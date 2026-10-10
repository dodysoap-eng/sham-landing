import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Brand } from "@/constants/brand";
import type { SyncStatus } from "@/lib/sham-workspace-context";
import { useI18n } from "@/lib/i18n";

export function AppScreen({ children, scroll = true, contentStyle }: { children: ReactNode; scroll?: boolean; contentStyle?: ViewStyle }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </ScrollView>
      ) : <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>}
    </SafeAreaView>
  );
}

export function AppHeader({ title = "شم", subtitle, onProfile, syncStatus }: { title?: string; subtitle?: string; onProfile?: () => void; syncStatus?: SyncStatus }) {
  const { t } = useI18n();
  const label = syncStatus === "saving" ? t("sync.saving") : syncStatus === "offline" ? t("sync.offline") : syncStatus === "local" ? t("sync.local") : syncStatus === "loading" ? t("sync.loading") : t("sync.saved");
  const color = syncStatus === "offline" ? Brand.colors.warningInk : Brand.colors.muted;
  return (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logoMark} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>{title}</Text>
          <Text style={styles.headerSub}>{subtitle ?? t("brand.subtitle")}</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        {syncStatus ? <Text style={[styles.sync, { color }]}>{label}</Text> : null}
        {onProfile ? <Pressable accessibilityRole="button" accessibilityLabel={t("nav.account")} onPress={onProfile} style={styles.avatarButton}><Ionicons name="person-outline" size={18} color={Brand.colors.forest} /></Pressable> : null}
      </View>
    </View>
  );
}

export function SectionTitle({ title, detail, actionLabel, onAction }: { title: string; detail?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitleText}>{title}</Text>
        {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      {actionLabel && onAction ? <Pressable onPress={onAction}><Text style={styles.link}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ label, onPress, variant = "primary", icon, disabled, loading, style }: {
  label: string; onPress?: () => void; variant?: "primary" | "secondary" | "quiet" | "danger"; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const variantStyle = variant === "primary" ? styles.primaryButton : variant === "danger" ? styles.dangerButton : variant === "quiet" ? styles.quietButton : styles.secondaryButton;
  const textStyle = variant === "primary" || variant === "danger" ? styles.primaryButtonText : styles.secondaryButtonText;
  const disabledState = disabled || loading;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabledState} style={({ pressed }) => [styles.button, variantStyle, disabledState && styles.disabled, pressed && !disabledState && styles.pressed, style]}>
      {loading ? <ActivityIndicator color={variant === "primary" ? Brand.colors.paper : Brand.colors.forest} size="small" /> : icon ? <Ionicons name={icon} size={17} color={variant === "primary" || variant === "danger" ? Brand.colors.paper : Brand.colors.forest} /> : null}
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "green" | "gold" | "warning" | "danger" }) {
  const toneStyle = tone === "green" ? styles.pillGreen : tone === "gold" ? styles.pillGold : tone === "warning" ? styles.pillWarning : tone === "danger" ? styles.pillDanger : styles.pillNeutral;
  return <View style={[styles.pill, toneStyle]}><Text style={tone === "danger" ? styles.pillDangerText : tone === "warning" ? styles.pillWarningText : styles.pillText}>{label}</Text></View>;
}

export function TextField({ label, hint, containerStyle, multiline, ...props }: Omit<TextInputProps, "style"> & { label: string; hint?: string; containerStyle?: ViewStyle }) {
  return (
    <View style={containerStyle}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={Brand.colors.muted}
        selectionColor={Brand.colors.forest}
        textAlign="right"
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Notice({ title, body, tone = "warning", icon = "information-circle-outline" }: { title: string; body: string; tone?: "warning" | "info" | "danger"; icon?: keyof typeof Ionicons.glyphMap }) {
  const box = tone === "danger" ? styles.noticeDanger : tone === "info" ? styles.noticeInfo : styles.noticeWarning;
  const ink = tone === "danger" ? Brand.colors.danger : tone === "info" ? Brand.colors.blue : Brand.colors.warningInk;
  return (
    <View style={[styles.notice, box]}>
      <Ionicons name={icon} size={19} color={ink} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.noticeTitle, { color: ink }]}>{title}</Text>
        <Text style={[styles.noticeBody, { color: ink }]}>{body}</Text>
      </View>
    </View>
  );
}

export function EmptyState({ title, body, icon = "leaf-outline", actionLabel, onAction }: { title: string; body: string; icon?: keyof typeof Ionicons.glyphMap; actionLabel?: string; onAction?: () => void }) {
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={24} color={Brand.colors.forest} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: 14 }} /> : null}
    </Card>
  );
}

export function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{sub ? <Text style={styles.metricSub}>{sub}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 18, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: { minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerTitle: { flexDirection: "row-reverse", alignItems: "center", gap: 10, flex: 1 },
  logoMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: Brand.colors.forestDeep },
  brand: { color: Brand.colors.ink, fontSize: 20, fontWeight: "800", textAlign: "right" },
  headerSub: { color: Brand.colors.muted, fontSize: 11, textAlign: "right", marginTop: 1 },
  headerActions: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  sync: { fontSize: 10, fontWeight: "600" },
  avatarButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  sectionTitleText: { color: Brand.colors.ink, fontSize: 17, fontWeight: "800", textAlign: "right" },
  sectionDetail: { color: Brand.colors.muted, textAlign: "right", fontSize: 12, marginTop: 4 },
  link: { color: Brand.colors.forest, fontWeight: "700", fontSize: 12 },
  card: { backgroundColor: Brand.colors.paper, borderColor: Brand.colors.line, borderWidth: 1, borderRadius: 22, padding: 17, gap: 12, boxShadow: "0px 4px 9px rgba(32, 43, 34, 0.035)" },
  button: { minHeight: 46, borderRadius: 15, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  primaryButton: { backgroundColor: Brand.colors.forest },
  secondaryButton: { backgroundColor: Brand.colors.mint, borderWidth: 1, borderColor: "#D8E5D9" },
  quietButton: { backgroundColor: "transparent" },
  dangerButton: { backgroundColor: Brand.colors.danger },
  primaryButtonText: { color: Brand.colors.paper, fontWeight: "800", fontSize: 13 },
  secondaryButtonText: { color: Brand.colors.forestDeep, fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.86 },
  pill: { alignSelf: "flex-start", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  pillNeutral: { backgroundColor: "#F0EEE7" },
  pillGreen: { backgroundColor: Brand.colors.mint },
  pillGold: { backgroundColor: Brand.colors.copperPale },
  pillWarning: { backgroundColor: Brand.colors.warning },
  pillDanger: { backgroundColor: Brand.colors.dangerPale },
  pillText: { color: Brand.colors.ink, fontWeight: "700", fontSize: 10 },
  pillWarningText: { color: Brand.colors.warningInk, fontWeight: "700", fontSize: 10 },
  pillDangerText: { color: Brand.colors.danger, fontWeight: "700", fontSize: 10 },
  fieldLabel: { color: Brand.colors.ink, fontWeight: "700", fontSize: 12, textAlign: "right", marginBottom: 7 },
  input: { minHeight: 46, borderWidth: 1, borderColor: Brand.colors.line, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: Brand.colors.paper, color: Brand.colors.ink, fontSize: 14, writingDirection: "rtl" },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  hint: { color: Brand.colors.muted, fontSize: 11, textAlign: "right", marginTop: 5, lineHeight: 17 },
  notice: { flexDirection: "row-reverse", gap: 10, borderRadius: 16, padding: 13, borderWidth: 1, alignItems: "flex-start" },
  noticeWarning: { backgroundColor: Brand.colors.warning, borderColor: "#F0DFBE" },
  noticeInfo: { backgroundColor: "#EDF3F4", borderColor: "#DCE7E8" },
  noticeDanger: { backgroundColor: Brand.colors.dangerPale, borderColor: "#F2D8D5" },
  noticeTitle: { fontWeight: "800", textAlign: "right", fontSize: 12 },
  noticeBody: { textAlign: "right", fontSize: 11, lineHeight: 17, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: Brand.colors.ink, textAlign: "center" },
  emptyBody: { fontSize: 12, color: Brand.colors.muted, textAlign: "center", lineHeight: 19 },
  metric: { minWidth: 90, flex: 1, backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, borderRadius: 16, padding: 12, gap: 5 },
  metricLabel: { color: Brand.colors.muted, textAlign: "right", fontSize: 10 },
  metricValue: { color: Brand.colors.forest, textAlign: "right", fontSize: 19, fontWeight: "800" },
  metricSub: { color: Brand.colors.muted, textAlign: "right", fontSize: 10 },
});
export const Ui = styles;
