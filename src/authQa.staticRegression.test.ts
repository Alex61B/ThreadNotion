import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readRel(pathFromRepoRoot: string): string {
  return readFileSync(resolve(process.cwd(), pathFromRepoRoot), 'utf8');
}

function expectSessionDerivedActingIdentity(routeSource: string) {
  // Must require session
  expect(routeSource).toContain('await auth()');
  // Any client-provided userId must NOT be used as acting identity; allow reading it only as a value passed into deriveActingUserId().
  expect(routeSource).not.toContain("const userId = searchParams.get('userId')");
}

describe('auth QA: static regression guards', () => {
  it('self-service proxies derive acting user from session (not client userId)', () => {
    const files = [
      'web/app/api/user-progress/route.ts',
      'web/app/api/conversations/route.ts',
      'web/app/api/training-focus/route.ts',
      'web/app/api/training-assignments/route.ts',
      'web/app/api/user-training-analytics/route.ts',
      'web/app/api/training-recommendation/route.ts',
      'web/app/api/weakness-profile/route.ts',
      'web/app/api/chat/route.ts',
      'web/app/api/feedback/route.ts',
      'web/app/api/teams/route.ts',
    ];

    for (const f of files) {
      const s = readRel(f);
      expectSessionDerivedActingIdentity(s);
    }
  });

  it('team member-progress keeps memberUserId explicit and derives acting user from session', () => {
    const s = readRel('web/app/api/team/[teamId]/member-progress/route.ts');
    expectSessionDerivedActingIdentity(s);
    expect(s).toContain("searchParams.get('memberUserId')");
    expect(s).toContain('memberUserId');
  });

  it('middleware keeps auth pages public and redirects otherwise', () => {
    const s = readRel('web/middleware.ts');
    expect(s).toContain("'/auth/signin'");
    expect(s).toContain("'/auth/register'");
    expect(s).toContain("pathname.startsWith('/api/auth')");
    expect(s).toContain('NextResponse.redirect');
  });
});

