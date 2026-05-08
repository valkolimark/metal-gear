import { getEnabledArchetypes } from '@/lib/archetypes'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const enabledArchetypes = await getEnabledArchetypes()
  return <OnboardingClient enabledArchetypes={enabledArchetypes} />
}
