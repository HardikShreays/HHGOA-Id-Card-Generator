// lib/builderTitle.ts
// Deterministic-but-fun "builder title" generator for Format B (plan §4 Phase 3).
// Pure keyword matching against the user's stack/role string + a random pick
// from the matched pool. No API call, so it's instant and stays in the
// client-only rendering path.

type TitlePool = {
  /** Lowercase keywords checked against the user's input (substring match). */
  keywords: string[];
  titles: string[];
};

const POOLS: TitlePool[] = [
  {
    keywords: ["ai", "ml", "machine learning", "llm", "genai", "gen ai", "deep learning", "nlp"],
    titles: [
      "Prompt Whisperer",
      "Neural Net Wrangler",
      "Model Whisperer",
      "Gradient Descender",
      "Token Economist",
      "Hallucination Hunter",
      "Vector Space Cadet",
      "Inference Instigator",
    ],
  },
  {
    keywords: ["backend", "server", "api", "database", "db", "infra", "infrastructure", "devops", "sre"],
    titles: [
      "Backend Alchemist",
      "API Architect",
      "Query Tamer",
      "Uptime Guardian",
      "Latency Slayer",
      "Server Whisperer",
      "Pipeline Plumber",
    ],
  },
  {
    keywords: ["frontend", "front-end", "ui", "ux", "react", "design", "css"],
    titles: [
      "Pixel Perfectionist",
      "UI Sorcerer",
      "CSS Whisperer",
      "Component Curator",
      "Interface Illusionist",
    ],
  },
  {
    keywords: ["fullstack", "full-stack", "full stack"],
    titles: [
      "Full-Stack Chaos Agent",
      "End-to-End Enthusiast",
      "Stack Overflow Survivor",
      "Jack of All Layers",
    ],
  },
  {
    keywords: ["mobile", "ios", "android", "flutter", "react native"],
    titles: ["Pocket App Prophet", "Mobile Menace", "Swipe-Right Engineer"],
  },
  {
    keywords: ["blockchain", "web3", "crypto", "smart contract", "solidity"],
    titles: ["Chain Whisperer", "Gas Fee Gambler", "Decentralized Dreamer"],
  },
  {
    keywords: ["security", "cyber", "pentest", "infosec"],
    titles: ["Bug Bounty Hunter", "Firewall Philosopher", "Exploit Exorcist"],
  },
  {
    keywords: ["data", "analytics", "dashboard", "bi"],
    titles: ["Dashboard Druid", "Data Diviner", "Metric Mercenary"],
  },
  {
    keywords: ["product", "pm", "design"],
    titles: ["Roadmap Renegade", "Feature Fortune-Teller", "Scope Creep Slayer"],
  },
  {
    keywords: ["design", "designer"],
    titles: ["Pixel Poet", "Figma Fanatic"],
  },
];

const FALLBACK_TITLES = [
  "Full-Stack Chaos Agent",
  "Bug Whisperer",
  "Ship-It Specialist",
  "Coffee-to-Code Converter",
  "Late Night Committer",
  "Merge Conflict Survivor",
  "Hackathon Gremlin",
  "Builder-in-Residence",
];

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generates a punchy "builder title" from a free-text stack/role string.
 * Matches keywords case-insensitively; falls back to a generic pool if
 * nothing matches (or the input is empty).
 */
export function generateBuilderTitle(stackOrRole: string): string {
  const input = stackOrRole.trim().toLowerCase();

  if (!input) {
    return pick(FALLBACK_TITLES);
  }

  const matchedPools = POOLS.filter((pool) =>
    pool.keywords.some((kw) => input.includes(kw))
  );

  if (matchedPools.length === 0) {
    return pick(FALLBACK_TITLES);
  }

  // If multiple pools match (e.g. "AI backend engineer"), pool all their
  // titles together so the result can reflect either facet.
  const combined = matchedPools.flatMap((p) => p.titles);
  return pick(combined);
}
