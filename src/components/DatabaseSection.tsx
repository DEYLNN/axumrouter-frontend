import { useRef, useState } from 'react'
import type { DatabaseInfo as DbInfo } from '../api'
import { exportDatabase, importDatabase } from '../api'

interface Props {
  dbInfo: DbInfo | null
  stats: { totalModels: number; disabledModels: number; blockedModels: number; totalUsage: number }
  onDbReload: () => void
}

export default function DatabaseSection({ dbInfo, stats, onDbReload }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportDatabase()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `axumrouter-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(url)
    } catch (_) {}
    setExporting(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImportStatus('Reading...')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed.tables) throw new Error('Invalid backup file — missing "tables" key')
      await importDatabase(parsed.tables)
      setImportStatus('Imported!')
      onDbReload()
    } catch (err: any) { setImportStatus('Failed: ' + (err.message || 'unknown')) }
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(245,158,11,0.1)' }}>
      <div className="px-5 py-4 border-b border-amber-500/10">
        <h2 className="text-xs font-mono font-bold text-amber-400 tracking-wider"
          style={{ textShadow: '0 0 10px rgba(245,158,11,0.3)' }}>DATABASE</h2>
      </div>
      <div className="p-5 text-[11px] font-mono space-y-3">
        <div className="text-xs text-slate-400">sqlite:data/axumrouter.db</div>
        {dbInfo && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-500">
              <span>{dbInfo.size_mb.toFixed(1)} MB</span><span>·</span>
              <span>{dbInfo.total_rows} rows</span><span>·</span>
              <span>{dbInfo.tables.length} tables</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-600">
              <span>{stats.totalModels} models</span><span>·</span>
              <span className="text-red-400/60">{stats.disabledModels} disabled</span><span>·</span>
              <span className="text-amber-400/60">{stats.blockedModels} blocked</span><span>·</span>
              <span>{stats.totalUsage.toLocaleString()} requests</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={handleExport} disabled={exporting}
            className="px-3 py-1.5 rounded-md text-[9px] font-mono text-slate-400 hover:text-amber-300 bg-white/[0.04] hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/30 transition-all disabled:opacity-40">
            {exporting ? 'Exporting...' : 'Export DB'}
          </button>
          <button onClick={() => importRef.current?.click()}
            className="px-3 py-1.5 rounded-md text-[9px] font-mono text-slate-400 hover:text-amber-300 bg-white/[0.04] hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/30 transition-all">
            Import DB
          </button>
          <input type="file" accept=".json" ref={importRef} onChange={handleImport} className="hidden" />
          {importStatus && <span className="text-[9px] font-mono text-slate-500">{importStatus}</span>}
        </div>
      </div>
    </div>
  )
}
