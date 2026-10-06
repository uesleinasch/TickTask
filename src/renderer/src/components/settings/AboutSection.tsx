import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { SectionHeader } from './SettingsPrimitives'

export function AboutSection(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const runtime = window.electron.process.versions

  useEffect(() => {
    void window.api.appGetVersion().then(setVersion)
  }, [])

  const rows: [string, string][] = [
    ['TickTask', version],
    ['Electron', runtime.electron ?? ''],
    ['Chromium', runtime.chrome ?? ''],
    ['Node', runtime.node ?? '']
  ]

  return (
    <div className="space-y-6">
      <SectionHeader icon={Info} title="Sobre" description="Versões do app e do ambiente." />
      <dl className="divide-y divide-slate-200 rounded-sm border border-slate-200">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-800 tabular-nums">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
