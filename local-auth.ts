import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { getUserByEmail, getDb } from "../db";
import { users } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSessionCookieName, getSessionCookieOptions } from "./cookies";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientKey(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
  return `${ip || "unknown"}:${String(req.body?.email || "").trim().toLowerCase()}`;
}

function allowAttempt(req: Request) {
  const key = clientKey(req);
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password: string, encoded: string | null) {
  const [algorithm, n, r, p, saltHex, hashHex] = String(encoded || "").split("$");
  if (algorithm !== "scrypt" || n !== "16384" || r !== "8" || p !== "1" || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function publicUser(user: { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: Date }) {
  return { id: user.id, openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn.toISOString() };
}

async function issueSession(req: Request, res: Response, user: { openId: string; name: string | null }) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: 365 * 24 * 60 * 60 * 1000 });
  res.cookie(getSessionCookieName(req), token, { ...getSessionCookieOptions(req), maxAge: 365 * 24 * 60 * 60 * 1000 });
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    if (!allowAttempt(req)) { res.status(429).json({ error: "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى." }); return; }
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || !validPassword(password)) {
      res.status(400).json({ error: "أدخل اسمًا صحيحًا وبريدًا صالحًا وكلمة مرور من 12 حرفًا تحتوي على حرف ورقم." }); return;
    }
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "خدمة الحسابات غير متاحة حاليًا. حاول لاحقًا." }); return; }
    try {
      const existing = await getUserByEmail(email);
      if (existing) { res.status(409).json({ error: "تعذر إنشاء الحساب بهذه البيانات. جرّب تسجيل الدخول أو بريدًا آخر." }); return; }
      const openId = `local_${randomUUID().replaceAll("-", "")}`;
      const [created] = await db.insert(users).values({ openId, name, email, passwordHash: hashPassword(password), loginMethod: "email", lastSignedIn: new Date() }).$returningId();
      const saved = await getUserByEmail(email);
      if (!saved || !created?.id) throw new Error("account_create_failed");
      await issueSession(req, res, saved);
      res.status(201).json({ user: publicUser(saved) });
    } catch (error) {
      console.error("[Auth] Local signup failed", error);
      res.status(500).json({ error: "تعذر إنشاء الحساب الآن. حاول مرة أخرى." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    if (!allowAttempt(req)) { res.status(429).json({ error: "محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى." }); return; }
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (!emailPattern.test(email) || typeof password !== "string" || password.length > 128) { res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }); return; }
    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) { res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }); return; }
    await issueSession(req, res, user);
    res.json({ user: publicUser(user) });
  });
}
