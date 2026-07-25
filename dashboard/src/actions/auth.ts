"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/models/User";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";

export type AuthFormState = { error: string } | null;

type ValidatedCredentials =
  | { ok: false; error: string }
  | { ok: true; emailStr: string; passwordStr: string };

function validateCredentials(
  email: FormDataEntryValue | null,
  password: FormDataEntryValue | null
): ValidatedCredentials {
  const emailStr = String(email ?? "").trim().toLowerCase();
  const passwordStr = String(password ?? "");

  if (!emailStr || !emailStr.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (passwordStr.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  return { ok: true, emailStr, passwordStr };
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = validateCredentials(formData.get("email"), formData.get("password"));
  if (!validated.ok) return { error: validated.error };
  const { emailStr, passwordStr } = validated;

  await connectDb();

  const existing = await UserModel.findOne({ email: emailStr });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(passwordStr, 12);
  const user = await UserModel.create({ email: emailStr, passwordHash });

  await setSessionCookie({ userId: user._id.toString(), email: user.email });
  redirect("/domains");
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = validateCredentials(formData.get("email"), formData.get("password"));
  if (!validated.ok) return { error: validated.error };
  const { emailStr, passwordStr } = validated;

  await connectDb();

  const user = await UserModel.findOne({ email: emailStr });
  if (!user) {
    return { error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(passwordStr, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await setSessionCookie({ userId: user._id.toString(), email: user.email });
  redirect("/domains");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
