import { describe, expect, it, vi } from 'vitest';

vi.mock('enquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

describe('createInteractiveConfirm', () => {
  it('returns true when user confirms', async () => {
    const enquirer = await import('enquirer');
    vi.mocked(enquirer.default.prompt).mockResolvedValue({ confirm: true });

    const { createInteractiveConfirm } = await import('../src/utils/confirm.js');
    const confirm = createInteractiveConfirm();
    const result = await confirm({ totalBytes: 1024, count: 2, mediumRiskCount: 1, highRiskCount: 0 });

    expect(result).toBe(true);
  });

  it('requires DELETE for high-risk batches', async () => {
    const enquirer = await import('enquirer');
    vi.mocked(enquirer.default.prompt).mockResolvedValue({ typed: 'DELETE' });

    const { createInteractiveConfirm } = await import('../src/utils/confirm.js');
    const confirm = createInteractiveConfirm();
    const result = await confirm({ totalBytes: 0, count: 1, mediumRiskCount: 0, highRiskCount: 1 });

    expect(result).toBe(true);
  });

  it('returns false when prompt fails', async () => {
    const enquirer = await import('enquirer');
    vi.mocked(enquirer.default.prompt).mockRejectedValue(new Error('no tty'));

    const { createInteractiveConfirm } = await import('../src/utils/confirm.js');
    const confirm = createInteractiveConfirm();
    const result = await confirm({ totalBytes: 0, count: 0, mediumRiskCount: 0, highRiskCount: 0 });

    expect(result).toBe(false);
  });
});
