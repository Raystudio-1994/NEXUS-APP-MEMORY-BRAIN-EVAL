import { spawn } from 'child_process';
import { extractSemanticMemories } from '../memoryService';

export function captureCommand(cmd: string, args: string[], cwd = process.cwd()): Promise<{ exit_code: number, stdout: string }> {
  return new Promise(resolve => {
    // Join cmd and args if spawned in shell mode, or run spawn safely
    const fullCmd = args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd;
    const proc = spawn(fullCmd, [], { cwd, shell: true });
    
    let out = '';
    proc.stdout?.on('data', d => { out += d.toString(); });
    proc.stderr?.on('data', d => { out += d.toString(); });
    
    proc.on('close', async (code) => {
      const exit_code = code ?? 0;
      const text = `PTY: \`${fullCmd}\` exit_code=${exit_code} in ${cwd}\nstdout:\n${out.slice(0, 1500)}`;
      try {
        await extractSemanticMemories(text, 'terminal');
      } catch (err) {
        console.warn('[PTY] Failed to extract semantic memories:', err);
      }
      resolve({ exit_code, stdout: out });
    });
  });
}

export function installPtyHook() {
  if (process.env.NEXUS_PTY_HOOK !== '1') return;
  console.log('[Sensors] PTY hook enabled');
}
