import Link from "next/link";
import { signup } from "@/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-foreground">Create an account</h1>
        <p className="mb-6 text-sm text-foreground-muted">
          Get started hosting mail on your own domains.
        </p>
        <AuthForm action={signup} submitLabel="Sign up" />
        <p className="mt-6 text-center text-sm text-foreground-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
