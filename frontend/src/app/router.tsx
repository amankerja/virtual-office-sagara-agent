import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MissionControlLayout } from '@/layouts/MissionControlLayout'
import { CommandCenterPage } from '@/pages/CommandCenterPage'
import { AgentsPage } from '@/pages/AgentsPage'
import { AgentConfigPage } from '@/pages/AgentConfigPage'
import { TasksPage } from '@/pages/TasksPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { OfficePage } from '@/pages/OfficePage'
import { ActivityPage } from '@/pages/ActivityPage'
import { SkillsPage } from '@/pages/SkillsPage'
import { RuntimePage } from '@/pages/RuntimePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ActionSafetyPage } from '@/pages/ActionSafetyPage'
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
        path: 'agent-config',
        element: <AgentConfigPage />,
      },
      {
        path: 'profiles',
        element: <Navigate to="/agent-config" replace />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
      },
      {
        path: 'schedule',
        element: <SchedulePage />,
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
        path: 'system/action-safety',
        element: <ActionSafetyPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
