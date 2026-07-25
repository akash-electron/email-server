import Link from "next/link";
import { logout } from "@/actions/auth";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/domains" className="font-semibold text-foreground">
            Mail Platform
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground-muted">{session?.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition hover:bg-surface-hover"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
