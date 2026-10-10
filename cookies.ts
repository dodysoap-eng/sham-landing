import { parse as parseCookieHeader } from "cookie";
import type { CookieOptions, Request, RequestHandler } from "express";
import {
  LEGACY_COOKIE_NAME,
} from "../../shared/const.js";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
    if (protoList.some((proto) => proto.trim().toLowerCase() === "https")) return true;
  }

  // The Preview gateway can terminate public HTTPS before the development server.
  // Use the configured public origins as a fallback instead of trusting NODE_ENV.
  return [process.env.EXPO_WEB_PREVIEW_URL, process.env.EXPO_PACKAGER_PROXY_URL, process.env.EXPO_PUBLIC_API_BASE_URL]
    .some((value) => {
      if (!value) return false;
      try { return new URL(value).protocol === "https:"; } catch { return false; }
    });
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

function configuredApiHostname(): string | null {
  const packager = process.env.EXPO_PACKAGER_PROXY_URL;
  if (!packager) return null;
  try {
    const url = new URL(packager);
    const hostname = url.hostname.replace(/^8081-/, "3000-");
    return hostname === url.hostname ? null : hostname;
  } catch {
    return null;
  }
}

function legacyParentDomain(hostname: string): string | null {
  const normalized = hostname.toLowerCase();
  if (normalized !== configuredApiHostname()?.toLowerCase()) return null;
  if (!/^3000-[a-z0-9-]+(?:\.[a-z0-9-]+){2,}$/.test(normalized)) return null;
  return `.${normalized.split(".").slice(-2).join(".")}`;
}

export function getSessionCookieName(req: Request): string {
  // Web Preview injects application sessions under this exact, host-compatible name.
  return "webdev_app_session";
}

export function getOAuthStateCookieName(req: Request): string {
  return isSecureRequest(req) ? "__Host-sham_oauth_state" : "sham_local_oauth_state";
}

export function getCookieValue(req: Request, name: string): string | undefined {
  if (!req.headers.cookie) return undefined;
  return parseCookieHeader(req.headers.cookie)[name];
}

export function getLegacySessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    domain: legacyParentDomain(req.hostname) ?? undefined,
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

export function clearLegacySessionCookie(): RequestHandler {
  return (req, res, next) => {
    res.clearCookie(LEGACY_COOKIE_NAME, getLegacySessionCookieOptions(req));
    next();
  };
}

export function currentSessionCookie(req: Request): string | undefined {
  return getCookieValue(req, getSessionCookieName(req));
}
