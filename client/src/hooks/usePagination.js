import { useState, useCallback } from 'react';

/**
 * A custom hook to manage pagination state.
 * 
 * @param {number} initialPage - Starting page
 * @param {number} initialLimit - Items per page
 */
export default function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const goToPage = useCallback((p) => setPage(p), []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
    reset
  };
}
