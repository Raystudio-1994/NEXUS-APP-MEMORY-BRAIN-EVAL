import fs from 'fs';
import path from 'path';
import { ScoringWeights, defaultWeights } from '../apex/weights';

export interface PromptVersion {
  version: string;
  created_at: string;
  templates: {
    L0: string;
    L1: string;
    L2: string;
    L3: string;
    [key: string]: string;
  };
  weights: ScoringWeights;
  eval_score: {
    recall_at_5: number;
    token_density: number;
  };
  author: string;
}

export interface PromptRegistry {
  active_version: string;
  versions: PromptVersion[];
}

const REGISTRY_PATH = path.resolve(process.cwd(), 'prompts/registry.json');
const TEMPLATES_DIR = path.resolve(process.cwd(), 'prompts/templates');

/**
 * Reads the prompt registry from prompts/registry.json.
 */
export function getPromptRegistry(): PromptRegistry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`Registry file not found at ${REGISTRY_PATH}`);
  }
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(raw) as PromptRegistry;
}

/**
 * Saves updated registry to disk.
 */
export function savePromptRegistry(registry: PromptRegistry): void {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

/**
 * Returns the currently active prompt version.
 */
export function getActivePrompt(): PromptVersion {
  const registry = getPromptRegistry();
  const active = registry.versions.find(v => v.version === registry.active_version);
  if (!active) {
    return registry.versions[registry.versions.length - 1];
  }
  return active;
}

/**
 * Parses semver string like "v1.0.0" and auto-increments minor: "v1.1.0".
 */
export function incrementMinorSemver(versionStr: string): string {
  const cleaned = versionStr.replace(/^v/, '');
  const parts = cleaned.split('.').map(p => parseInt(p, 10));
  const major = isNaN(parts[0]) ? 1 : parts[0];
  const minor = isNaN(parts[1]) ? 0 : parts[1] + 1;
  const patch = 0;
  return `v${major}.${minor}.${patch}`;
}

/**
 * Creates and publishes a new prompt version with auto-incremented semver minor.
 */
export function createVersion(
  newTemplates: Partial<PromptVersion['templates']>,
  newWeights?: ScoringWeights,
  evalScore: { recall_at_5: number; token_density: number } = { recall_at_5: 0, token_density: 0 },
  author: string = 'system'
): PromptVersion {
  const registry = getPromptRegistry();
  const latestVersion = registry.versions[registry.versions.length - 1];
  const nextVersionStr = incrementMinorSemver(latestVersion ? latestVersion.version : 'v1.0.0');

  const baseTemplates = latestVersion ? latestVersion.templates : {
    L0: '',
    L1: '',
    L2: '',
    L3: ''
  };

  const newEntry: PromptVersion = {
    version: nextVersionStr,
    created_at: new Date().toISOString(),
    templates: {
      L0: newTemplates.L0 ?? baseTemplates.L0 ?? '',
      L1: newTemplates.L1 ?? baseTemplates.L1 ?? '',
      L2: newTemplates.L2 ?? baseTemplates.L2 ?? '',
      L3: newTemplates.L3 ?? baseTemplates.L3 ?? '',
      ...(Object.fromEntries(
        Object.entries(newTemplates).filter(([_, v]) => typeof v === 'string')
      ) as Record<string, string>)
    },
    weights: newWeights ? { ...newWeights } : (latestVersion ? { ...latestVersion.weights } : { ...defaultWeights }),
    eval_score: evalScore,
    author
  };

  registry.versions.push(newEntry);
  registry.active_version = nextVersionStr;
  savePromptRegistry(registry);

  // Sync templates directory
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TEMPLATES_DIR, 'L0.txt'), newEntry.templates.L0, 'utf8');
    fs.writeFileSync(path.join(TEMPLATES_DIR, 'L1.md'), newEntry.templates.L1, 'utf8');
    fs.writeFileSync(path.join(TEMPLATES_DIR, 'L2.txt'), newEntry.templates.L2, 'utf8');
    fs.writeFileSync(path.join(TEMPLATES_DIR, 'L3.xml'), newEntry.templates.L3, 'utf8');
  } catch (err) {
    console.warn('Failed syncing templates folder:', err);
  }

  return newEntry;
}

/**
 * Explicitly sets the active prompt version.
 */
export function setActive(version: string): PromptVersion {
  const registry = getPromptRegistry();
  const found = registry.versions.find(v => v.version === version);
  if (!found) {
    throw new Error(`Prompt version ${version} not found in registry.`);
  }

  registry.active_version = version;
  savePromptRegistry(registry);
  return found;
}

/**
 * Auto-reverts to the highest-scoring previous version when regression occurs.
 */
export function autoRevert(): { reverted_to: string; previous: string; reason: string } {
  const registry = getPromptRegistry();
  const currentActive = registry.active_version;

  // Filter previous versions excluding the current problematic one
  const candidates = registry.versions.filter(v => v.version !== currentActive);
  if (candidates.length === 0) {
    return {
      reverted_to: currentActive,
      previous: currentActive,
      reason: 'No alternative prior versions available in registry.'
    };
  }

  // Sort by highest recall_at_5
  candidates.sort((a, b) => (b.eval_score?.recall_at_5 ?? 0) - (a.eval_score?.recall_at_5 ?? 0));
  const bestPrior = candidates[0];

  registry.active_version = bestPrior.version;
  savePromptRegistry(registry);

  return {
    reverted_to: bestPrior.version,
    previous: currentActive,
    reason: `Prompt regression detected. Reverted from ${currentActive} to highest-scoring benchmark ${bestPrior.version} (recall: ${bestPrior.eval_score?.recall_at_5 ?? 'n/a'}).`
  };
}

/**
 * Lightweight template renderer for L0, L1, L2, L3 using mustache-like syntax.
 */
export function renderTemplate(templateLevel: 'L0' | 'L1' | 'L2' | 'L3', capsule: any): string {
  const activePrompt = getActivePrompt();
  let template = activePrompt.templates[templateLevel] || activePrompt.templates['L1'] || '';

  // Simple string interpolations
  template = template.replace(/\{\{query\}\}/g, capsule.query || '');
  template = template.replace(/\{\{timestamp\}\}/g, capsule.timestamp || '');
  template = template.replace(/\{\{token_budget\}\}/g, String(capsule.token_budget || 1500));
  template = template.replace(/\{\{tokens_used\}\}/g, String(capsule.tokens_used || 0));

  // Current knowledge block
  const ckRegex = /\{\{#current_knowledge\}\}([\s\S]*?)\{\{\/current_knowledge\}\}/g;
  template = template.replace(ckRegex, (_, inner) => {
    const list = capsule.current_knowledge || [];
    return list.map((item: any) => {
      let line = inner;
      line = line.replace(/\{\{id\}\}/g, item.id || '');
      line = line.replace(/\{\{statement\}\}/g, item.statement || '');
      line = line.replace(/\{\{tier\}\}/g, String(item.tier || 2));
      line = line.replace(/\{\{tier_name\}\}/g, item.tier === 2 ? 'episodic' : 'semantic');
      line = line.replace(/\{\{confidence\}\}/g, String(Math.round((item.score || 0.95) * 100)));
      return line;
    }).join('');
  });

  // Active decisions block
  const adRegex = /\{\{#active_decisions\}\}([\s\S]*?)\{\{\/active_decisions\}\}/g;
  template = template.replace(adRegex, (_, inner) => {
    const list = capsule.active_decisions || [];
    return list.map((item: any) => {
      let line = inner;
      line = line.replace(/\{\{id\}\}/g, item.id || '');
      line = line.replace(/\{\{decision\}\}/g, item.decision || '');
      line = line.replace(/\{\{confidence\}\}/g, String(Math.round((item.confidence || 0.9) * 100)));
      return line;
    }).join('');
  });

  // Relevant procedures block
  const rpRegex = /\{\{#relevant_procedures\}\}([\s\S]*?)\{\{\/relevant_procedures\}\}/g;
  template = template.replace(rpRegex, (_, inner) => {
    const list = capsule.relevant_procedures || [];
    return list.map((item: any) => {
      let line = inner;
      line = line.replace(/\{\{id\}\}/g, item.id || '');
      line = line.replace(/\{\{instruction\}\}/g, item.instruction || '');
      return line;
    }).join('');
  });

  // Working context block
  const wcRegex = /\{\{#working_context\}\}([\s\S]*?)\{\{\/working_context\}\}/g;
  template = template.replace(wcRegex, (_, inner) => {
    const list = capsule.working_context || [];
    return list.map((item: any) => {
      let line = inner;
      line = line.replace(/\{\{id\}\}/g, item.id || '');
      line = line.replace(/\{\{statement\}\}/g, item.statement || '');
      return line;
    }).join('');
  });

  return template;
}
