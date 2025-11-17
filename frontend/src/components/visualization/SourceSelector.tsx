/**
 * Source selector toolbar for choosing the active data source
 * Appears above the visualization and allows quick switching between sources
 */

import { ChevronDown } from 'lucide-react';
import { useDataSources } from '../../hooks/api/useDataSources';
import { useActiveSource } from '../../hooks/useActiveSource';
import { useState, useRef, useEffect } from 'react';

export function SourceSelector() {
  const { sources, isLoading } = useDataSources();
  const { activeSource, selectSource } = useActiveSource();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toolbarClasses = [
    'flex w-full items-center justify-between gap-3 border-b px-4 py-2',
    'bg-viz-bg',
  ].join(' ');

  const toolbarStyle = {
    borderBottomColor: 'var(--viz-divider)',
  };

  const dropdownButtonClasses = [
    'inline-flex items-center gap-2 rounded-sm border px-3 py-1.5',
    'border-viz-border/50 bg-transparent text-viz-text transition',
    'hover:bg-viz-bg/70 hover:border-viz-border',
    'text-sm font-medium',
  ].join(' ');

  const dropdownMenuClasses = [
    'absolute left-0 top-full mt-1 w-full min-w-[320px] max-w-md',
    'rounded-md border shadow-lg overflow-hidden z-50',
    'bg-viz-bg border-viz-border',
  ].join(' ');

  const dropdownItemClasses = (isActive: boolean) =>
    [
      'flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer transition',
      'text-sm border-b border-viz-border/30',
      'hover:bg-viz-bg/70',
      isActive ? 'bg-viz-bg text-viz-text' : 'text-viz-text/80',
    ].join(' ');

  const formatFrequency = (hz: number): string => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
    return `${hz} Hz`;
  };

  const formatSampleRate = (hz: number): string => {
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MS/s`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kS/s`;
    return `${hz} S/s`;
  };

  return (
    <div className={toolbarClasses} style={toolbarStyle}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-viz-text/60">DATA SOURCE</span>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className={dropdownButtonClasses}
            onClick={() => setIsOpen(!isOpen)}
            disabled={isLoading}
          >
            <span className="text-viz-text">
              {activeSource ? activeSource.name : 'Select source...'}
            </span>
            <ChevronDown size={16} className="text-viz-text/60" />
          </button>

          {isOpen && (
            <div className={dropdownMenuClasses}>
              <div className="max-h-64 overflow-y-auto">
                {sources.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-viz-text/60">
                    No sources available
                  </div>
                ) : (
                  sources.map((source) => (
                    <div
                      key={source.id}
                      className={dropdownItemClasses(source.id === activeSource?.id)}
                      onClick={() => {
                        selectSource(source.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: 'var(--viz-border)',
                              color: 'var(--viz-bg)',
                              opacity: 0.7,
                            }}
                          >
                            {source.typeLabel}
                          </span>
                        </div>
                        <div className="text-xs text-viz-text/50">
                          {formatFrequency(source.centerFrequency)} • {formatSampleRate(source.sampleRate)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
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
                          <span className="text-xs text-viz-text/60">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeSource && (
        <div className="flex items-center gap-4 text-xs text-viz-text/60">
          <span>{formatFrequency(activeSource.centerFrequency)}</span>
          <span>•</span>
          <span>{formatSampleRate(activeSource.sampleRate)}</span>
          <span>•</span>
          <span className="capitalize">{activeSource.status}</span>
        </div>
      )}
    </div>
  );
}
