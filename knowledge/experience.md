# Experience

<!-- One "##" per role. Heading = role + company + dates (it is embedded with the body).
     Name Hayden and the company inside the body; each section must make sense alone. -->

## Backend Engineer Intern at Infinity Data Tech Sdn. Bhd., August 2025 - February 2026

Hayden worked as a Backend Engineer Intern at Infinity Data Tech Sdn. Bhd., building backend services in Java and Spring Boot and operating infrastructure on Kubernetes.
- Built a multi-factor user-blocking system in Java and Spring Boot that blocks users by IP address, device fingerprint, and user credentials to prevent platform abuse.
- Automated Nginx blocking rules with Python and Jinja2, and added a scheduled script that syncs the latest IP blocklist.
- Built a monitoring stack with VictoriaLogs and Grafana, with real-time Lark alerts for proactive incident detection.
- Maintained the company-wide Kubernetes test environment, running 130 pods for 3 teams and 12 engineers.
- Validated and stress tested new technologies in the test cluster, then deployed them to the production cluster, catching issues before release.
- Tech: Java, Spring Boot, Kubernetes, Nginx, Python, Jinja2, Grafana, VictoriaLogs, Caddy, PostgreSQL, Apache Kafka.

## FinGuardMY, AI Chatbot for Financial Crime Analysis

Hayden built FinGuardMY, a full-stack AI assistant that helps financial crime investigators surface motives and clues from case files. The source is on his GitHub.
- Designed a 3-stage hybrid RAG pipeline: BM25 plus Pinecone vector search (BGE-M3 embeddings), fused with Reciprocal Rank Fusion, then reranked by Llama 3.1. It is hardened against prompt injection.
- Added real-time token streaming over WebSockets, with Markdown rendering and source citations.
- Built an automated RAGAS evaluation framework covering faithfulness, answer relevancy, context precision, context recall, and answer correctness.
- Built an admin console for user management, knowledge-base ingestion, and RAG analytics.
- Secured it with Keycloak JWT and role-based access (admin and user), with silent token refresh. Valkey handles token caching, chat context, distributed locking, and sliding-window rate limiting.
- Containerized the full stack (FastAPI, MySQL, Keycloak, Valkey) with Docker Compose.
- Tech: Python, FastAPI, LangChain, React 19, TypeScript, MySQL, Keycloak, Valkey, Pinecone, Docker.
