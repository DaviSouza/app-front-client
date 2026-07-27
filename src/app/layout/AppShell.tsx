import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, LogIn, LogOut, Upload, Users } from 'lucide-react'

import { useAuth } from '@/app/auth/AuthContext'
import { cn } from '@/shared/lib/cn'
import { RealtimePopups } from '@/shared/realtime/RealtimePopups'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

const navLinkBase =
  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground'

export function AppShell() {
  const auth = useAuth()
  const navigate = useNavigate()
  const isAuthenticated = auth.isAuthenticated
  const userEmail = auth.userEmail

  const doLogout = () => {
    void auth.logout().finally(() => navigate('/login'))
  }

  return (
    <div className="min-h-dvh bg-background">
      <RealtimePopups />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-b md:min-h-dvh md:border-b-0 md:border-r">
          <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
            <span className="text-sm font-semibold">App Front Client</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (isAuthenticated) {
                  doLogout()
                } else {
                  navigate('/login')
                }
              }}
            >
              {isAuthenticated ? (
                <>
                  <LogOut className="h-4 w-4" />
                  Sair
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </div>
          <Separator />
          <nav className="flex flex-col gap-1 p-2 md:p-4">
            {isAuthenticated && userEmail ? (
              <div className="px-3 pb-2 text-sm text-muted-foreground">{userEmail}</div>
            ) : null}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(navLinkBase, isActive && 'bg-accent text-accent-foreground')
              }
            >
              <LayoutGrid />
              Index
            </NavLink>
            <NavLink
              to="/clientes"
              className={({ isActive }) =>
                cn(navLinkBase, isActive && 'bg-accent text-accent-foreground')
              }
            >
              <Users />
              Cliente
            </NavLink>
            <NavLink
              to="/importar"
              className={({ isActive }) =>
                cn(navLinkBase, isActive && 'bg-accent text-accent-foreground')
              }
            >
              <Upload />
              Importar
            </NavLink>
          </nav>
        </aside>

        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
