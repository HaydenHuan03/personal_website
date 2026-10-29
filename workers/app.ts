import { createRequestHandler } from 'react-router';
import { handleChat } from './chat';

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/api/chat') {
      return handleChat(request, env, ctx);
    }
    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
