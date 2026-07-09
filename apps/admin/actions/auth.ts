"use server";

import { signOut } from "@repo/auth";

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
