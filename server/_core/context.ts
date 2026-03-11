import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function isAuthDisabled() {
  const authMode = (process.env.AUTH_MODE ?? "").toLowerCase();
  if (authMode === "disabled") return true;
  if (authMode === "enabled") return false;

  if (process.env.DISABLE_AUTH === "true") return true;
  if (process.env.DISABLE_AUTH === "false") return false;

  // Explicit app environment switch for hosted test/staging deployments.
  if ((process.env.APP_ENV ?? "").toLowerCase() === "test") return true;

  return process.env.NODE_ENV === "development";
}

function getLocalDevUser(): User {
  const now = new Date();
  return {
    id: 0,
    openId: "local-dev-user",
    name: "Local Dev",
    email: null,
    loginMethod: "local",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (isAuthDisabled()) {
    user = getLocalDevUser();
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
