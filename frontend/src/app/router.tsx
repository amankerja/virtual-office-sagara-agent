import { createBrowserRouter } from 'react-router-dom'
import { MissionControlLayout } from '@/layouts/MissionControlLayout'
import { CommandCenterPage } from '@/pages/CommandCenterPage'
import { AgentsPage } from '@/pages/AgentsPage'
import { TasksPage } from '@/pages/TasksPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { OfficePage } from '@/pages/OfficePage'
import { ActivityPage } from '@/pages/ActivityPage'
import { SkillsPage } from '@/pages/SkillsPage'
import { RuntimePage } from '@/pages/RuntimePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MissionControlLayout />,
    children: [
      {
        index: true,
        element: <CommandCenterPage />,
      },
      {
        path: 'agents',
        element: <AgentsPage />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
      },
      {
        path: 'approvals',
        element: <ApprovalsPage />,
      },
      {
        path: 'office',
        element: <OfficePage />,
      },
      {
        path: 'activity',
        element: <ActivityPage />,
      },
      {
        path: 'skills',
        element: <SkillsPage />,
      },
      {
        path: 'runtime',
        element: <RuntimePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
