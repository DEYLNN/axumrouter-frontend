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
    <div className="brutal-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-[#c8a2ff] border-2 border-[#111111] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#111111]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-[#111111] tracking-tight">{branch.name}</h3>
            {branch.commit_sha && (
              <code className="shrink-0 px-2 py-0.5 rounded-md bg-[#f0f0f0] border-2 border-[#111111] text-[9px] mono-brutal text-gray-600 font-bold">
                {branch.commit_sha.slice(0, 7)}
              </code>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] mono-brutal text-gray-500">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#f0f0f0] border-2 border-[#111111] font-bold">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {fmtDate(branch.updated_at)}
            </span>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="brutal-btn shrink-0 bg-[#ff3d81] text-white px-3.5 py-2 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
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
          <h1 className="heading-brutal text-3xl uppercase tracking-tight">SOURCES</h1>
          {repo && (
            <p className="text-lg font-medium text-gray-600">
              {repo.title} · {fmtSize(repo.size_kb)} · {branches.length} branches
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm mono-brutal text-gray-500">Loading sources…</div>
      ) : error ? (
        <div className="brutal-card border-[#ff6b5e] p-4 text-sm mono-brutal text-[#ff6b5e] font-bold">
          Failed to load sources: {error}
        </div>
      ) : branches.length === 0 ? (
        <div className="brutal-card border-dashed py-12 text-center">
          <div className="text-xs mono-brutal text-gray-500">No branches found</div>
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
