import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "account-a",
    email: "account-a@example.com",
    passwordHash: null,
    name: "Account A",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("workspace session identity guard", () => {
  it("rejects a stale account before loading its workspace", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.workspace.load({ expectedOpenId: "account-b" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a stale account before saving an encrypted workspace", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.workspace.save({
      expectedOpenId: "account-b",
      expectedRevision: 0,
      payload: {
        type: "sham.workspace.aes-gcm.v1",
        algorithm: "AES-256-GCM",
        kdf: "PBKDF2-SHA256",
        iterations: 210_000,
        salt: "a".repeat(32),
        nonce: "b".repeat(24),
        ciphertext: "c".repeat(32),
        updatedAt: new Date().toISOString(),
      },
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a stale account before deleting a workspace", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.workspace.remove({ expectedOpenId: "account-b" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
