import React, { useState } from 'react';
import { GripVertical, MoreVertical, Edit, Copy, Trash2, Activity } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ThirdPartyConnection } from '@/types';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';
import { formatLatency, type ConnectionHealthProbeResult } from '@/utils/thirdPartyDiagnostics';

interface SortableProviderItemProps {
  connection: ThirdPartyConnection;
  isSelected: boolean;
  healthResult?: ConnectionHealthProbeResult;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onProbe: () => void;
  t: (key: string) => string;
}

export const SortableProviderItem: React.FC<SortableProviderItemProps> = ({
  connection,
  isSelected,
  healthResult,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onProbe,
  t,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: connection.id,
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-xl cursor-pointer select-none transition-all ${
        isSelected
          ? 'bg-[var(--theme-bg-secondary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]/40 font-medium'
          : 'hover:bg-[var(--theme-bg-secondary)]/50'
      } ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -ml-1 focus:outline-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={15} />
        </button>

        <ProviderAvatar name={connection.name} templateId={connection.templateId} size={26} icon={connection.icon} />

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`text-sm truncate min-w-0 ${
              isSelected
                ? 'text-[var(--theme-text-primary)] font-semibold'
                : connection.enabled
                  ? 'text-[var(--theme-text-primary)]'
                  : 'text-[var(--theme-text-secondary)] line-through opacity-70'
            }`}
            title={connection.name}
          >
            {connection.name}
          </span>
          {connection.notes && (
            <span
              className="px-1.5 py-0.2 text-[9px] font-normal leading-none rounded-md bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]/40 truncate max-w-[75px] shrink-0"
              title={connection.notes}
            >
              {connection.notes}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {healthResult ? (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md flex items-center gap-1 cursor-default ${
              healthResult.status === 'success'
                ? healthResult.latencyMs < 500
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }`}
            title={
              healthResult.status === 'success'
                ? `${formatLatency(healthResult.latencyMs)} (${healthResult.grade})`
                : healthResult.diagnosticTip || healthResult.errorMessage || t('thirdPartyConnectionFailed')
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                healthResult.status === 'success'
                  ? healthResult.latencyMs < 500
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>{healthResult.status === 'success' ? formatLatency(healthResult.latencyMs) : 'ERR'}</span>
          </span>
        ) : connection.enabled ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title={t('enabled')} />
        ) : (
          <span className="w-2 h-2 rounded-full bg-[var(--theme-border-secondary)] opacity-40" title={t('disabled')} />
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md text-[var(--theme-text-secondary)]/60 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] p-1 shadow-xl text-xs space-y-0.5 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onProbe();
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]"
                >
                  <Activity size={13} />
                  <span>{t('thirdPartyTestSpeed')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]"
                >
                  <Edit size={13} />
                  <span>{t('edit')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]"
                >
                  <Copy size={13} />
                  <span>{t('thirdPartyDuplicate')}</span>
                </button>
                <div className="h-[1px] bg-[var(--theme-border-secondary)]/30 my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10"
                >
                  <Trash2 size={13} />
                  <span>{t('delete')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
