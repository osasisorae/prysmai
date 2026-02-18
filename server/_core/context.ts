import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyCustomSession, getUserById } from "../customAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. Try custom email/password auth first (prysm_session cookie)
  try {
    const customToken = opts.req.cookies?.prysm_session;
    if (customToken) {
      const session = await verifyCustomSession(customToken);
      if (session) {
        const dbUser = await getUserById(session.userId);
        if (dbUser) {
          user = dbUser;
        }
      }
    }
  } catch {
    // Custom auth failed, try Manus OAuth below
  }

  // 2. Fall back to Manus OAuth (for admin/owner access)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
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
