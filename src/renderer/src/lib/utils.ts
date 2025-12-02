import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatar tempo HH:MM:SS
export function formatTime(seconds: number): string {
  // Garantir que o valor é não-negativo
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Calcular progresso (0-100)
export function calculateProgress(current: number, limit: number): number {
  if (!limit) return 0
  return Math.min((current / limit) * 100, 100)
}

// Parse input de tempo (HH:MM:SS) para segundos
export function parseTimeInput(timeString: string): number {
  const parts = timeString.split(':').map(Number)
  const [h = 0, m = 0, s = 0] = parts
  return h * 3600 + m * 60 + s
}

// Formatar data
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
}

// Formatar data e hora
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
