import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

interface SourceBranch {
  name: string
  commit_sha: string
  updated_at: string
}

interface SourceRepo {
  id: string
  title: string
  description: string
  default_branch: string
  size_kb: number
  updated_at: string
  branches: SourceBranch[]
  download_url_template: string
}

interface SourcesResponse {
  repo: SourceRepo
  branches: SourceBranch[]
}

function fmtSize(kb: number): string {
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB'
  return kb + ' KB'
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SourceCard({ branch, template }: { branch: SourceBranch; template: string }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const url = template.replace('{branch}', branch.name)
      const a = document.createElement('a')
      a.href = url
      a.download = `${branch.name}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-[#0a0f1e]/60 p-5 transition-all duration-300 hover:border-indigo-500/30 hover:bg-[#0a0f1e]/80 hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)] hover:-translate-y-0.5">
      {/* top accent line */}
      <div className="absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-400/60 transition-all duration-500" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* title + branch pill */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-400/15">
              <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{branch.name}</h3>
            {branch.commit_sha && (
              <code className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.03] text-[9px] font-mono text-slate-500 ring-1 ring-white/[0.06]">
                {branch.commit_sha.slice(0, 7)}
              </code>
            )}
          </div>

          {/* meta */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] ring-1 ring-white/[0.04]">
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {fmtDate(branch.updated_at)}
            </span>
          </div>
        </div>

        {/* download btn */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/[0.08] text-[11px] font-semibold text-indigo-200 ring-1 ring-indigo-400/15 hover:bg-indigo-500/[0.15] hover:ring-indigo-400/30 hover:text-indigo-100 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? 'Saving…' : 'Get'}
        </button>
      </div>
    </div>
  )
}

export default function Sources() {
  const [data, setData] = useState<SourcesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/sources')
      .then(r => r.json())
      .then((resp: SourcesResponse) => { setData(resp); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const repo = data?.repo
  const branches = data?.branches ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            SOURCES
          </h1>
          {repo && (
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              {repo.title} · {fmtSize(repo.size_kb)} · {branches.length} branches
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[10px] font-mono text-slate-600">Loading sources…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-[11px] font-mono text-red-300">
          Failed to load sources: {error}
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center">
          <div className="text-xs font-mono text-slate-600">No branches found</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {branches.map(b => (
            <SourceCard key={b.name} branch={b} template={repo?.download_url_template ?? ''} />
          ))}
        </div>
      )}
    </div>
  )
}
