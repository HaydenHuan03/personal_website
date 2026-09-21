import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('pages/HomePage.tsx'),
  route('projects/:slug', 'pages/ProjectDetailPage.tsx'),
  route('leetcode', 'pages/LeetCodePage.tsx'),
  route('leetcode/:slug', 'pages/LeetCodeProblemPage.tsx'),
  route('*', 'pages/NotFoundPage.tsx'),
] satisfies RouteConfig;
