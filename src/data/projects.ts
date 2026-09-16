export interface Project {
  slug: string;
  title: string;
  inProgress?: boolean;
  description: string;
  tech: string[];
  highlights: string[];
  content: string[];
}

export const projects: Project[] = [
  {
    slug: 'finguardmy',
    title: 'FinGuardMY',
    inProgress: true,
    description: 'An AI-powered financial crime analysis platform for Malaysian investigators — combining a real-time RAG chatbot, agentic case report generation, and a knowledge base of AMLA statutes and legal precedents.',
    tech: ['FastAPI', 'Python', 'MySQL', 'Pinecone', 'LangChain', 'Ollama', 'Keycloak', 'Valkey', 'Cloudflare R2', 'Docker'],
    highlights: [
      'Engineered a hybrid retrieval pipeline (vector similarity + BM25 + Reciprocal Rank Fusion) across three Pinecone namespaces — general knowledge, case documents, and a Malaysian legal knowledge base — for high-precision context grounding.',
      'Built a Plan-and-Execute agentic workflow that autonomously extracts crime facts from case PDFs, runs parallel statute and precedent searches, and synthesizes a structured JSON investigation report using a local llama3.1:8b model via Ollama.',
      'Implemented real-time WebSocket streaming with token-by-token LLM responses, sliding-window rate limiting via Valkey, atomic message persistence, and keep-alive ping/pong — supporting multi-turn conversations with source attribution.',
      'Designed a secure multi-tenant backend with Keycloak OAuth2/OIDC (RS256 JWTs), role-based access control (admin vs. investigator), and per-user conversation and case isolation enforced at both the API and vector retrieval layers.',
      'Adopted a fully local AI stack — Ollama hosts both the embedding model (nomic-embed-text) and LLM (llama3.1:8b) — eliminating data sovereignty concerns for sensitive financial investigation data.',
    ],
    content: [
      'FinGuardMY was built to address a real operational gap: financial crime investigators in Malaysia spend enormous time manually cross-referencing transaction records, legal statutes like AMLA, BNM regulations, and historical case precedents. The platform replaces that manual process with a purpose-built AI backend that understands both the data and the legal context.',
      'The core of the system is a multi-namespace RAG pipeline backed by Pinecone. Documents are chunked, embedded via Ollama (nomic-embed-text), and stored across three namespaces — a general knowledge base, per-case investigation documents, and a legal knowledge base of Malaysian statutes and elaw.my precedents. At query time, hybrid retrieval combines vector similarity search with BM25 lexical scoring, fused via Reciprocal Rank Fusion to surface the most relevant context before calling the LLM.',
      'For automated case analysis, I implemented a Plan-and-Execute agent. When an investigator uploads a case PDF, the agent: ingests and embeds the document, extracts structured crime facts using the LLM (crime type, key entities, transaction patterns, involved parties), then fires parallel searches for applicable laws and precedent cases. If a financial institution is implicated, it also queries BNM reporting obligations. All findings are synthesized into a structured JSON report with detected patterns, confidence levels, applicable law sections, and recommended actions.',
      'The real-time chat interface runs over WebSockets with token-by-token streaming from the LLM. Each connection is authenticated via JWT, rate-limited using a Valkey sliding-window counter, and backed by an in-memory RAGChat session cache with a 30-minute idle eviction policy. Messages are persisted atomically after streaming completes, ensuring conversation history is never partially written. The entire auth layer is delegated to Keycloak — RS256 JWT verification, token refresh, session revocation, and role-based endpoint protection are all handled through it.',
    ],
  },
  {
    slug: 'automated-infrastructure-tooling',
    title: 'Automated Infrastructure Tooling',
    description: 'A containerised sidecar that fetches routing configuration from a backend API, serialises it to YAML, and drives Nginx through Jinja2 templates — eliminating manual config changes across environments.',
    tech: ['Python', 'Jinja2', 'Nginx', 'Docker'],
    highlights: [
      'Built a Python script that polls a backend API for the latest routing rules and serialises the response into a structured YAML configuration file.',
      'Used Jinja2 to render Nginx .conf files directly from the YAML output, keeping templates declarative and the generated config always in sync with the backend state.',
      'Packaged the Python script and Nginx together in a single Docker container, so the full fetch-parse-configure cycle runs as one cohesive unit with no external dependencies.',
    ],
    content: [
      'The motivation was simple:  SSHing into servers to deploy the Nginx configs whenever routing rules changed was slow and error-prone. The goal was a self-contained container that could pull its own configuration from a backend API and reconfigure Nginx automatically.',
      'At startup (and on a polling interval), the Python script calls the backend API to retrieve the current routing and proxy rules. The API response is parsed and written out as a YAML file — a clean, human-readable intermediate representation that decouples the API contract from the template logic.',
      'Jinja2 then reads the YAML file and renders the final Nginx .conf. This separation means the template can be evolved independently of the fetch logic, and the YAML file doubles as an audit trail of what config was actually applied. Once rendered, the script tests the Nginx configuration syntax and triggers a graceful reload inside the container.',
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
