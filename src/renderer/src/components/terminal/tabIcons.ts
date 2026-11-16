import {
  Bot,
  Bug,
  Cloud,
  Code2,
  Database,
  FlaskConical,
  GitBranch,
  Globe,
  Package,
  Rocket,
  Server,
  SquareTerminal,
  type LucideIcon
} from 'lucide-react'
import type { TerminalTabIcon } from '@shared/terminalTab'

export const TAB_ICON_COMPONENTS: Record<TerminalTabIcon, LucideIcon> = {
  terminal: SquareTerminal,
  server: Server,
  database: Database,
  globe: Globe,
  code: Code2,
  bug: Bug,
  flask: FlaskConical,
  rocket: Rocket,
  package: Package,
  git: GitBranch,
  cloud: Cloud,
  bot: Bot
}
