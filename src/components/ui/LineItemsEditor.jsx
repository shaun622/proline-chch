import { useEffect, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn, currency } from '../../lib/utils'
import { GST_RATE } from '../../lib/constants'

const EMPTY_LINE = () => ({ id: crypto.randomUUID(), description: '', qty: 1, unit_price: 0, total: 0, sort: 0 })

export function computeTotals(lines, gstRate = GST_RATE) {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unit_price || 0), 0)
  const gst_amount = +(subtotal * gstRate).toFixed(2)
  const total = +(subtotal + gst_amount).toFixed(2)
  return { subtotal: +subtotal.toFixed(2), gst_rate: gstRate, gst_amount, total }
}

export default function LineItemsEditor({ lines, onChange, gstRate = GST_RATE, readOnly = false, className }) {
  const totals = useMemo(() => computeTotals(lines, gstRate), [lines, gstRate])

  useEffect(() => {
    if (readOnly || !lines || lines.length === 0) return
    // keep each line's total in sync
    let changed = false
    const next = lines.map(l => {
      const t = +((Number(l.qty || 0) * Number(l.unit_price || 0))).toFixed(2)
      if (Math.abs(t - Number(l.total || 0)) > 0.001) { changed = true; return { ...l, total: t } }
      return l
    })
    if (changed) onChange?.(next)
  }, [lines, readOnly, onChange])

  function addLine() {
    onChange?.([...(lines || []), { ...EMPTY_LINE(), sort: (lines?.length ?? 0) }])
  }

  function updateLine(id, patch) {
    onChange?.(lines.map(l => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id) {
    onChange?.(lines.filter(l => l.id !== id))
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="card !p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <div className="col-span-6">Description</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit $</div>
          <div className="col-span-2 text-right">Line total</div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(lines || []).length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No line items yet.
            </div>
          )}
          {(lines || []).map(line => (
            <div key={line.id} className="px-4 py-3 grid grid-cols-12 gap-2 md:gap-3 items-center">
              <input
                className="col-span-12 md:col-span-6 input !py-2"
                style={{ fontSize: 16 }}
                placeholder="Description"
                value={line.description}
                onChange={e => updateLine(line.id, { description: e.target.value })}
                disabled={readOnly}
              />
              <input
                className="col-span-4 md:col-span-2 input !py-2 text-right tabular-nums"
                type="number" step="0.01" min="0" inputMode="decimal"
                style={{ fontSize: 16 }}
                value={line.qty}
                onChange={e => updateLine(line.id, { qty: e.target.value })}
                disabled={readOnly}
              />
              <input
                className="col-span-4 md:col-span-2 input !py-2 text-right tabular-nums"
                type="number" step="0.01" min="0" inputMode="decimal"
                style={{ fontSize: 16 }}
                value={line.unit_price}
                onChange={e => updateLine(line.id, { unit_price: e.target.value })}
                disabled={readOnly}
              />
              <div className="col-span-3 md:col-span-1 text-right tabular-nums font-semibold text-sm">
                {currency(Number(line.qty || 0) * Number(line.unit_price || 0))}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center"
                  aria-label="Remove line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addLine}
            className="w-full px-4 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-300 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add line item
          </button>
        )}
      </div>

      <div className="card !py-3 !px-4">
        <div className="flex items-center justify-between text-sm py-0.5">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="tabular-nums font-medium">{currency(totals.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm py-0.5">
          <span className="text-gray-500 dark:text-gray-400">GST ({Math.round(gstRate * 100)}%)</span>
          <span className="tabular-nums font-medium">{currency(totals.gst_amount)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
          <span>Total</span>
          <span className="tabular-nums">{currency(totals.total)}</span>
        </div>
      </div>
    </div>
  )
}
