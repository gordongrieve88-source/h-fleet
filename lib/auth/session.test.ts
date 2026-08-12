import { describe, expect, it } from "vitest";
import { sealSession, openSession, sealLoginState, openLoginState } from "./session";

const secret = new TextEncoder().encode("a-test-secret-at-least-32-characters-long");
const otherSecret = new TextEncoder().encode("a-DIFFERENT-secret-32-characters-long!!");

describe("session cookie", () => {
  it("round-trips the user id", async () => {
    const token = await sealSession(42, secret, 3600);
    expect(await openSession(token, secret)).toEqual({ userId: 42 });
  });

  it("rejects an expired session", async () => {
    const token = await sealSession(42, secret, -10);
    expect(await openSession(token, secret)).toBeNull();
  });

  it("rejects tampering and wrong secrets (a rotated SESSION_SECRET signs everyone out)", async () => {
    const token = await sealSession(42, secret, 3600);
    expect(await openSession(token + "x", secret)).toBeNull();
    expect(await openSession(token, otherSecret)).toBeNull();
    expect(await openSession("garbage", secret)).toBeNull();
    expect(await openSession("", secret)).toBeNull();
  });

  it("rejects a forged subject that isn't a positive integer", async () => {
    const forged = await sealSession(Number("abc"), secret, 3600).catch(() => null);
    if (forged) expect(await openSession(forged, secret)).toBeNull();
  });
});

describe("login-flow state cookie", () => {
  it("round-trips state/verifier/nonce/returnTo", async () => {
    const state = { state: "st1", verifier: "cv1", nonce: "no1", returnTo: "/fleet?d=2026-08-07" };
    const token = await sealLoginState(state, secret);
    expect(await openLoginState(token, secret)).toEqual(state);
  });

  it("defaults a missing returnTo to the home page", async () => {
    const token = await sealLoginState({ state: "s", verifier: "v", nonce: "n", returnTo: undefined as unknown as string }, secret);
    expect((await openLoginState(token, secret))?.returnTo).toBe("/");
  });

  it("rejects a session token presented as login state and vice versa", async () => {
    const session = await sealSession(7, secret, 3600);
    expect(await openLoginState(session, secret)).toBeNull();
  });
});
