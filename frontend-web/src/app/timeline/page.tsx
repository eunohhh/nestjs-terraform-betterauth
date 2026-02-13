import GraphClient from './GraphClient';

export const dynamic = 'force-dynamic';

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 font-sans dark:bg-black">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Timeline</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Graph-first view of Historian notes. Uses <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">/graphql</code>.
          </p>
        </div>

        <GraphClient />
      </div>
    </div>
  );
}
