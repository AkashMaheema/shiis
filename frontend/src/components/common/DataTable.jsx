import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DataTable({
  columns = [],
  data = [],
  page = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onRowClick,
  emptyMessage = "No records found",
}) {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="glass-card overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-300/50 bg-surface-100/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200/70">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-surface-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || row.patientId || row.appointmentId || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors duration-150
                    ${onRowClick ? "cursor-pointer hover:bg-primary-50/60" : ""}
                  `}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-surface-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200/70">
          <p className="text-xs text-surface-400">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                    ${
                      pageNum === page
                        ? "bg-primary-500/15 text-primary-600 border border-primary-500/30"
                        : "text-surface-500 hover:text-surface-900 hover:bg-surface-100"
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
