'use client'

import { useSyncExternalStore, useCallback } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const STORAGE_KEY = 'mg.sidebar.collapsed'
const STORAGE_EVENT = 'mg.sidebar.collapsed.changed'

function applyState(collapsed: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-sidebar-collapsed', String(collapsed))
  const sidebar = document.querySelector('[data-sidebar]')
  if (sidebar) sidebar.setAttribute('data-nav-state', collapsed ? 'collapsed' : 'expanded')
}

function readStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function subscribe(notify: () => void) {
  if (typeof window === 'undefined') return () => {}
  function handler() {
    notify()
  }
  window.addEventListener(STORAGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function AppSidebarToggle() {
  // SSR-safe read of localStorage. Server snapshot returns `false` (default
  // expanded); the inline <SidebarStatePreloader> script has already stamped
  // the correct value onto <html>, so first paint is correct regardless.
  const collapsed = useSyncExternalStore(
    subscribe,
    readStorage,
    () => false,
  )

  // Side-effect: on each read, mirror the value into the DOM attributes.
  // (Cheap; runs only when collapsed changes.)
  if (typeof document !== 'undefined') {
    const current = document.documentElement.getAttribute('data-sidebar-collapsed')
    if (current !== String(collapsed)) {
      applyState(collapsed)
    }
  }

  const toggle = useCallback(() => {
    const next = !readStorage()
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
    applyState(next)
    window.dispatchEvent(new Event(STORAGE_EVENT))
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute -right-3 top-3 hidden size-6 items-center justify-center rounded-full border border-border bg-background text-foreground/80 shadow-sm hover:bg-muted md:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      data-nav-event="sidebar:toggle"
    >
      {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
    </button>
  )
}
