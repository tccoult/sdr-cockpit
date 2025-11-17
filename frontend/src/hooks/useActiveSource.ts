/**
 * Hook for managing active data source selection via URL parameters
 *
 * Manages the selected data source ID in the URL query parameter (?source=<sourceId>).
 * Enables shareable links, browser back/forward navigation, and bookmarkable states.
 */

import { useSearchParams } from 'react-router-dom';
import { useDataSources } from './api/useDataSources';

export function useActiveSource() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { sources } = useDataSources();

  // Get active source ID from URL
  const activeSourceId = searchParams.get('source');

  // Find the active source object
  const activeSource = sources.find((s) => s.id === activeSourceId) || null;

  // Function to select a source (updates URL)
  const selectSource = (sourceId: string | null) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      if (sourceId) {
        newParams.set('source', sourceId);
      } else {
        newParams.delete('source');
      }

      return newParams;
    });
  };

  return {
    activeSourceId,
    activeSource,
    selectSource,
  };
}
