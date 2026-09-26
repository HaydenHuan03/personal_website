import spring from '../assets/icons/spring.svg';
import python from '../assets/icons/python.svg';
import fastapi from '../assets/icons/fastapi.svg';
import kubernetes from '../assets/icons/kubernetes.svg';
import docker from '../assets/icons/docker.svg';
import nginx from '../assets/icons/nginx.svg';
import apachekafka from '../assets/icons/apachekafka.svg';
import apacheairflow from '../assets/icons/apacheairflow.svg';
import apachespark from '../assets/icons/apachespark.svg';
import redis from '../assets/icons/redis.svg';
import postgresql from '../assets/icons/postgresql.svg';
import mysql from '../assets/icons/mysql.svg';
import cloudflare from '../assets/icons/cloudflare.svg';

/**
 * Maps tech names to a bundled SVG URL (the `-original` colored logos copied
 * from github.com/devicons/devicon). Self-hosting the ~15 SVGs we use avoids
 * the render-blocking devicon.min.css + 1.5MB icon font from the CDN.
 * Empty string means no icon available — fall back to text-only.
 */
export const techIconMap: Record<string, string> = {
  // Languages & frameworks
  'Java (Spring Boot)': spring,
  'Python':             python,
  'FastAPI':            fastapi,

  // Infrastructure
  'Kubernetes':         kubernetes,
  'Docker':             docker,
  'Nginx':              nginx,
  'Caddy':              '',

  // Data & events
  'Apache Kafka':       apachekafka,
  'Apache Airflow':     apacheairflow,
  'Apache Spark':       apachespark,
  'Valkey':             redis, // Valkey is a Redis fork; use Redis icon

  // Databases
  'PostgreSQL':         postgresql,
  'MySQL':              mysql,
  'Redis':              redis,
  'Vector Databases':   '',
  'Hybrid SQL':         '',

  // AI / tooling
  'LangChain':          '',
  'Pinecone':           '',
  'Ollama':             '',
  'Keycloak':           '',

  // Cloud / storage
  'Cloudflare R2':      cloudflare,

  // Templating
  'Jinja2':             '', // devicon has no Jinja icon
};
