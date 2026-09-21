import { useRef, useState } from 'react'
import type { DatabaseInfo as DbInfo } from '../api'
import { exportDatabase, importDatabase } from '../api'

interface Props {
  dbInfo: DbInfo | null
  stats: { totalModels: number; disabledModels: number; blockedModels: number }
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
    } catch { /* noop */ }
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
    <div className="brutal-card overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#111111]">
        <h2 className="heading-brutal text-lg uppercase tracking-tight">DATABASE</h2>
      </div>
      <div className="p-5 text-sm space-y-3">
        <div className="text-sm font-medium text-gray-700">sqlite:data/axumrouter.db</div>
        {dbInfo && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>{dbInfo.size_mb.toFixed(1)} MB</span><span>·</span>
              <span>{dbInfo.total_rows} rows</span><span>·</span>
              <span>{dbInfo.tables.length} tables</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>{stats.totalModels} models</span><span>·</span>
              <span className="text-[#ff6b5e]">{stats.disabledModels} disabled</span><span>·</span>
              <span className="text-[#ffd23f]">{stats.blockedModels} blocked</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={handleExport} disabled={exporting}
            className="brutal-btn bg-[#ff3d81] text-white px-4 py-2 text-sm">
            {exporting ? 'Exporting...' : 'Export DB'}
          </button>
          <button onClick={() => importRef.current?.click()}
            className="brutal-btn bg-white text-[#111111] px-4 py-2 text-sm">
            Import DB
          </button>
          <input type="file" accept=".json" ref={importRef} onChange={handleImport} className="hidden" />
          {importStatus && <span className="text-xs text-gray-600">{importStatus}</span>}
        </div>
      </div>
    </div>
  )
}
