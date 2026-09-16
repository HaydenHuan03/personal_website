/**
 * Prebuild step: fetch LeetCode solved-problem counts and snapshot them
 * into src/data/leetcode.json. On any failure the existing snapshot is
 * left untouched so the build never breaks on a flaky external API.
 */
const USERNAME = 'teomeehua';
const OUT = new URL('../src/data/leetcode.json', import.meta.url).pathname;

interface Stats {
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStatsGlobal {
                acSubmissionNum { difficulty count }
              }
            }
          }
        `,
        variables: { username: USERNAME },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const counts: { difficulty: string; count: number }[] | undefined =
      json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
    if (!counts) return null;
    const find = (d: string) => counts.find((c) => c.difficulty === d)?.count ?? 0;
    return {
      totalSolved: find('All'),
      easySolved: find('Easy'),
      mediumSolved: find('Medium'),
      hardSolved: find('Hard'),
    };
  } catch {
    return null;
  }
}

const stats = await fetchStats();
if (stats) {
  await Bun.write(OUT, JSON.stringify(stats, null, 2) + '\n');
  console.log(`LeetCode stats updated: ${stats.totalSolved} solved`);
} else {
  console.warn('LeetCode fetch failed — keeping existing snapshot');
}
