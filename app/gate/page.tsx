import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

// Shared-password gate shown before anything else on the hosted demo. One
// password for everyone — which role you act as is the in-app demo
// role-switcher's job, not the gate's. Not a substitute for real auth; role
// checks still run server-side.
export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = callbackUrl || "/";

  async function unlock(formData: FormData) {
    "use server";
    const expected = process.env.DEMO_PASSWORD;
    const given = String(formData.get("password") ?? "");
    const target = String(formData.get("callbackUrl") ?? "/");
    if (!expected || given !== expected) {
      redirect(`/gate?error=1&callbackUrl=${encodeURIComponent(target)}`);
    }
    const store = await cookies();
    store.set(GATE_COOKIE, await gateToken(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(target);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-sand p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="bg-brand-deep px-6 py-5">
          <h1 className="font-heading text-lg font-semibold text-white">H-Fleet</h1>
          <p className="mt-1 text-sm text-white/80">Private demo — enter the access password</p>
        </div>
        <form action={unlock} className="space-y-3 p-6">
          <input type="hidden" name="callbackUrl" value={redirectTo} />
          <input
            type="password"
            name="password"
            autoFocus
            placeholder="Access password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            aria-label="Access password"
          />
          {error && <p className="text-xs text-rose-600">Wrong password — try again.</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-mid px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
