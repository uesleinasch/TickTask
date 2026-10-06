import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CalendarDays, Info, Loader2, Server, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { cn } from '@renderer/lib/utils'
import type { GcalStatus, McpStatus } from '@shared/types'
import { AboutSection } from '@renderer/components/settings/AboutSection'
import { GeneralSection } from '@renderer/components/settings/GeneralSection'
import { GoogleCalendarSection } from '@renderer/components/settings/GoogleCalendarSection'
import { McpSection } from '@renderer/components/settings/McpSection'
import { NotionSection } from '@renderer/components/settings/NotionSection'
import {
  gcalStatusInfo,
  mcpStatusInfo,
  notionStatus,
  type NotionConfig,
  type StatusTone
} from '@renderer/components/settings/settingsStatus'

type SectionId = 'geral' | 'notion' | 'google' | 'mcp' | 'sobre'

interface NavItem {
  id: SectionId
  label: string
  icon: LucideIcon
  status?: { tone: StatusTone; label: string }
}

const DOT_CLASSES: Record<StatusTone, string> = {
  on: 'bg-emerald-500',
  off: 'bg-slate-300',
  error: 'bg-red-500'
}

export function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [section, setSection] = usePersistedState<SectionId>('settings.section', 'geral')
  const [notion, setNotion] = useState<NotionConfig | null>(null)
  const [gcal, setGcal] = useState<GcalStatus | null>(null)
  const [mcp, setMcp] = useState<McpStatus | null>(null)
  const [autostart, setAutostart] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.notionGetConfig(),
      window.api.gcalGetStatus(),
      window.api.mcpGetStatus(),
      window.api.appGetAutostart()
    ])
      .then(([notionConfig, gcalStatus, mcpStatus, autostartEnabled]) => {
        setNotion(notionConfig)
        setGcal(gcalStatus)
        setMcp(mcpStatus)
        setAutostart(autostartEnabled)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Aplicativo',
      items: [
        { id: 'geral', label: 'Geral', icon: Settings },
        { id: 'sobre', label: 'Sobre', icon: Info }
      ]
    },
    {
      label: 'Integrações',
      items: [
        { id: 'notion', label: 'Notion', icon: BookOpen, status: notionStatus(notion) },
        {
          id: 'google',
          label: 'Google Calendar',
          icon: CalendarDays,
          status: gcalStatusInfo(gcal)
        },
        { id: 'mcp', label: 'Servidor MCP', icon: Server, status: mcpStatusInfo(mcp) }
      ]
    }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
        >
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-900">Configurações</h1>
        </div>
        <div className="w-20" />
      </header>

      <div className="flex flex-1 h-0">
        <nav className="w-56 shrink-0 bg-white border-r border-slate-200 p-3 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = section === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    title={item.status?.label}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.status && (
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          DOT_CLASSES[item.status.tone]
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <ScrollArea className="flex-1 h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-8 py-8">
              <div className="bg-white border border-slate-200 rounded-sm p-6">
                {section === 'geral' && (
                  <GeneralSection autostart={autostart} onAutostartChange={setAutostart} />
                )}
                {section === 'notion' && (
                  <NotionSection config={notion} onConfigChange={setNotion} />
                )}
                {section === 'google' && gcal && (
                  <GoogleCalendarSection status={gcal} onStatusChange={setGcal} />
                )}
                {section === 'mcp' && mcp && <McpSection status={mcp} onStatusChange={setMcp} />}
                {section === 'sobre' && <AboutSection />}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
