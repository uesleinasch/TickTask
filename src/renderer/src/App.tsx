import { createHashRouter, RouterProvider } from 'react-router-dom'
import { TaskListPage } from './pages/TaskListPage'
import { SingleTaskPage } from './pages/SingleTaskPage'
import { ArchivedTasksPage } from './pages/ArchivedTasksPage'
import { Toaster } from './components/ui/sonner'

const router = createHashRouter([
  {
    path: '/',
    element: <TaskListPage />
  },
  {
    path: '/task/:id',
    element: <SingleTaskPage />
  },
  {
    path: '/archived',
    element: <ArchivedTasksPage />
  }
])

function App(): React.JSX.Element {
  return (
    <div className="dark">
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </div>
  )
}

export default App
