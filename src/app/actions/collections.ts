'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getCollections() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: collections } = await admin
    .from('collections')
    .select('*, collection_items(count)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return { collections: collections || [] }
}

export async function getCollection(collectionId: string) {
  const admin = createAdminClient()

  const { data: collection } = await admin
    .from('collections')
    .select('*, owner:profiles!collections_user_id_fkey(full_name, display_name, avatar_url)')
    .eq('id', collectionId)
    .single()

  if (!collection) return { error: 'Collection not found' }

  // Check access - public collections are visible to anyone
  if (!collection.is_public) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== collection.user_id) {
      return { error: 'Collection not found' }
    }
  }

  // Fetch items with listing data
  const { data: items } = await admin
    .from('collection_items')
    .select('*, listings(*)')
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false })

  return { collection, items: items || [] }
}

export async function createCollection(
  name: string,
  description?: string,
  isPublic?: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: collection, error } = await admin
    .from('collections')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      is_public: isPublic || false,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { collection }
}

export async function updateCollection(
  collectionId: string,
  data: {
    name?: string
    description?: string | null
    is_public?: boolean
    cover_image_url?: string | null
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify ownership
  const { data: collection } = await admin
    .from('collections')
    .select('user_id')
    .eq('id', collectionId)
    .single()

  if (!collection || collection.user_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await admin
    .from('collections')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', collectionId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteCollection(collectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: collection } = await admin
    .from('collections')
    .select('user_id')
    .eq('id', collectionId)
    .single()

  if (!collection || collection.user_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await admin
    .from('collections')
    .delete()
    .eq('id', collectionId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function addToCollection(
  collectionId: string,
  listingId: string,
  notes?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify ownership
  const { data: collection } = await admin
    .from('collections')
    .select('user_id')
    .eq('id', collectionId)
    .single()

  if (!collection || collection.user_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await admin
    .from('collection_items')
    .upsert(
      {
        collection_id: collectionId,
        listing_id: listingId,
        notes: notes || null,
      },
      { onConflict: 'collection_id,listing_id' }
    )

  if (error) return { error: error.message }

  // Update collection timestamp
  await admin
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', collectionId)

  return { success: true }
}

export async function removeFromCollection(
  collectionId: string,
  listingId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: collection } = await admin
    .from('collections')
    .select('user_id')
    .eq('id', collectionId)
    .single()

  if (!collection || collection.user_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await admin
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('listing_id', listingId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getListingCollections(listingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get user's collections with whether this listing is in them
  const { data: collections } = await admin
    .from('collections')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name')

  const { data: items } = await admin
    .from('collection_items')
    .select('collection_id')
    .eq('listing_id', listingId)

  const inCollections = new Set((items || []).map((i) => i.collection_id))

  return {
    collections: (collections || []).map((c) => ({
      ...c,
      hasListing: inCollections.has(c.id),
    })),
  }
}

export async function getPublicCollections(userId: string) {
  const admin = createAdminClient()

  const { data: collections } = await admin
    .from('collections')
    .select('*, collection_items(count)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })

  return { collections: collections || [] }
}
