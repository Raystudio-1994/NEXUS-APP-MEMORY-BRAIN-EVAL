import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getActivePrompt, autoRevert } from '../prompts/registry';
import { runEvalHarness } from '../eval/harness';

const VAULT_DAILY_DIR = path.resolve(process.cwd(), 'vault/Daily');

/**
 * Appends an incident note to the Daily log in the Obsidian vault.
 */
function logRegressionIncidentToVault(
  activeVersion: string,
  revertedVersion: string,
  baselineScore: number,
  currentScore: number,
  reason: string
): void {
  try {
    if (!fs.existsSync(VAULT_DAILY_DIR)) {
      fs.mkdirSync(VAULT_DAILY_DIR, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(VAULT_DAILY_DIR, `${today}.md`);
    const timestamp = new Date().toISOString();

    const entry = `
### ⚠️ [PROMPT-CHASING-REGRESSION] Auto-Revert Triggered at ${timestamp}
- **Faulty Version**: \`${activeVersion}\`
- **Baseline Recall@5**: \`${baselineScore.toFixed(4)}\`
- **Observed Recall@5**: \`${currentScore.toFixed(4)}\` (Drop: \`${((baselineScore - currentScore) * 100).toFixed(1)}%\`)
- **Action Taken**: Auto-reverted active prompt version to \`${revertedVersion}\`
- **Details**: ${reason}
`;

    fs.appendFileSync(logFile, entry, 'utf8');
  } catch (err) {
    console.error('Failed writing prompt regression note to vault:', err);
  }
}

/**
 * Checks for prompt regression and triggers auto-revert if recall drops > 5%.
 */
export async function checkPromptRegression(): Promise<{
  status: 'passed' | 'reverted';
  active_version: string;
  baseline_recall: number;
  current_recall: number;
  revert_info?: any;
}> {
  const active = getActivePrompt();
  const baselineRecall = active.eval_score?.recall_at_5 ?? 0.10;

  // Run evaluation harness against active weights
  const evalResult = await runEvalHarness(active.weights, active.version);
  const currentRecall = evalResult.avg_recall_at_5;

  // If regression is greater than 5 percentage points (0.05)
  if (currentRecall < baselineRecall - 0.05) {
    console.warn(`[PromptChasing] Regression detected on ${active.version}: drop from ${baselineRecall} to ${currentRecall}`);
    const revertResult = autoRevert();
    logRegressionIncidentToVault(
      active.version,
      revertResult.reverted_to,
      baselineRecall,
      currentRecall,
      revertResult.reason
    );
    return {
      status: 'reverted',
      active_version: revertResult.reverted_to,
      baseline_recall: baselineRecall,
      current_recall: currentRecall,
      revert_info: revertResult
    };
  }

  return {
    status: 'passed',
    active_version: active.version,
    baseline_recall: baselineRecall,
    current_recall: currentRecall
  };
}

/**
 * Starts prompt chasing cron scheduled at 3:00 AM nightly.
 */
export function startPromptChasingCron(): void {
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('Running nightly Prompt-Chasing regression audit at 3:00 AM...');
      await checkPromptRegression();
    } catch (err) {
      console.error('Prompt chasing cron error:', err);
    }
  });
}
