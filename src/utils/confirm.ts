import enquirer from 'enquirer';
import type { ConfirmDeletionDetails, ConfirmDeletionFn } from '../types.js';
import { formatBytes } from './size.js';

function buildSummary(details: ConfirmDeletionDetails): string {
  let detail = `Found ${formatBytes(details.totalBytes)} of junk across ${details.count} item(s).`;
  if (details.highRiskCount > 0) {
    detail += ` Includes ${details.highRiskCount} high-risk item(s).`;
  } else if (details.mediumRiskCount > 0) {
    detail += ` Includes ${details.mediumRiskCount} medium-risk item(s).`;
  }
  return detail;
}

/** Interactive confirmation for CLI use. High-risk batches require typing DELETE. */
export function createInteractiveConfirm(): ConfirmDeletionFn {
  return async (details) => {
    const summary = buildSummary(details);

    try {
      if (details.highRiskCount > 0) {
        const response = await enquirer.prompt<{ typed: string }>({
          type: 'input',
          name: 'typed',
          message: `${summary} Type DELETE to confirm high-risk cleanup:`,
        });
        return response.typed.trim() === 'DELETE';
      }

      const response = await enquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message: `${summary} Delete?`,
        initial: false,
      });
      return response.confirm === true;
    } catch {
      return false;
    }
  };
}
