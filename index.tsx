import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader, AppScreen, Button, Card, Metric, Notice, Pill, SectionTitle } from "@/components/sham-ui";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/hooks/use-auth";
import { useShamWorkspace } from "@/lib/sham-workspace-context";
import { SOURCE_FORMULAS } from "@/lib/sham-catalog";
import { useI18n } from "@/lib/i18n";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth({ autoFetch: false });
  const { workspace, syncStatus } = useShamWorkspace();
  const { t, locale } = useI18n();
  const firstName = user?.name?.trim().split(/\s+/)[0] || (locale === "en" ? "Perfumer" : "صانع العطر");
  return (
    <AppScreen>
      <AppHeader onProfile={() => router.push("/account")} syncStatus={syncStatus} />
      <View style={styles.welcomeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("home.eyebrow")}</Text>
          <Text style={styles.welcome}>{t("home.welcome", { name: firstName })}</Text>
          <Text style={styles.copy}>{t("home.copy")}</Text>
        </View>
        <View style={styles.stamp}><Ionicons name="sparkles-outline" size={20} color={Brand.colors.copper} /></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroTop}><Pill label={t("home.private")} tone="gold" /><Ionicons name="flask" size={24} color="#E2BC7B" /></View>
        <Text style={styles.heroTitle}>{t("home.heroTitle")}</Text>
        <Text style={styles.heroBody}>{t("home.heroBody")}</Text>
        <Button label={t("home.newFormula")} onPress={() => router.push("/(tabs)/calculator")} icon="add" style={styles.heroButton} />
      </View>
      <View style={styles.metrics}>
        <Metric label={t("home.formulas")} value={String(workspace.formulas.length)} sub={t("home.saved")} />
        <Metric label={t("home.ingredients")} value={String(workspace.ingredients.length)} sub={t("home.inLibrary")} />
        <Metric label={t("home.sessions")} value={String(workspace.sessions.length)} sub={t("home.resume")} />
      </View>
      <SectionTitle title={t("home.start")} detail={t("home.quickTools")} />
      <View style={styles.quickGrid}>
        <QuickAction title={t("home.calculate")} detail={t("home.calculateDetail")} icon="calculator-outline" onPress={() => router.push("/(tabs)/calculator")} />
        <QuickAction title={t("home.search")} detail={t("home.searchDetail")} icon="search-outline" onPress={() => router.push("/(tabs)/library")} />
        <QuickAction title={t("home.ask")} detail={t("home.askDetail")} icon="chatbubble-ellipses-outline" onPress={() => router.push("/(tabs)/assistant")} />
      </View>
      {workspace.sessions.length ? <><SectionTitle title="تابع جلسة العمل" detail="آخر سياق حفظته" />{workspace.sessions.slice(0, 2).map((session) => {
        const formula = workspace.formulas.find((item) => item.id === session.formulaId);
        return <Pressable key={session.id} disabled={!formula} onPress={() => formula && router.push({ pathname: "/(tabs)/calculator", params: { formulaId: formula.id } })} style={styles.sessionCard}>
          <View style={styles.sessionArrow}><Ionicons name="arrow-back" size={17} color={Brand.colors.forest} /></View>
          <View style={{ flex: 1 }}><Text style={styles.refTitle}>{session.title}</Text><Text numberOfLines={2} style={styles.refBody}>{session.notes || formula?.title || "جلسة محفوظة"}</Text></View>
          <Pill label={session.status === "active" ? "مفتوحة" : session.status === "complete" ? "مكتملة" : "مؤجلة"} tone={session.status === "active" ? "green" : "neutral"} />
        </Pressable>;
      })}</> : null}
      <SectionTitle title={t("home.reference")} detail={`${SOURCE_FORMULAS.length} ${t("nav.library")}`} actionLabel={t("home.openLibrary")} onAction={() => router.push("/(tabs)/library")} />
      <Card style={styles.referenceCard}>
        <View style={styles.refIcon}><Ionicons name="book-outline" size={20} color={Brand.colors.forest} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refTitle}>{t("home.referenceTitle")}</Text>
          <Text style={styles.refBody}>المصادر والوحدات محفوظة كما وردت؛ وكتالوج المكونات لقطة تاريخية من 2016.</Text>
        </View>
      </Card>
      <Notice title={t("home.safety")} body="التحقق البرمجي محدود بعطر جلدي IFRA 4 عندما تتوفر حدود موثّقة. بقية الفئات غير مُقيّمة؛ ولا يغني هذا عن مقيّم سلامة مؤهل." tone="warning" />
    </AppScreen>
  );
}

function QuickAction({ title, detail, icon, onPress }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.82 }]}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={20} color={Brand.colors.forest} /></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  welcomeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingTop: 2 },
  eyebrow: { color: Brand.colors.copper, fontSize: 11, fontWeight: "800", textAlign: "right" },
  welcome: { color: Brand.colors.ink, fontSize: 22, fontWeight: "900", textAlign: "right", marginTop: 4 },
  copy: { color: Brand.colors.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 5 },
  stamp: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: "#E7D8BD", backgroundColor: Brand.colors.copperPale, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: Brand.colors.forestDeep, borderRadius: 25, padding: 19, gap: 9, overflow: "hidden" },
  heroTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  heroTitle: { color: Brand.colors.paper, fontSize: 24, lineHeight: 32, fontWeight: "900", textAlign: "right", marginTop: 6 },
  heroBody: { color: "#D6E2DB", fontSize: 12, lineHeight: 19, textAlign: "right", maxWidth: 310 },
  heroButton: { alignSelf: "flex-end", backgroundColor: "#DDB779", marginTop: 5 },
  metrics: { flexDirection: "row-reverse", gap: 8 },
  quickGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
  quickCard: { width: "48%", flexGrow: 1, minHeight: 115, padding: 13, borderRadius: 18, backgroundColor: Brand.colors.paper, borderColor: Brand.colors.line, borderWidth: 1, alignItems: "flex-end", justifyContent: "space-between" },
  quickIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  quickTitle: { color: Brand.colors.ink, textAlign: "right", fontWeight: "800", fontSize: 13, marginTop: 8 },
  quickDetail: { color: Brand.colors.muted, textAlign: "right", fontSize: 10, lineHeight: 15, marginTop: 2 },
  referenceCard: { flexDirection: "row-reverse", alignItems: "center" },
  sessionCard: { flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 13, borderRadius: 17, backgroundColor: Brand.colors.paper, borderColor: Brand.colors.line, borderWidth: 1 },
  sessionArrow: { width: 32, height: 32, borderRadius: 11, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  refIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  refTitle: { color: Brand.colors.ink, fontWeight: "800", textAlign: "right", fontSize: 12 },
  refBody: { color: Brand.colors.muted, textAlign: "right", fontSize: 11, lineHeight: 17, marginTop: 4 },
});
