import { useState } from "react";
import { useRouter } from "expo-router";
import { Image, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader, AppScreen, Button, Card, Notice, Pill, SectionTitle } from "@/components/sham-ui";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/hooks/use-auth";
import { useShamWorkspace } from "@/lib/sham-workspace-context";
import { confirmAction, showMessage } from "@/lib/ui-notify";
import { LANGUAGES, useI18n, type Locale } from "@/lib/i18n";

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, setLocale, t } = useI18n();
  const {
    workspace, syncStatus, cloudConsent, enableCloudSync, disableCloudSync, deleteCloudCopy,
    syncConflict, conflictBackup, hasPendingChanges, retryPaused, resolveConflict, clearConflictBackup, retrySyncNow,
  } = useShamWorkspace();
  const [busy, setBusy] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [languageOpen, setLanguageOpen] = useState(false);
  const isUnlocking = cloudConsent && syncStatus === "locked";
  const statusLabel = syncStatus === "saved" ? "متزامنة ومشفرة" : syncStatus === "saving" ? "جارٍ حفظ التغييرات" : syncStatus === "offline" ? retryPaused ? "توقفت المحاولات التلقائية؛ أعد المحاولة يدويًا" : "بانتظار الاتصال أو المحاولة التالية" : syncStatus === "local" ? "محلية على هذا الجهاز" : syncStatus === "conflict" ? "تحتاج إلى حسم تعارض" : syncStatus === "locked" ? "تحتاج إلى عبارة الاسترداد" : "جارٍ التحميل";
  const signInMethod = user?.loginMethod ? String(user.loginMethod).toUpperCase() : "MANUS OAUTH";

  const signOut = async () => {
    const yes = await confirmAction("تسجيل الخروج؟", "ستحتاج إلى تسجيل الدخول مجددًا لفتح مساحة الحساب. تبقى نسخة التطبيق المحلية المشفّرة على هذا الجهاز.");
    if (!yes) return;
    setBusy(true);
    try { await logout(); } finally { setBusy(false); router.replace("/login"); }
  };

  const enableSync = async () => {
    if (!recoveryPhrase.trim() || (!isUnlocking && recoveryPhrase !== confirmPhrase)) {
      showMessage("تحقق من عبارة الاسترداد", isUnlocking ? "أدخل العبارة التي أنشأتها للمزامنة." : "يجب أن تتطابق العبارتان.");
      return;
    }
    const yes = await confirmAction(
      isUnlocking ? "فتح ومراجعة النسخة السحابية؟" : "تفعيل المزامنة المشفّرة؟",
      isUnlocking
        ? "يفتح التطبيق النسخة بهذه العبارة. إذا كانت لديك نسخة سحابية قديمة غير مشفّرة، فلن يرحّلها في الخلفية؛ سيعرض النسختين أولًا ويطلب اختيارًا صريحًا قبل إعادة كتابتها مشفّرة."
        : "ستُشفّر مساحة العمل على الجهاز قبل رفعها. عبارة الاسترداد لا تُرسل إلى الخادم ولا نخزنها؛ احفظها في مكان آمن واستخدمها على أجهزتك الأخرى. فقدانها يعني تعذر فك النسخة السحابية. إذا ظهرت نسخة قديمة غير مشفّرة، سيوقف التطبيق المزامنة ويطلب اختيارًا واضحًا قبل ترحيلها.",
    );
    if (!yes) return;
    setBusy(true);
    try {
      await enableCloudSync(recoveryPhrase);
      setRecoveryPhrase("");
      setConfirmPhrase("");
      showMessage(isUnlocking ? "اكتملت محاولة فتح المزامنة" : "تم إعداد المزامنة المشفّرة", "راجع حالة المساحة. إذا وُجد اختلاف بين الأجهزة، اختر النسخة التي تريد الاحتفاظ بها قبل المتابعة.");
    } catch (error) {
      showMessage("تعذّر فتح المزامنة", error instanceof Error ? error.message : "تحقق من عبارة الاسترداد والاتصال، ثم أعد المحاولة.");
    } finally { setBusy(false); }
  };

  const stopSync = async () => {
    const yes = await confirmAction("إيقاف المزامنة؟", "ستبقى البيانات المحلية مشفّرة على هذا الجهاز. يمنع التطبيق أي طلب جديد فورًا، وينتظر حتى 30 ثانية للحفظ الجاري قبل تأكيد الإيقاف؛ إذا تعذر تأكيد انتهائه سيخبرك. لا يحذف هذا الإجراء النسخة السحابية أو التغييرات المعلقة.");
    if (yes) {
      setBusy(true);
      try {
        await disableCloudSync();
        showMessage("أُوقفت المزامنة", "لن يبدأ التطبيق طلب رفع جديدًا. بقيت النسخة السحابية السابقة والتغييرات المعلقة كما هي.");
      } catch (error) {
        showMessage("تعذر تأكيد اكتمال الإيقاف", error instanceof Error ? error.message : "لم يبدأ التطبيق طلبات جديدة؛ تحقق من حالة النقل الجاري.");
      } finally { setBusy(false); }
    }
  };

  const retrySync = async () => {
    setBusy(true);
    try { await retrySyncNow(); }
    catch (error) { showMessage("تعذرت المزامنة", error instanceof Error ? error.message : "تحقق من الاتصال وعبارة الاسترداد ثم أعد المحاولة."); }
    finally { setBusy(false); }
  };

  const removeCloud = async () => {
    const yes = await confirmAction("حذف النسخة السحابية لهذا الحساب؟", "سيحذف الخادم النسخة السحابية لهذا الحساب فقط. تبقى النسخة المحلية المشفّرة على الجهاز، وأي نسختين متعارضتين تُحفَظان في أرشيف محلي مشفّر. لا يتأثر حساب Manus.");
    if (!yes) return;
    setBusy(true);
    try { await deleteCloudCopy(); showMessage("حُذفت النسخة السحابية", "بقيت بيانات هذا الجهاز كما هي، وتوقفت المزامنة."); }
    catch (error) { showMessage("تعذّر حذف النسخة", error instanceof Error ? error.message : "تحقق من الاتصال وحاول مرة أخرى."); }
    finally { setBusy(false); }
  };

  const exportLocal = async () => {
    const payload = JSON.stringify({
      application: "Sham",
      schemaVersion: workspace.schemaVersion,
      exportedAt: new Date().toISOString(),
      workspace,
      conflictBackup: conflictBackup ?? undefined,
      activeConflict: syncConflict ?? undefined,
    }, null, 2);
    try {
      if (typeof document !== "undefined" && typeof URL !== "undefined" && typeof Blob !== "undefined") {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
        link.download = `sham-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else await Share.share({ title: "نسخة احتياطية من شم", message: payload });
      showMessage("جاهزة للتصدير", conflictBackup || syncConflict ? "تتضمن النسخة المحلية ونسخ التعارض المتاحة." : "تم تجهيز نسخة مساحة العمل المحلية بصيغة JSON.");
    } catch { showMessage("تعذّر التصدير", "حاول مرة أخرى أو احفظ التراكيب يدويًا."); }
  };

  const chooseConflict = async (choice: "local" | "cloud") => {
    if (!syncConflict) return;
    const localLabel = `${syncConflict.local.formulas.length} تركيبة، ${syncConflict.local.ingredients.length} مكوّن، ${syncConflict.local.sessions.length} جلسة`;
    const cloudLabel = `${syncConflict.cloud.formulas.length} تركيبة، ${syncConflict.cloud.ingredients.length} مكوّن، ${syncConflict.cloud.sessions.length} جلسة`;
    const yes = await confirmAction(
      choice === "local" ? "رفع نسخة هذا الجهاز؟" : "استعادة النسخة السحابية؟",
      choice === "local"
        ? `ستصبح نسخة الجهاز (${localLabel}) هي النسخة السحابية، وستحل محل نسختها الحالية (${cloudLabel}). احتُفظ بنسختي التعارض مشفرتين على هذا الجهاز ويمكن تصديرهما.`
        : `ستُستبدل نسخة الجهاز (${localLabel}) بالنسخة السحابية (${cloudLabel}). احتُفظ بنسختي التعارض مشفرتين على هذا الجهاز ويمكن تصديرهما.`,
    );
    if (!yes) return;
    setBusy(true);
    try {
      await resolveConflict(choice);
      showMessage("تم حسم التعارض", "احتفظ التطبيق بنسخة احتياطية مشفّرة من النسختين على الجهاز.");
    } catch (error) { showMessage("تعذّر حسم التعارض", error instanceof Error ? error.message : "قد تكون هناك تغييرات جديدة؛ أعد المزامنة ثم راجع التعارض."); }
    finally { setBusy(false); }
  };

  const deleteConflictBackup = async () => {
    const yes = await confirmAction("حذف نسخة التعارض الاحتياطية؟", "سيحذف النسختين المؤرشتين محليًا من هذا الجهاز. صدّرها أولًا إذا كنت تريد الاحتفاظ بها.");
    if (yes) { await clearConflictBackup(); showMessage("حُذفت النسخة الاحتياطية", "أزيلت نسخة التعارض المحلية المشفّرة."); }
  };

  const canStart = recoveryPhrase.trim().length >= 16 && (isUnlocking || recoveryPhrase === confirmPhrase);
  return (
    <AppScreen>
      <AppHeader title="حسابك" subtitle="الملف الشخصي والخصوصية" />
      <Card style={styles.languageCard}>
        <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t("account.language")}</Text><Text style={styles.cardSub}>{t("account.languageHint")}</Text></View>
        <Pressable onPress={() => setLanguageOpen(true)} style={styles.languageButton}><Text style={styles.languageButtonText}>{language.nativeName}</Text><Ionicons name="chevron-down" size={16} color={Brand.colors.forest} /></Pressable>
      </Card>
      <Modal visible={languageOpen} transparent animationType="fade" onRequestClose={() => setLanguageOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.languageModal}><View style={styles.modalHeader}><Text style={styles.cardTitle}>{t("account.chooseLanguage")}</Text><Pressable onPress={() => setLanguageOpen(false)}><Ionicons name="close" size={22} color={Brand.colors.muted} /></Pressable></View>
          {LANGUAGES.map((item) => <Pressable key={item.code} onPress={() => { void setLocale(item.code as Locale); setLanguageOpen(false); }} style={[styles.languageRow, item.code === language.code && styles.languageRowActive]}><Text style={styles.languageName}>{item.nativeName}</Text><Text style={styles.languageEnglish}>{item.englishName}</Text>{item.code === language.code ? <Ionicons name="checkmark-circle" size={20} color={Brand.colors.forest} /> : null}</Pressable>)}
          <Text style={styles.modalHint}>{t("account.restartHint")}</Text>
        </View></View>
      </Modal>
      <View style={styles.identity}>
        <Image source={require("@/assets/images/icon.png")} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name || "حساب شم"}</Text>
          <Text style={styles.email}>{user?.email || "تم تسجيل الدخول عبر Manus"}</Text>
          <Text style={styles.member}>دخول موثّق · {signInMethod}</Text>
        </View>
      </View>

      <Card style={styles.summary}>
        <View style={styles.statusRow}>
          <View style={styles.syncIcon}><Ionicons name="cloud-done-outline" size={20} color={Brand.colors.forest} /></View>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>حفظ مساحة العمل</Text><Text style={styles.cardSub}>الحالة الحالية: {statusLabel}</Text></View>
          <Pill label={cloudConsent ? "موافقة سحابية" : "محلي فقط"} tone={cloudConsent ? "green" : "gold"} />
        </View>
        <View style={styles.stats}><Stat label="تركيبات" count={workspace.formulas.length} /><Stat label="مكوّنات" count={workspace.ingredients.length} /><Stat label="جلسات" count={workspace.sessions.length} /></View>
        {cloudConsent && <Text style={styles.cardSub}>{hasPendingChanges ? "توجد تغييرات مشفّرة بانتظار تأكيد الخادم." : ""}</Text>}
      </Card>

      <SectionTitle title="الخصوصية والأمان" />
      <Notice title="الدخول عبر Manus OAuth" body="لا يخزن التطبيق كلمة مرورك. يخزن Android رمز الجلسة ومفتاح تشفير الجهاز في SecureStore، مع ربط مساحة العمل بمعرّف الحساب الذي يتحقق منه الخادم." tone="info" icon="shield-checkmark-outline" />
      <Notice title="تشفير قبل الرفع" body="تُشفّر حمولة السحابة على الجهاز بـAES-256-GCM قبل إرسالها، ويشتق المفتاح من عبارة استرداد بـPBKDF2-SHA256. لا يتلقى الخادم العبارة أو مفتاح فك البيانات. احفظ العبارة خارج التطبيق؛ لا يمكن استردادها إذا فُقدت." tone="info" icon="lock-closed-outline" />
      <Notice title="حدود الحماية" body="على Android يحمي SecureStore مفتاح النسخة المحلية بمخزن النظام. معاينة الويب تستخدم مخزن المتصفح المحلي ولا توفر ضمان KeyStore نفسه؛ كما أن النسخ الاحتياطية التي تصدّرها تصبح ملفًا غير مشفّر يجب حفظه بعناية." tone="warning" icon="alert-circle-outline" />

      {!cloudConsent || isUnlocking ? (
        <Card style={{ gap: 9 }}>
          <Text style={styles.cardTitle}>{isUnlocking ? "فتح النسخة السحابية" : "إعداد عبارة استرداد للمزامنة"}</Text>
          <Text style={styles.cardSub}>{isUnlocking ? "أدخل العبارة نفسها التي استخدمتها عند إعداد المزامنة أو على جهاز آخر." : "أنشئ عبارة من 16 حرفًا على الأقل؛ فضّل عدة كلمات غير مترابطة. استخدم العبارة نفسها على أجهزتك الأخرى."}</Text>
          <TextInput
            value={recoveryPhrase}
            onChangeText={setRecoveryPhrase}
            placeholder="عبارة الاسترداد"
            placeholderTextColor={Brand.colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            style={styles.secretInput}
            accessibilityLabel="عبارة استرداد المزامنة"
          />
          {!isUnlocking && <TextInput
            value={confirmPhrase}
            onChangeText={setConfirmPhrase}
            placeholder="أعد كتابة عبارة الاسترداد"
            placeholderTextColor={Brand.colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            style={styles.secretInput}
            accessibilityLabel="تأكيد عبارة استرداد المزامنة"
          />}
          {!isUnlocking && <Text style={styles.cardSub}>لا تستخدم كلمة مرور Manus. التطبيق لا يرسل هذه العبارة ولا يحفظها كنص.</Text>}
          <Button label={isUnlocking ? "فتح المزامنة" : "تفعيل المزامنة المشفّرة"} onPress={() => void enableSync()} icon={isUnlocking ? "key-outline" : "cloud-upload-outline"} loading={busy} disabled={!canStart} />
        </Card>
      ) : (
        <Card style={{ gap: 9 }}>
          <Text style={styles.cardTitle}>المزامنة المشفّرة مفعّلة</Text>
          <Text style={styles.cardSub}>يمنع الإيقاف أي طلب جديد وينتظر اكتمال النقل الجاري قبل تأكيده؛ ولا يحذف النسخة السحابية. حذف النسخة إجراء مستقل ومؤكد.</Text>
          <Button label="إيقاف المزامنة فقط" onPress={() => void stopSync()} icon="pause-circle-outline" variant="secondary" disabled={busy} />
          <Button label="إيقاف المزامنة وحذف النسخة السحابية" onPress={() => void removeCloud()} icon="cloud-offline-outline" variant="danger" loading={busy} />
          {hasPendingChanges && syncStatus === "offline" && <Button label={retryPaused ? "إعادة المحاولة يدويًا" : "إعادة المحاولة الآن"} onPress={() => void retrySync()} icon="refresh-outline" variant="secondary" loading={busy} disabled={busy} />}
        </Card>
      )}

      {syncConflict && <Card style={styles.conflictCard}>
        <View style={styles.infoHead}><Ionicons name={syncConflict.cloudIsLegacy ? "lock-open-outline" : "git-compare-outline"} size={18} color={Brand.colors.copper} /><Text style={styles.cardTitle}>{syncConflict.cloudIsLegacy ? "نسخة سحابية قديمة تحتاج إلى ترحيل" : "تعارض بين جهازين"}</Text></View>
        <Text style={styles.cardSub}>{syncConflict.cloudIsLegacy ? "هذه النسخة من إصدار سابق ولم تكن مشفّرة طرفًا لطرف. أوقفنا نقلها تلقائيًا؛ اختر النسخة التي تريد تشفيرها ورفعها. ستبقى نسختا الجهاز والسحابة في أرشيف مشفّر على الجهاز." : "تغيرت النسخة السحابية بعد آخر مراجعة لهذا الجهاز. أوقفنا الرفع تلقائيًا؛ اختر أي نسخة تعتمد. ستبقى النسختان في أرشيف مشفّر على الجهاز."}</Text>
        <View style={styles.conflictBox}><Text style={styles.cardTitle}>نسخة هذا الجهاز</Text><Text style={styles.cardSub}>{syncConflict.local.formulas.length} تركيبة · {syncConflict.local.ingredients.length} مكوّن · {syncConflict.local.sessions.length} جلسة</Text><Text style={styles.tiny}>آخر تعديل: {syncConflict.local.updatedAt}</Text></View>
        <View style={styles.conflictBox}><Text style={styles.cardTitle}>النسخة السحابية</Text><Text style={styles.cardSub}>{syncConflict.cloud.formulas.length} تركيبة · {syncConflict.cloud.ingredients.length} مكوّن · {syncConflict.cloud.sessions.length} جلسة</Text><Text style={styles.tiny}>مراجعة الخادم: {syncConflict.cloudRevision}{syncConflict.cloudIsLegacy ? " · صيغة قديمة تحتاج ترحيلًا مشفّرًا" : ""}</Text></View>
        <Button label="اعتماد نسخة هذا الجهاز ورفعها" onPress={() => void chooseConflict("local")} icon="phone-portrait-outline" loading={busy} disabled={busy || !cloudConsent} />
        <Button label={syncConflict.cloudIsLegacy ? "تشفير واعتماد النسخة السحابية" : "اعتماد النسخة السحابية على هذا الجهاز"} onPress={() => void chooseConflict("cloud")} icon="cloud-download-outline" variant="secondary" disabled={busy || (syncConflict.cloudIsLegacy && !cloudConsent)} />
        <Button label="تصدير النسختين قبل الاختيار" onPress={() => void exportLocal()} icon="download-outline" variant="quiet" disabled={busy} />
      </Card>}

      {conflictBackup && !syncConflict && <Card style={{ gap: 8 }}>
        <Text style={styles.cardTitle}>نسخة تعارض محفوظة محليًا</Text>
        <Text style={styles.cardSub}>تحتوي النسخة المشفّرة على نسختي الجهاز والسحابة قبل الحسم. صدّرها أو احذفها بعد التأكد من عدم حاجتك إليها.</Text>
        <Button label="تصدير النسخة الاحتياطية" onPress={() => void exportLocal()} icon="download-outline" variant="secondary" />
        <Button label="حذف النسخة الاحتياطية" onPress={() => void deleteConflictBackup()} icon="trash-outline" variant="quiet" disabled={busy} />
      </Card>}

      <Card><View style={styles.infoHead}><Ionicons name="sparkles-outline" size={18} color={Brand.colors.copper} /><Text style={styles.cardTitle}>الذكاء الاصطناعي</Text></View><Text style={styles.cardSub}>يُرسل نص سؤالك إلى المساعد عند الإرسال. لا تُشارك أحدث تركيبة محفوظة معه إلا إذا فعّلت خيار مشاركتها في شاشة المحادثة. سجل المحادثة محلي على هذا الجهاز. لا تطبّق الاقتراحات تغييرات تلقائية على بياناتك أو التطبيق.</Text></Card>
      <Button label={conflictBackup || syncConflict ? "تصدير مساحة العمل ونسخ التعارض" : "تصدير نسخة محلية JSON"} onPress={() => void exportLocal()} icon="download-outline" variant="secondary" />
      <Button label="تسجيل الخروج" onPress={() => void signOut()} loading={busy} icon="log-out-outline" variant="quiet" />
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-forward" size={16} color={Brand.colors.forest} /><Text style={styles.backText}>العودة إلى مساحة العمل</Text></Pressable>
      <Text style={styles.version}>شم · حاسبة العطور · الإصدار 1.0.0</Text>
    </AppScreen>
  );
}

function Stat({ label, count }: { label: string; count: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{count.toLocaleString("ar-EG")}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  languageCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  languageButton: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, backgroundColor: Brand.colors.mint },
  languageButtonText: { color: Brand.colors.forest, fontWeight: "800", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20, 28, 23, 0.5)", justifyContent: "center", padding: 20 },
  languageModal: { maxHeight: "85%", backgroundColor: Brand.colors.paper, borderRadius: 22, padding: 16, gap: 5 },
  modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  languageRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12 },
  languageRowActive: { backgroundColor: Brand.colors.mint },
  languageName: { flex: 1, color: Brand.colors.ink, textAlign: "right", fontSize: 13, fontWeight: "700" },
  languageEnglish: { color: Brand.colors.muted, fontSize: 10 },
  modalHint: { color: Brand.colors.muted, textAlign: "center", fontSize: 10, lineHeight: 15, marginTop: 6 },
  identity: { flexDirection: "row-reverse", alignItems: "center", gap: 13, padding: 14, borderRadius: 21, backgroundColor: Brand.colors.forestDeep },
  avatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: Brand.colors.paper },
  name: { color: Brand.colors.paper, textAlign: "right", fontWeight: "900", fontSize: 17 },
  email: { color: "#D2DFD7", textAlign: "right", fontSize: 11, marginTop: 4 },
  member: { color: "#C4D2CA", textAlign: "right", fontSize: 9, marginTop: 4 },
  summary: { gap: 14 },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  syncIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: Brand.colors.ink, textAlign: "right", fontWeight: "800", fontSize: 12 },
  cardSub: { color: Brand.colors.muted, textAlign: "right", fontSize: 10, lineHeight: 17, marginTop: 4 },
  secretInput: { backgroundColor: Brand.colors.paper, borderColor: Brand.colors.line, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: Brand.colors.ink, fontSize: 13 },
  stats: { flexDirection: "row-reverse", borderTopWidth: 1, borderTopColor: Brand.colors.line, paddingTop: 12 },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { color: Brand.colors.forest, fontSize: 16, fontWeight: "900" },
  statLabel: { color: Brand.colors.muted, fontSize: 10 },
  infoHead: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  conflictCard: { gap: 10, borderWidth: 1, borderColor: Brand.colors.copper },
  conflictBox: { padding: 11, borderRadius: 13, backgroundColor: Brand.colors.paper, gap: 2 },
  tiny: { color: Brand.colors.muted, textAlign: "right", fontSize: 9 },
  back: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 },
  backText: { color: Brand.colors.forest, fontSize: 11, fontWeight: "700" },
  version: { color: Brand.colors.muted, textAlign: "center", fontSize: 9 },
});
