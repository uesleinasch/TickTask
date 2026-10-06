import { localDateString } from '@shared/dueState'

export interface DueTaskLike {
  id: number
  name: string
  due_date?: string | null
  due_time?: string | null
}

export interface DueNotification {
  key: string
  title: string
  body: string
}

const LEAD_MINUTES = 15
const DAY_NOTICE_HOUR = 9

function minutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function pickDueNotifications(
  tasks: DueTaskLike[],
  now: Date,
  sent: Set<string>
): DueNotification[] {
  const today = localDateString(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = localDateString(tomorrowDate)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const picked: DueNotification[] = []
  const add = (notification: DueNotification): void => {
    if (!sent.has(notification.key)) picked.push(notification)
  }

  for (const task of tasks) {
    if (!task.due_date) continue
    const dueDate = task.due_date.slice(0, 10)

    if (dueDate === today && now.getHours() >= DAY_NOTICE_HOUR) {
      add({ key: `${task.id}-today`, title: '⏰ Prazo hoje!', body: `"${task.name}" vence hoje.` })
    } else if (dueDate === tomorrow) {
      add({
        key: `${task.id}-tomorrow`,
        title: '📅 Prazo amanhã',
        body: `"${task.name}" vence amanhã.`
      })
    }

    if (dueDate !== today || !task.due_time) continue
    const until = minutesOfDay(task.due_time) - nowMinutes
    if (until > 0 && until <= LEAD_MINUTES) {
      add({
        key: `${task.id}-soon-${dueDate}-${task.due_time}`,
        title: `⏰ Prazo às ${task.due_time}`,
        body: `"${task.name}" vence às ${task.due_time}.`
      })
    } else if (until <= 0 && until > -LEAD_MINUTES) {
      add({
        key: `${task.id}-due-${dueDate}-${task.due_time}`,
        title: '⏰ Prazo agora',
        body: `"${task.name}" vence agora (${task.due_time}).`
      })
    }
  }

  return picked
}
