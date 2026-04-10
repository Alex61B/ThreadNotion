import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readSmtpEnvVars, resolveSmtpServer } from './smtpEnv';

const KEYS = [
  'EMAIL_SERVER_HOST',
  'EMAIL_SERVER_PORT',
  'EMAIL_SERVER_USER',
  'EMAIL_SERVER_PASSWORD',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

function clearSmtpEnv() {
  for (const k of KEYS) {
    delete process.env[k];
  }
}

describe('smtpEnv', () => {
  beforeEach(() => {
    clearSmtpEnv();
  });

  afterEach(() => {
    clearSmtpEnv();
  });

  it('uses dev default when no host is set', () => {
    expect(resolveSmtpServer()).toEqual({ host: 'localhost', port: 1025 });
  });

  it('prefers EMAIL_SERVER_* over SMTP_* for host', () => {
    process.env.EMAIL_SERVER_HOST = 'email.example.com';
    process.env.SMTP_HOST = 'smtp.legacy.com';
    process.env.EMAIL_SERVER_USER = 'u';
    process.env.EMAIL_SERVER_PASSWORD = 'p';
    expect(resolveSmtpServer().host).toBe('email.example.com');
  });

  it('uses SMTP_* when EMAIL_SERVER_* host is absent', () => {
    process.env.SMTP_HOST = 'smtp.legacy.com';
    process.env.SMTP_USER = 'legacy';
    process.env.SMTP_PASS = 'secret';
    const s = resolveSmtpServer();
    expect(s).toMatchObject({
      host: 'smtp.legacy.com',
      auth: { user: 'legacy', pass: 'secret' },
    });
  });

  it('authenticates when host, user, and pass are set via EMAIL_SERVER_*', () => {
    process.env.EMAIL_SERVER_HOST = 'smtp.sendgrid.net';
    process.env.EMAIL_SERVER_PORT = '587';
    process.env.EMAIL_SERVER_USER = 'apikey';
    process.env.EMAIL_SERVER_PASSWORD = 'sg.xxx';
    expect(resolveSmtpServer()).toEqual({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: 'sg.xxx' },
    });
  });

  it('sets secure when port is 465', () => {
    process.env.EMAIL_SERVER_HOST = 'smtp.example.com';
    process.env.EMAIL_SERVER_PORT = '465';
    process.env.EMAIL_SERVER_USER = 'u';
    process.env.EMAIL_SERVER_PASSWORD = 'p';
    expect(resolveSmtpServer().secure).toBe(true);
  });

  it('returns host without auth when only host is set', () => {
    process.env.EMAIL_SERVER_HOST = '127.0.0.1';
    process.env.EMAIL_SERVER_PORT = '1025';
    const s = resolveSmtpServer();
    expect(s.host).toBe('127.0.0.1');
    expect(s.port).toBe(1025);
    expect(s.auth).toBeUndefined();
  });

  it('readSmtpEnvVars trims whitespace', () => {
    process.env.EMAIL_SERVER_HOST = '  smtp.test  ';
    process.env.EMAIL_SERVER_USER = '  u  ';
    process.env.EMAIL_SERVER_PASSWORD = '  p  ';
    const v = readSmtpEnvVars();
    expect(v.host).toBe('smtp.test');
    expect(v.user).toBe('u');
    expect(v.pass).toBe('p');
  });
});
