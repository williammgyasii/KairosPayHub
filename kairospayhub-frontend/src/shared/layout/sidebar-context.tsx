import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  mobileOpen: boolean
  setCollapsed: (value: boolean) => void
  toggleCollapsed: () => void
  setMobileOpen: (value: boolean) => void
  toggleMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'kph-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setCollapsedState(true)
  }, [])

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    localStorage.setItem(STORAGE_KEY, String(value))
  }

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      mobileOpen,
      setCollapsed,
      toggleCollapsed: () => setCollapsed(!collapsed),
      setMobileOpen,
      toggleMobile: () => setMobileOpen((open) => !open),
    }),
    [collapsed, mobileOpen],
  )

  return <SidebarContext value={value}>{children}</SidebarContext>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
