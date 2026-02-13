import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">allrecords</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          A grab-bag repo for family + fun. Start here:
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            href="/timeline"
          >
            Open Timeline Graph
          </Link>
          <a
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            href="/support"
          >
            Support
          </a>
          <a
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            href="/privacy-policy"
          >
            Privacy Policy
          </a>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-200">
          <div className="font-medium">Backend requirement</div>
          <div className="mt-1 text-xs text-zinc-500">
            Set <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">NEXT_PUBLIC_API_BASE_URL</code> to your backend
            (default: http://localhost:3000).
          </div>
        </div>
      </main>
    </div>
  );
}
