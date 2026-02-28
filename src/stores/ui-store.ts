import { create } from 'zustand'

interface UIStore {
  // Sidebar (mobile navigation drawer)
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Mobile search bar
  mobileSearchOpen: boolean
  setMobileSearchOpen: (open: boolean) => void
  toggleMobileSearch: () => void

  // Modals
  activeModal: string | null
  openModal: (id: string) => void
  closeModal: () => void

  // Notifications
  unreadMessages: number
  unreadNotifications: number
  setUnreadMessages: (count: number) => void
  setUnreadNotifications: (count: number) => void
  incrementUnreadNotifications: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  // Mobile search
  mobileSearchOpen: false,
  setMobileSearchOpen: (mobileSearchOpen) => set({ mobileSearchOpen }),
  toggleMobileSearch: () =>
    set((state) => ({ mobileSearchOpen: !state.mobileSearchOpen })),

  // Modals
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  // Notifications
  unreadMessages: 0,
  unreadNotifications: 0,
  setUnreadMessages: (unreadMessages) => set({ unreadMessages }),
  setUnreadNotifications: (unreadNotifications) =>
    set({ unreadNotifications }),
  incrementUnreadNotifications: () =>
    set((state) => ({ unreadNotifications: state.unreadNotifications + 1 })),
}))
