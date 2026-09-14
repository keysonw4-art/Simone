import type { DefaultSession } from "next-auth";
import type { Role } from "@repo/database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    sessionVersion: number;
    authTime: number;
  }
}
