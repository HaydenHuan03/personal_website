/**
 * Maps tech names to their Devicon class strings.
 * Uses `colored` for plain-variant icons; `original` icons are inherently colored.
 * Empty string means no devicon available — fall back to text-only.
 */
export const techIconMap: Record<string, string> = {
  // Languages & frameworks
  'Java (Spring Boot)': 'devicon-spring-plain colored',
  'Python':             'devicon-python-plain colored',
  'FastAPI':            'devicon-fastapi-plain colored',

  // Infrastructure
  'Kubernetes':         'devicon-kubernetes-plain colored',
  'Docker':             'devicon-docker-plain colored',
  'Nginx':              'devicon-nginx-original',
  'Caddy':              '',

  // Data & events
  'Apache Kafka':       'devicon-apachekafka-original',
  'Apache Airflow':     'devicon-apacheairflow-plain colored',
  'Apache Spark':       'devicon-apachespark-original',
  'Valkey':             'devicon-redis-plain colored', // Valkey is a Redis fork; use Redis icon

  // Databases
  'PostgreSQL':         'devicon-postgresql-plain colored',
  'MySQL':              'devicon-mysql-original',
  'Redis':              'devicon-redis-plain colored',
  'Vector Databases':   '',
  'Hybrid SQL':         '',

  // AI / tooling
  'LangChain':          '',
  'Pinecone':           '',
  'Ollama':             '',
  'Keycloak':           '',

  // Cloud / storage
  'Cloudflare R2':      'devicon-cloudflare-plain colored',

  // Templating
  'Jinja2':             'devicon-jinja-plain colored',
};
