import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import Fuse from 'fuse.js';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DataSource } from '../../hooks/api/useDataSources';

export interface SourceSelectorProps {
  sources: DataSource[];
  activeSource: DataSource | null;
  isLoading: boolean;
  onSelect: (sourceId: string) => void;
}

export function SourceSelector({
  sources,
  activeSource,
  isLoading,
  onSelect,
}: SourceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prepare sources with formatted fields for search
  const sourcesWithFormatted = useMemo(() => {
    return sources.map(source => ({
      ...source,
      formattedFrequency: formatFrequency(source.centerFrequency),
      formattedSampleRate: formatSampleRate(source.sampleRate),
    }));
  }, [sources]);

  // Set up Fuse.js for fuzzy search across all fields
  const fuse = useMemo(() => {
    return new Fuse(sourcesWithFormatted, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'typeLabel', weight: 0.2 },
        { name: 'formattedFrequency', weight: 0.2 },
        { name: 'formattedSampleRate', weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [sourcesWithFormatted]);

  // Filter sources based on search
  const filteredSources = useMemo(() => {
    if (!search.trim()) {
      return sources;
    }
    const results = fuse.search(search);
    return results.map(result => sources.find(s => s.id === result.item.id)!);
  }, [search, fuse, sources]);

  const handleSelect = (sourceId: string) => {
    onSelect(sourceId);
    setIsOpen(false);
    setSearch('');
  };

  const dropdownButtonClasses = [
    'inline-flex items-center gap-2 rounded-sm border px-3 py-1.5',
    'border-viz-border/50 bg-transparent text-viz-text transition',
    'hover:bg-viz-bg/70 hover:border-viz-border',
    'text-[11px] font-medium sm:text-xs',
  ].join(' ');

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={dropdownButtonClasses}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="text-viz-text">
          {activeSource ? activeSource.name : 'Select...'}
        </span>
        <ChevronDown size={14} className="text-viz-text/60" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[320px] rounded-md border shadow-lg overflow-hidden bg-popover border-border">
          <Command shouldFilter={false} className="bg-popover">
            <CommandInput
              placeholder="Search sources..."
              value={search}
              onValueChange={setSearch}
              className="text-xs"
            />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                No sources found
              </CommandEmpty>
              <CommandGroup>
                {filteredSources.map((source) => (
                  <CommandItem
                    key={source.id}
                    value={source.id}
                    onSelect={() => handleSelect(source.id)}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{source.name}</span>
                        <span className="rounded px-1 py-0.5 text-[9px] font-medium uppercase bg-muted text-muted-foreground">
                          {source.typeLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatFrequency(source.centerFrequency)} • {formatSampleRate(source.sampleRate)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            source.status === 'active'
                              ? 'rgb(var(--color-status-success))'
                              : source.status === 'error'
                                ? 'rgb(var(--color-status-error))'
                                : 'rgb(var(--color-status-stopped))',
                        }}
                        title={source.status}
                      />
                      {source.id === activeSource?.id && (
                        <Check size={12} className="text-accent" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

function formatFrequency(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
  return `${hz} Hz`;
}

function formatSampleRate(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MS/s`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kS/s`;
  return `${hz} S/s`;
}
