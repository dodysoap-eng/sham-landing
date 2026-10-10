import * as Linking from "expo-linking";
import Constants from "expo-constants";
import * as ReactNative from "react-native";
import * as SecureStore from "expo-secure-store";

// The callback scheme must remain in sync with app.config.ts and the server allowlist.
const bundleId = "space.manus.shamapp.t243795804825483";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;
const PENDING_OAUTH_STATE_KEY = "sham_pending_oauth_state_v1";
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const env = {
  portal: extra.oauthPortalUrl ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: extra.oauthServerUrl ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: extra.appId ?? process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/** Resolve the API URL without deriving a URL from the internal server Host header. */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

/** OAuth callback URI is the real web origin or the app-specific Android deep link. */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    if (typeof window === "undefined" || !window.location?.origin) throw new Error("تعذّر تحديد عنوان العودة إلى التطبيق.");
    return `${window.location.origin}/oauth/callback`;
  }
  return Linking.createURL("oauth/callback", { scheme: env.deepLinkScheme });
};

export async function setPendingOAuthState(state: string): Promise<void> {
  if (ReactNative.Platform.OS === "web") {
    window.sessionStorage.setItem(PENDING_OAUTH_STATE_KEY, state);
    return;
  }
  await SecureStore.setItemAsync(PENDING_OAUTH_STATE_KEY, state);
}

export async function getPendingOAuthState(): Promise<string | null> {
  if (ReactNative.Platform.OS === "web") {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(PENDING_OAUTH_STATE_KEY);
  }
  return SecureStore.getItemAsync(PENDING_OAUTH_STATE_KEY);
}

export async function clearPendingOAuthState(): Promise<void> {
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(PENDING_OAUTH_STATE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PENDING_OAUTH_STATE_KEY);
}

/** Request a short-lived, single-use OAuth state from the application server. */
export const getLoginUrl = async () => {
  if (!OAUTH_PORTAL_URL || !APP_ID) throw new Error("إعداد تسجيل الدخول عبر Manus غير متاح.");
  const apiBaseUrl = getApiBaseUrl();
  if (ReactNative.Platform.OS !== "web" && !apiBaseUrl) throw new Error("لم يُضبط عنوان خادم التطبيق لهذا البناء.");
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/oauth/state` : "/api/oauth/state";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ redirectUri: getRedirectUri(), client: ReactNative.Platform.OS === "web" ? "web" : "native" }),
  });
  if (!response.ok) {
    let message = "تعذّر تجهيز خطوة الدخول الآمن.";
    try { const result = await response.json(); if (typeof result.error === "string") message = result.error; } catch { /* Keep the safe message. */ }
    throw new Error(message);
  }
  const result = await response.json() as { state?: unknown };
  if (typeof result.state !== "string" || !result.state) throw new Error("لم يصل رمز تحقق صالح من خادم التطبيق.");
  await setPendingOAuthState(result.state);
  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", getRedirectUri());
  url.searchParams.set("state", result.state);
  url.searchParams.set("responseType", "code");
  return url.toString();
};

export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = await getLoginUrl();
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.href = loginUrl;
    return null;
  }
  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) throw new Error("تعذّر فتح متصفح تسجيل الدخول على هذا الجهاز.");
  await Linking.openURL(loginUrl);
  return null;
}
