import { describe, expect, it } from 'vitest';
import { renderFindingsTable } from '../src/utils/table.js';
import type { Finding } from '../src/types.js';
import { pathFinding } from './helpers.js';

describe('renderFindingsTable', () => {
  it('renders path findings', () => {
    const findings: Finding[] = [
      {
        kind: 'path',
        cleaner: 'node-modules',
        path: '/proj/node_modules',
        sizeBytes: 1024,
        risk: 'low',
        description: 'test',
      },
    ];
    const table = renderFindingsTable(findings);
    expect(table).toContain('node-modules');
    expect(table).toContain('1.0 KB');
  });

  it('renders git and docker findings', () => {
    const findings: Finding[] = [
      {
        kind: 'git-branch',
        cleaner: 'git-stale-branches',
        path: '/repo :: feature-old',
        sizeBytes: 0,
        risk: 'high',
        description: 'branch',
      },
      {
        kind: 'docker-resource',
        cleaner: 'docker-resources',
        path: 'image:abc123',
        sizeBytes: 0,
        risk: 'medium',
        description: 'image',
        dockerType: 'image',
        resourceId: 'abc123def456789012345678901234567890',
      },
    ];
    const table = renderFindingsTable(findings);
    expect(table).toContain('git-stale-branc');
    expect(table).toContain('docker-resources');
  });

  it('renders high risk findings', () => {
    const table = renderFindingsTable([
      pathFinding({
        cleaner: 'git-stale-branches',
        path: 'repo :: feature',
        sizeBytes: 0,
        risk: 'high',
        description: 'branch',
      }),
    ]);
    expect(table).toContain('high');
  });

  it('truncates very long filesystem paths', () => {
    const longPath = `/tmp/${'a'.repeat(60)}/node_modules`;
    const table = renderFindingsTable([
      pathFinding({
        cleaner: 'node-modules',
        path: longPath,
        sizeBytes: 10,
        risk: 'low',
        description: 'deps',
      }),
    ]);
    expect(table).toContain('...');
  });
});
