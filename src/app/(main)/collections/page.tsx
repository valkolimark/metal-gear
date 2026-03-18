'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
  Globe,
  Lock,
  MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores/auth-store'
import {
  getCollections,
  createCollection,
  deleteCollection,
  updateCollection,
} from '@/app/actions/collections'

export default function CollectionsPage() {
  const { user } = useAuthStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPublic, setNewPublic] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadCollections = useCallback(async () => {
    const result = await getCollections()
    if ('collections' in result) {
      setCollections(result.collections ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadCollections()
  }, [user, loadCollections])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const result = await createCollection(newName.trim(), newDesc.trim() || undefined, newPublic)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Radar list created')
      setCreateOpen(false)
      setNewName('')
      setNewDesc('')
      setNewPublic(false)
      loadCollections()
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteCollection(id)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Radar list deleted')
      setCollections((prev) => prev.filter((c) => c.id !== id))
    }
  }

  async function handleTogglePublic(id: string, isPublic: boolean) {
    const result = await updateCollection(id, { is_public: !isPublic })
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_public: !isPublic } : c))
      )
      toast.success(isPublic ? 'Radar list is now private' : 'Radar list is now public')
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            My Radar
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Organize equipment you&rsquo;ve got on your radar
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="font-body">
          <Plus className="mr-2 size-4" />
          New Radar List
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : collections.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <FolderOpen className="size-12 text-muted-foreground" />
            <p className="font-display text-lg font-semibold text-foreground">
              Nothing on your radar yet
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              Create radar lists to organize equipment you&rsquo;re tracking.
              Group listings by project, budget, or equipment type.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="font-body">
              <Plus className="mr-2 size-4" />
              Create Your First Radar List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Favorites card - links to existing favorites page */}
          <Link href="/favorites">
            <Card className="h-full border-border bg-card transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                    <span className="text-lg">❤️</span>
                  </div>
                </div>
                <p className="mt-3 font-display text-lg font-semibold text-foreground">
                  Favorites
                </p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Your default saved listings
                </p>
              </CardContent>
            </Card>
          </Link>

          {collections.map((collection) => {
            const itemCount =
              collection.collection_items?.[0]?.count ?? 0
            return (
              <div key={collection.id} className="relative">
                <Link href={`/collections/${collection.id}`}>
                  <Card className="h-full border-border bg-card transition-colors hover:border-primary/50">
                    <CardContent className="flex flex-col p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          <FolderOpen className="size-5 text-primary" />
                        </div>
                        <Badge
                          variant="outline"
                          className="gap-1 font-body text-[10px]"
                        >
                          {collection.is_public ? (
                            <Globe className="size-2.5" />
                          ) : (
                            <Lock className="size-2.5" />
                          )}
                          {collection.is_public ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                      <p className="mt-3 font-display text-lg font-semibold text-foreground">
                        {collection.name}
                      </p>
                      {collection.description && (
                        <p className="mt-1 line-clamp-2 font-body text-sm text-muted-foreground">
                          {collection.description}
                        </p>
                      )}
                      <p className="mt-auto pt-3 font-body text-xs text-muted-foreground">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
                <div className="absolute right-3 top-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleTogglePublic(collection.id, collection.is_public)
                        }
                        className="font-body"
                      >
                        {collection.is_public ? (
                          <>
                            <Lock className="mr-2 size-3.5" />
                            Make Private
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 size-3.5" />
                            Make Public
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(collection.id)}
                        className="font-body text-destructive"
                      >
                        <Trash2 className="mr-2 size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">New Radar List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name" className="font-body">
                Name
              </Label>
              <Input
                id="collection-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., CNC Machines Under $50K"
                className="font-body"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-desc" className="font-body">
                Description (optional)
              </Label>
              <Input
                id="collection-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this radar list for?"
                className="font-body"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="collection-public" className="font-body">
                  Public radar list
                </Label>
                <p className="font-body text-xs text-muted-foreground">
                  Anyone can view this radar list
                </p>
              </div>
              <Switch
                id="collection-public"
                checked={newPublic}
                onCheckedChange={setNewPublic}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="font-body"
            >
              {creating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
