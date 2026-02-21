import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Graph } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function useGraphData(limit: number) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const firstLoadRef = useRef(true);

  const fetchGraph = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query ($limit: Int!) {
            historianGraph(limit: $limit) {
              nodes { id created title content sourcePath theme source kind era tags people }
              edges { from to type }
            }
          }`,
          variables: { limit },
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || json.errors) {
        throw new Error(json.errors?.[0]?.message ?? `GraphQL error (${res.status})`);
      }
      setGraph(json.data.historianGraph as Graph);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph');
      setGraph(null);
    } finally {
      setIsLoading(false);
      firstLoadRef.current = false;
    }
  }, [limit]);

  useEffect(() => {
    void fetchGraph();
  }, [fetchGraph]);

  const isInitialLoading = useMemo(() => isLoading && firstLoadRef.current, [isLoading]);

  return { graph, error, isLoading, isInitialLoading, fetchGraph };
}
