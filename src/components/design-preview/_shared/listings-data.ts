export type ConditionKey = 'new' | 'excellent' | 'good' | 'fair' | 'for_parts'

export const COND: Record<ConditionKey, { label: string; color: string }> = {
  new: { label: 'New', color: '#22C55E' },
  excellent: { label: 'Excellent', color: '#0EA5E9' },
  good: { label: 'Good', color: '#1877F2' },
  fair: { label: 'Fair', color: '#F59E0B' },
  for_parts: { label: 'For parts', color: '#94A3B8' },
}

export const PHOTO_BG = [
  'linear-gradient(135deg, #1E3A8A 0%, #1877F2 100%)',
  'linear-gradient(135deg, #831843 0%, #BE185D 100%)',
  'linear-gradient(135deg, #064E3B 0%, #059669 100%)',
  'linear-gradient(135deg, #78350F 0%, #EA580C 100%)',
  'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
  'linear-gradient(135deg, #312E81 0%, #6366F1 100%)',
  'linear-gradient(135deg, #155E75 0%, #06B6D4 100%)',
  'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
  'linear-gradient(135deg, #365314 0%, #65A30D 100%)',
]
