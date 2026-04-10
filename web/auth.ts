import NextAuth from 'next-auth';
import Email from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { createTransport } from 'nodemailer';
import { prisma } from './lib/prisma';
import { describeSmtpMode, resolveSmtpServer, type SmtpServerOptions } from './lib/smtpEnv';

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

let loggedSmtpMode = false;

function classifyEmailSendError(err: unknown): string {
  const e = err as NodeJS.ErrnoException & { message?: string };
  const code = e?.code;
  if (code === 'ECONNREFUSED') return 'ECONNREFUSED';
  if (code === 'EAUTH') return 'SMTP_AUTH';
  if (/Invalid login|authentication failed|535|534/i.test(String(e?.message))) return 'SMTP_AUTH';
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'SMTP_TIMEOUT';
  return 'UNKNOWN';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  debug: process.env.AUTH_DEBUG === '1',
  adapter: PrismaAdapter(prisma),
  providers: [
    Email({
      from: process.env.EMAIL_FROM ?? 'no-reply@threadnotion.local',
      server: resolveSmtpServer(),
      async sendVerificationRequest(params) {
        const { identifier, url, provider } = params;
        const { host } = new URL(url);
        const server = provider.server as SmtpServerOptions;

        if (!loggedSmtpMode) {
          loggedSmtpMode = true;
          console.info('[auth:email] Transport:', describeSmtpMode(resolveSmtpServer()));
        }

        try {
          const transport = createTransport(server);
          const result = await transport.sendMail({
            to: identifier,
            from: provider.from,
            subject: `Sign in to ${host}`,
            text: `Sign in to ${host}\n\n${url}\n\nIf you did not request this email, you can ignore it.\n`,
            html: `<p>Sign in to <strong>${host}</strong></p><p><a href="${url}">Sign in</a></p><p>If you did not request this email, you can ignore it.</p>`,
          });
          const rejected = result.rejected || [];
          const pending = result.pending || [];
          const failed = [...rejected, ...pending].filter(Boolean);
          if (failed.length) {
            console.error('[auth:email] Recipients rejected', {
              kind: 'RECIPIENT_REJECTED',
              mode: describeSmtpMode(resolveSmtpServer()),
              failed,
            });
            throw new Error(`Email could not be sent to: ${failed.join(', ')}`);
          }
        } catch (err) {
          const kind = classifyEmailSendError(err);
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[auth:email] Magic link send failed', {
            kind,
            recipientDomain: identifier.includes('@') ? identifier.split('@')[1] : '?',
            mode: describeSmtpMode(resolveSmtpServer()),
            message: msg,
          });
          throw err;
        }
      },
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // @ts-expect-error - added via module augmentation
        session.user.role = user.role;
      }
      return session;
    },
  },
  events: {
    async createUser(message) {
      const email = normalizeEmail(message.user.email);
      if (!email) return;

      const intent = await prisma.signUpIntent.findFirst({
        where: {
          email,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (intent) {
        await prisma.user.update({
          where: { id: message.user.id },
          data: { role: intent.role },
        });
        await prisma.signUpIntent.update({
          where: { id: intent.id },
          data: { consumedAt: new Date() },
        });
      } else {
        // Default for magic-link sign-in without an explicit account creation intent.
        await prisma.user.update({
          where: { id: message.user.id },
          data: { role: 'SALES_REP' },
        });
      }
    },
  },
});
