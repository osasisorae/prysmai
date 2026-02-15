import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { addWaitlistSignup, getWaitlistCount, getWaitlistSignups } from "./db";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { sendWaitlistConfirmation } from "./email";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  waitlist: router({
    join: publicProcedure
      .input(z.object({
        email: z.string().email(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await addWaitlistSignup(input.email, input.source ?? "landing_page");
        
        // Notify the owner and send confirmation email for new signups
        if (!result.alreadyExists) {
          const count = await getWaitlistCount();
          
          // Send confirmation email (fire-and-forget, don't block the response)
          sendWaitlistConfirmation(input.email).catch((err) =>
            console.error("[Email] Background send failed:", err)
          );

          await notifyOwner({
            title: `New Waitlist Signup (#${count})`,
            content: `${input.email} just joined the Prysm AI waitlist from ${input.source ?? "landing_page"}. Total signups: ${count}`,
          });
        }

        return result;
      }),

    count: publicProcedure.query(async () => {
      return { count: await getWaitlistCount() };
    }),

    list: adminProcedure.query(async () => {
      return await getWaitlistSignups();
    }),
  }),
});

export type AppRouter = typeof appRouter;
