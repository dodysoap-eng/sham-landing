import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { clearPendingOAuthState, getPendingOAuthState } from "@/constants/oauth";
import { Brand } from "@/constants/brand";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CallbackStatus = "processing" | "success" | "error";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    const handleCallback = async () => {
      try {
        if (typeof params.error === "string" && params.error) {
          await clearPendingOAuthState();
          throw new Error("ألغيت عملية الدخول أو رفضها مزود المصادقة. ابدأ من جديد عند الرغبة.");
        }
        const code = typeof params.code === "string" ? params.code : "";
        const state = typeof params.state === "string" ? params.state : "";
        if (!code || !state) throw new Error("رابط العودة لا يحتوي على بيانات دخول مكتملة. أعد المحاولة من التطبيق.");

        const pending = await getPendingOAuthState();
        if (!pending || pending !== state) {
          await clearPendingOAuthState();
          throw new Error("تعذر التحقق من طلب الدخول أو انتهت مهلته. ابدأ تسجيل الدخول من جديد.");
        }
        // Consume the local one-time binding before exchanging the authorization code.
        await clearPendingOAuthState();
        const result = await Api.exchangeOAuthCode(code, state);
        if (!result.sessionToken) throw new Error("لم يُصدر الخادم جلسة صالحة. أعد تسجيل الدخول.");

        if (Platform.OS === "web") {
          const established = await Api.establishSession(result.sessionToken);
          if (!established) throw new Error("تعذر تثبيت جلسة التطبيق في المتصفح. تحقق من إعدادات ملفات الارتباط ثم أعد المحاولة.");
        } else {
          await Auth.setSessionToken(result.sessionToken);
        }
        if (result.user?.openId) {
          await Auth.setUserInfo({
            id: result.user.id,
            openId: result.user.openId,
            name: result.user.name,
            email: result.user.email,
            loginMethod: result.user.loginMethod,
            lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
          });
        }
        setStatus("success");
        redirectTimer = setTimeout(() => router.replace("/(tabs)"), 400);
      } catch (reason) {
        setStatus("error");
        setErrorMessage(reason instanceof Error ? reason.message : "تعذر إكمال تسجيل الدخول.");
      }
    };
    void handleCallback();
    return () => { if (redirectTimer) clearTimeout(redirectTimer); };
  }, [params.code, params.state, params.error, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.mark}><Text style={styles.markText}>ش</Text></View>
        {status === "processing" ? <><ActivityIndicator size="large" color={Brand.colors.forest} /><Text style={styles.title}>جارٍ التحقق من جلسة الدخول</Text><Text style={styles.copy}>نؤكد طلب العودة ونجهّز مساحة عملك بأمان.</Text></> : null}
        {status === "success" ? <><Text style={styles.title}>تم تسجيل الدخول</Text><Text style={styles.copy}>نفتح مساحة عمل شم الآن.</Text></> : null}
        {status === "error" ? <><Text style={styles.title}>لم يكتمل تسجيل الدخول</Text><Text style={styles.copy}>{errorMessage}</Text><Pressable onPress={() => router.replace("/login")} style={styles.retry}><Text style={styles.retryText}>العودة إلى تسجيل الدخول</Text></Pressable></> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.colors.canvas },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  mark: { width: 52, height: 52, borderRadius: 18, backgroundColor: Brand.colors.forestDeep, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  markText: { color: Brand.colors.copper, fontSize: 25, fontWeight: "900" },
  title: { color: Brand.colors.ink, textAlign: "center", fontSize: 18, lineHeight: 27, fontWeight: "800" },
  copy: { color: Brand.colors.muted, textAlign: "center", fontSize: 12, lineHeight: 19, maxWidth: 360 },
  retry: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: Brand.colors.mint, marginTop: 8 },
  retryText: { color: Brand.colors.forest, fontWeight: "800", fontSize: 12 },
});
