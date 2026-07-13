import type { Finding } from '../types.js';
import { ansi } from './ansi.js';
import { formatBytes } from './size.js';
import { renderTextTable } from './text-table.js';

function riskColor(risk: Finding['risk']): string {
  switch (risk) {
    case 'low':
      return ansi.green(risk);
    case 'medium':
      return ansi.yellow(risk);
    case 'high':
      return ansi.red(risk);
    default: {
      const _exhaustive: never = risk;
      return _exhaustive;
    }
  }
}

function formatDisplayPath(finding: Finding): string {
  if (finding.kind === 'git-branch') {
    return finding.path;
  }
  if (finding.kind === 'docker-resource') {
    const id = finding.resourceId ?? finding.path;
    return id.length > 40 ? `${id.slice(0, 37)}...` : id;
  }
  const p = finding.path;
  return p.length > 46 ? `...${p.slice(-43)}` : p;
}

export function renderFindingsTable(findings: Finding[]): string {
  return renderTextTable({
    headers: [
      ansi.cyan('Path'),
      ansi.cyan('Size'),
      ansi.cyan('Cleaner'),
      ansi.cyan('Risk'),
    ],
    widths: [48, 12, 18, 10],
    rows: findings.map((finding) => [
      formatDisplayPath(finding),
      formatBytes(finding.sizeBytes),
      finding.cleaner,
      riskColor(finding.risk),
    ]),
  });
}
