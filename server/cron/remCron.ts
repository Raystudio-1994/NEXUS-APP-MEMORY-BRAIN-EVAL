import cron from 'node-cron';
import { rem_nightly_consolidation_pipeline } from '../consolidation';

/**
 * Boots the REM Nightly Auto-Synthesis CRON service.
 * Respects NEXUS_CONSOLIDATION toggle and NEXUS_CONSOLIDATION_INTERVAL settings.
 */
export function startRemCron() {
  const isEnabled = process.env.NEXUS_CONSOLIDATION !== '0';
  if (!isEnabled) {
    console.log('REM Nightly consolidation service is disabled (NEXUS_CONSOLIDATION=0).');
    return;
  }

  const intervalSeconds = parseInt(process.env.NEXUS_CONSOLIDATION_INTERVAL || '3600', 10);
  
  if (intervalSeconds < 86400) {
    console.log(`REM consolidation background runner started, checking every ${intervalSeconds} seconds.`);
    // Run background interval
    setInterval(async () => {
      try {
        await rem_nightly_consolidation_pipeline();
      } catch (err) {
        console.error('Error running background REM consolidation pipeline:', err);
      }
    }, intervalSeconds * 1000);
  } else {
    console.log('REM consolidation runner scheduled as a standard nightly CRON job at 3:00 AM.');
    // Schedule cron for 3 AM daily
    cron.schedule('0 3 * * *', async () => {
      try {
        await rem_nightly_consolidation_pipeline();
      } catch (err) {
        console.error('Error running scheduled REM consolidation cron:', err);
      }
    });
  }
}
