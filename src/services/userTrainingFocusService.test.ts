import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../db', () => ({
  prisma: {
    userTrainingFocus: {
      findUnique: hoisted.findUnique,
      update: hoisted.update,
    },
  },
}));

import { decrementTrainingFocusSessionIfAny } from './userTrainingFocusService';

describe('decrementTrainingFocusSessionIfAny', () => {
  beforeEach(() => {
    hoisted.findUnique.mockReset();
    hoisted.update.mockReset();
  });

  it('does nothing when no row or sessionsRemaining null', async () => {
    hoisted.findUnique.mockResolvedValue(null);
    await decrementTrainingFocusSessionIfAny('u1');
    expect(hoisted.update).not.toHaveBeenCalled();

    hoisted.findUnique.mockResolvedValue({
      userId: 'u1',
      sessionsRemaining: null,
    });
    await decrementTrainingFocusSessionIfAny('u1');
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it('decrements when sessionsRemaining > 0', async () => {
    hoisted.findUnique.mockResolvedValue({
      userId: 'u1',
      sessionsRemaining: 3,
    });
    await decrementTrainingFocusSessionIfAny('u1');
    expect(hoisted.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { sessionsRemaining: 2 },
    });
  });

  it('does nothing when sessionsRemaining is 0', async () => {
    hoisted.findUnique.mockResolvedValue({
      userId: 'u1',
      sessionsRemaining: 0,
    });
    await decrementTrainingFocusSessionIfAny('u1');
    expect(hoisted.update).not.toHaveBeenCalled();
  });
});
