import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/app/auth/RequireAuth'
import { AppShell } from '@/app/layout/AppShell'
import { ClientesPage } from '@/pages/ClientesPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ImportarPage } from '@/pages/ImportarPage'
import { IndexPage } from '@/pages/IndexPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'cadastre-se', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        path: 'clientes',
        element: (
          <RequireAuth>
            <ClientesPage />
          </RequireAuth>
        ),
      },
      {
        path: 'importar',
        element: (
          <RequireAuth>
            <ImportarPage />
          </RequireAuth>
        ),
      },
    ],
  },
])
