import Link from "next/link";
import { login } from "@/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-foreground">Log in</h1>
        <p className="mb-6 text-sm text-foreground-muted">
          Manage your mail domains and mailboxes.
        </p>
        <AuthForm action={login} submitLabel="Log in" />
        <p className="mt-6 text-center text-sm text-foreground-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-hover">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
