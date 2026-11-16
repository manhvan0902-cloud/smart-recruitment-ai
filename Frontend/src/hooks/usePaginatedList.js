import { useCallback, useEffect, useState } from "react";

export default function usePaginatedList(load, initialQuery) {
  const [query, setQuery] = useState(initialQuery);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    load(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.pagination.total / query.limit));
        if (query.page > lastPage) {
          setQuery((current) => current === query ? { ...current, page: lastPage } : current);
          return;
        }
        setRows(result.data);
        setTotal(result.pagination.total);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setTotal(0);
        setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [load, query, refreshCount]);

  const reload = useCallback(() => setRefreshCount((value) => value + 1), []);

  return { query, setQuery, rows, setRows, total, loading, error, reload };
}
