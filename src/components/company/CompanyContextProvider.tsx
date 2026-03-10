'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { CompanyWithRole } from '@/types/company'

interface CompanyContextProviderProps {
  activeCompany: CompanyWithRole | null
  userCompanies: CompanyWithRole[]
}

export function CompanyContextProvider({
  activeCompany,
  userCompanies,
}: CompanyContextProviderProps) {
  const { setActiveCompany, setUserCompanies } = useAuthStore()

  useEffect(() => {
    setUserCompanies(userCompanies)
    setActiveCompany(activeCompany)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.id, userCompanies.length])

  return null
}
