export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export interface ProjectImage {
  /** Inline (downsized) source. */
  src: string;
  /** Optional full-resolution source shown in the lightbox. */
  fullSrc?: string;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
}

export interface Project {
  slug: string;
  title: string;
  date: string;
  inProgress?: boolean;
  description: string;
  tech: string[];
  highlights: string[];
  content: ContentBlock[];
  /** Optional figures rendered in their own section on the detail page. */
  images?: ProjectImage[];
}

export const projects: Project[] = [
  {
    slug: 'finguardmy',
    title: 'FinGuardMY',
    date: '2026-02',
    inProgress: false,
    description: 'An AI backend for Malaysian financial crime investigators: a streaming RAG chatbot grounded in AMLA statutes and case precedents, an agentic case-report generator, and an admin plane with audit logs, retrieval analytics, and automated RAG evaluation.',
    tech: ['FastAPI', 'Python', 'MySQL', 'Pinecone', 'LangChain', 'Ollama', 'Keycloak', 'Valkey', 'RQ', 'Ragas', 'Cloudflare R2', 'Docker'],
    images: [
      {
        src: '/projects/finguardmy-architecture-1600.webp',
        fullSrc: '/projects/finguardmy-architecture.webp',
        width: 1600,
        height: 1308,
        alt: 'FinGuardMY system architecture diagram',
        caption: 'System Architecture',
      },
    ],
    highlights: [
      '**Hybrid retrieval** with BGE-M3 vectors and BM25, fused by weighted Reciprocal Rank Fusion. The BM25 corpus is disk-cached and patched per document, so restarts skip a 30-minute Pinecone refetch.',
      '**Three-layer query router**: regex, then a structured-output LLM classifier with a confidence threshold, then a safe fallback. Each intent gets its own prompt, namespace, and metadata filter.',
      '**WebSocket chat protocol** with first-frame JWT auth, buffered token streaming, stop, versioned regenerate, a 20 messages per minute sliding-window rate limit, and atomic persistence after the stream ends.',
      '**Plan-and-Execute agent** that extracts crime facts from a case file, runs parallel statute, precedent, and BNM searches, and returns a structured JSON report. Case vectors are tenant-isolated by case and investigator id.',
      '**Async ingestion on an RQ worker** with retries, per-chunk fallback, a status lifecycle in MySQL, and startup reconciliation against R2 that also resets jobs left stuck by a crash.',
      '**Security and observability**: prompt-injection screening (regex then LLM) that raises admin alerts, an audit log of every privileged action, per-query RAG analytics, and a Ragas evaluation harness.',
    ],
    content: [
      {
        type: 'paragraph',
        text: 'Financial crime investigators in Malaysia spend hours cross-referencing transaction records against **AMLA**, **BNM regulations**, and past case law. FinGuardMY replaces that manual work with an AI backend that understands both the case data and the legal context, and is **auditable end to end** because its users handle sensitive investigations.',
      },
      { type: 'heading', text: 'Retrieval' },
      {
        type: 'paragraph',
        text: 'Statute PDFs are converted to Markdown, split by heading then by character, prefixed with their **act identifier**, and embedded in parallel batches on the **RQ worker**. At query time, vector search and BM25 each over-fetch 40 candidates and merge with **Reciprocal Rank Fusion** weighted toward the vector ranking; the **BM25 corpus is persisted to disk** and patched incrementally per document rather than rebuilt from Pinecone on every restart. A **three-layer query router** classifies each question first, so statute lookups, precedent searches, overviews, and case analysis each hit the right namespace, filter, and system prompt.',
      },
      { type: 'heading', text: 'Streaming chat' },
      {
        type: 'paragraph',
        text: 'The client authenticates with a **JWT in its first WebSocket frame**, with ping and pong frames keeping the connection alive. Tokens are **buffered and flushed in small batches**; a stop frame cancels mid-answer, and regenerate creates a **versioned sibling answer** so history is never overwritten. Each exchange is written to MySQL in **one transaction after the stream ends**, so a dropped connection never leaves a half-written conversation, and every message is screened for **prompt injection** by regex then an LLM classifier, with hits refused and surfaced to admins as alerts.',
      },
      { type: 'heading', text: 'Agentic case analysis' },
      {
        type: 'paragraph',
        text: 'Case files can be uploaded as **PDF, DOCX, CSV, XLSX, or text**; content is extracted, cleaned, quality-filtered, and embedded with case and investigator ids so retrieval stays **tenant-isolated at the filter level**. A background task then extracts **structured crime facts**, fires parallel law and precedent searches, adds a **BNM reporting-obligation** search when a financial institution is involved, and synthesises a JSON report, while a **Valkey lock** prevents concurrent analyses of the same case and the frontend polls a status endpoint until the report is ready.',
      },
      { type: 'heading', text: 'Observability' },
      {
        type: 'paragraph',
        text: 'Every privileged action is captured in an **audit log**, and **admin alerts** fire on injection attempts. **RAG analytics** track intent, latency (p50 and p95), retrieved documents, and insufficient-answer rate per query, and a **Ragas evaluation** harness runs the full pipeline against a seeded question set, scoring faithfulness, relevancy, context precision and recall, and correctness, so retrieval changes are measured rather than guessed.',
      },
    ],
  },
  {
    slug: 'automated-infrastructure-tooling',
    title: 'Automated Infrastructure Tooling',
    date: '2025-11',
    description: 'A containerised sidecar that fetches routing configuration from a backend API, serialises it to YAML, and drives Nginx through Jinja2 templates, eliminating manual config changes across environments.',
    tech: ['Python', 'Jinja2', 'Nginx', 'Docker'],
    highlights: [
      'Built a Python script that polls a backend API for the latest routing rules and serialises the response into a structured YAML configuration file.',
      'Used Jinja2 to render Nginx .conf files directly from the YAML output, keeping templates declarative and the generated config always in sync with the backend state.',
      'Packaged the Python script and Nginx together in a single Docker container, so the full fetch-parse-configure cycle runs as one cohesive unit with no external dependencies.',
    ],
    content: [
      {
        type: 'paragraph',
        text: 'The motivation was simple: SSHing into servers to deploy the Nginx configs whenever routing rules changed was slow and error-prone. The goal was a self-contained container that could pull its own configuration from a backend API and reconfigure Nginx automatically.',
      },
      {
        type: 'paragraph',
        text: 'At startup (and on a polling interval), the Python script calls the backend API to retrieve the current routing and proxy rules. The API response is parsed and written out as a YAML file: a clean, human-readable intermediate representation that decouples the API contract from the template logic.',
      },
      {
        type: 'paragraph',
        text: 'Jinja2 then reads the YAML file and renders the final Nginx .conf. This separation means the template can be evolved independently of the fetch logic, and the YAML file doubles as an audit trail of what config was actually applied. Once rendered, the script tests the Nginx configuration syntax and triggers a graceful reload inside the container.',
      },
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
