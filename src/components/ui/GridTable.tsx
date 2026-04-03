import React, { ReactNode } from 'react';
import { CheckSquare, Square } from 'lucide-react';

export interface Column<T> {
  header: ReactNode | string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortKey?: string;
}

interface GridTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode | string;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
}

function SortIndicator({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) return <span className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 align-middle" />;
  return (
    <span className="inline-block ml-1.5 align-middle text-amber-500 leading-none" style={{ fontSize: 12 }}>
      {order === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function GridTable<T>({
  data, columns, keyExtractor, selectedIds, onToggleSelect, onToggleSelectAll,
  onRowClick, emptyMessage = 'Nenhum registro encontrado.', sortKey, sortOrder = 'asc', onSort, isLoading = false,
}: GridTableProps<T>) {
  const isSelectable = !!selectedIds && !!onToggleSelect;
  const allSelected = isSelectable && data.length > 0 && data.every((row) => selectedIds.has(String(keyExtractor(row))));

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: 520 }}>
          <thead className="bg-zinc-50">
            <tr className="border-b border-zinc-200">
              {isSelectable && (
                <th className="px-4 py-3 w-10 text-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={onToggleSelectAll} className="text-zinc-400 hover:text-amber-600 transition-colors">
                    {allSelected ? <CheckSquare size={15} className="text-amber-500" /> : <Square size={15} />}
                  </button>
                </th>
              )}
              {columns.map((col, idx) => {
                const isSortable = !!col.sortKey && !!onSort;
                const isActive = isSortable && sortKey === col.sortKey;
                return (
                  <th
                    key={idx}
                    onClick={isSortable ? () => onSort!(col.sortKey!) : undefined}
                    className={[
                      'px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap',
                      isSortable ? 'cursor-pointer select-none hover:text-amber-600 transition-colors' : '',
                      isActive ? 'text-amber-600' : '',
                      col.headerClassName || '',
                    ].join(' ')}
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {isSortable && <SortIndicator active={isActive} order={sortOrder} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {isSelectable && <td className="px-4 py-4"><div className="h-4 w-4 bg-zinc-100 rounded mx-auto" /></td>}
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-3 bg-zinc-100 rounded w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="py-10 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const id = String(keyExtractor(row));
                const isSelected = isSelectable && selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={[
                      onRowClick ? 'cursor-pointer' : '',
                      'group transition-colors',
                      isSelected ? 'bg-amber-50 hover:bg-amber-100/60' : rowIdx % 2 === 0 ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50/50 hover:bg-zinc-100/60',
                    ].join(' ')}
                  >
                    {isSelectable && (
                      <td className="px-4 py-3 text-center w-10 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onToggleSelect(id)} className="text-zinc-300 hover:text-amber-500 transition-colors">
                          {isSelected ? <CheckSquare size={15} className="text-amber-500" /> : <Square size={15} />}
                        </button>
                      </td>
                    )}
                    {columns.map((col, idx) => (
                      <td key={idx} className={`px-4 py-3 text-xs ${col.className || ''}`}>
                        {col.render ? col.render(row) : col.accessor ? String(row[col.accessor as keyof T] ?? '') : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
