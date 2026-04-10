/**
 * Resolves SMTP settings for Auth.js Email (Nodemailer) provider.
 * Prefers EMAIL_SERVER_* (Auth.js-style) then falls back to SMTP_*.
 */

export type SmtpServerOptions = {
  host: string;
  port: number;
  auth?: { user: string; pass: string };
  secure?: boolean;
};

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t || undefined;
}

/**
 * Reads host/user/password/port from environment.
 * Exported for tests.
 */
export function readSmtpEnvVars(): {
  host?: string;
  port: number;
  user?: string;
  pass?: string;
} {
  const host = trim(process.env.EMAIL_SERVER_HOST) ?? trim(process.env.SMTP_HOST);
  const portRaw = process.env.EMAIL_SERVER_PORT ?? process.env.SMTP_PORT;
  const port = portRaw ? Number(portRaw) : 587;
  const user = trim(process.env.EMAIL_SERVER_USER) ?? trim(process.env.SMTP_USER);
  const pass = trim(process.env.EMAIL_SERVER_PASSWORD) ?? trim(process.env.SMTP_PASS);
  return { host, port: Number.isFinite(port) ? port : 587, user, pass };
}

/**
 * Nodemailer transport options for magic-link email.
 * - Full credentials → authenticated SMTP.
 * - Host only → no auth (local Mailpit/Mailhog or open relay).
 * - Nothing → dev default localhost:1025 (Mailpit default SMTP).
 */
export function resolveSmtpServer(): SmtpServerOptions {
  const { host, port, user, pass } = readSmtpEnvVars();
  const secure = port === 465;

  if (host && user && pass) {
    return { host, port, secure, auth: { user, pass } };
  }
  if (host) {
    return { host, port, secure };
  }
  return { host: 'localhost', port: 1025 };
}

/** Human-readable mode for logs (no secrets). */
export function describeSmtpMode(server: SmtpServerOptions): string {
  const auth = server.auth ? 'authenticated' : 'no-auth';
  if (server.host === 'localhost' && server.port === 1025 && !server.auth) {
    return `dev_default (${server.host}:${server.port}, ${auth}) — use Mailpit/Mailhog or set EMAIL_SERVER_* / SMTP_*`;
  }
  return `smtp (${server.host}:${server.port}, ${auth})`;
}
