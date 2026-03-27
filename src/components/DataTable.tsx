import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface Column<T> {
  key: string
  header: string
  render: (item: T, index: number) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyFn: (item: T) => string
  className?: string
}

export default function DataTable<T>({ data, columns, keyFn, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto custom-scrollbar', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-left py-3 px-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={keyFn(item)}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('py-3 px-4', col.className)}>
                  {col.render(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
