import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { startOAuthLogin } from "@/constants/oauth";
import { Brand } from "@/constants/brand";
import { Button, Notice } from "@/components/sham-ui";
import { useI18n } from "@/lib/i18n";

export default function LoginScreen() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const login = async () => {
    setError("");
    setBusy(true);
    try {
      await startOAuthLogin();
      } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("login.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.top}><View style={styles.mark}><Ionicons name="flask-outline" size={24} color={Brand.colors.copper} /></View><Text style={styles.wordmark}>{t("brand.name")}</Text><Text style={styles.submark}>{t("brand.subtitle")}</Text></View>
        <View style={styles.hero}>
          <Image source={require("@/assets/images/icon.png")} style={styles.heroImage} resizeMode="contain" />
          <Text style={styles.eyebrow}>{t("login.eyebrow")}</Text>
          <Text style={styles.title}>{t("login.title")}</Text>
          <Text style={styles.body}>{t("login.body")}</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t("login.panelTitle")}</Text>
          <Text style={styles.panelBody}>{t("login.panelBody")}</Text>
          {error ? <Notice title={t("login.error")} body={error} tone="danger" /> : null}
          <Button label={busy ? t("login.loading") : t("login.button")} onPress={login} icon="arrow-back" loading={busy} />
          <View style={styles.secureRow}><Ionicons name="shield-checkmark-outline" size={17} color={Brand.colors.forest} /><Text style={styles.secureText}>{t("login.secure")}</Text></View>
        </View>
        <View style={styles.footer}><Text style={styles.footerText}>{t("login.footer")}</Text><Pressable onPress={() => setError(t("login.panelBody"))}><Text style={styles.footerLink}>{t("login.why")}</Text></Pressable></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.colors.canvas },
  page: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 38, gap: 22, width: "100%", maxWidth: 560, alignSelf: "center" },
  top: { alignItems: "center", gap: 5 },
  mark: { width: 50, height: 50, borderRadius: 18, backgroundColor: Brand.colors.forestDeep, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  wordmark: { fontSize: 26, fontWeight: "900", color: Brand.colors.ink },
  submark: { color: Brand.colors.muted, fontSize: 12 },
  hero: { alignItems: "center", paddingTop: 2 },
  heroImage: { width: 112, height: 112, borderRadius: 34, marginBottom: 12 },
  eyebrow: { color: Brand.colors.copper, fontSize: 11, fontWeight: "800", marginBottom: 8 },
  title: { fontSize: 25, fontWeight: "900", color: Brand.colors.ink, textAlign: "center", lineHeight: 36 },
  body: { color: Brand.colors.muted, fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 9, maxWidth: 390 },
  panel: { padding: 18, borderRadius: 23, backgroundColor: Brand.colors.paper, borderWidth: 1, borderColor: Brand.colors.line, gap: 12 },
  panelTitle: { color: Brand.colors.ink, fontSize: 17, fontWeight: "800", textAlign: "right" },
  panelBody: { color: Brand.colors.muted, fontSize: 12, lineHeight: 18, textAlign: "right" },
  secureRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, marginTop: 2 },
  secureText: { color: Brand.colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right", flex: 1 },
  footer: { alignItems: "center", gap: 7 },
  footerText: { color: Brand.colors.muted, fontSize: 10 },
  footerLink: { color: Brand.colors.forest, fontSize: 11, fontWeight: "700" },
});
