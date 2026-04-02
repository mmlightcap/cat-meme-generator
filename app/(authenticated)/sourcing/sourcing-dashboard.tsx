"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  addMonitoredQuery,
  checkBigRun,
  deleteArticleLead,
  deleteCreator,
  importBigRunResults,
  promoteToCreator,
  reenrichArticleLeads,
  refreshArticleFeed,
  removeMonitoredQuery,
  searchCreators,
  startBigRun,
  updateCreator,
} from "@/lib/actions/creators"
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Rss,
  Search,
  Sparkles,
  Star,
  Trash2,
  Users,
  Wand2,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

// ── Types ──────────────────────────────────────────

type Creator = {
  id: string
  name: string
  bio: string | null
  category: string | null
  socialHandles: unknown
  businessName: string | null
  businessDesc: string | null
  articleUrl: string | null
  articleTitle: string | null
  publication: string | null
  audienceSize: string | null
  stage: string
  notes: string | null
  score: number | null
  searchQuery: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
}

type ArticleLead = {
  id: string
  creatorName: string
  bio: string | null
  category: string | null
  businessName: string | null
  businessDesc: string | null
  articleUrl: string
  articleTitle: string | null
  publication: string | null
  audienceSize: string | null
  socialHandles: unknown
  articleDate: string | null
  searchQuery: string | null
  addedAt: Date
  promoted: boolean
  userId: string
}

type MonitoredQuery = {
  id: string
  query: string
  active: boolean
  lastRunAt: Date | null
  createdAt: Date
  userId: string
}

type SearchRun = {
  id: string
  query: string
  status: string
  results: number
  createdAt: Date
  userId: string
}

type BigRun = {
  id: string
  findallId: string
  status: string
  matchedCount: number
  importedCount: number
  createdAt: Date
  completedAt: Date | null
  userId: string
}

// ── Constants ──────────────────────────────────────

const STAGES = [
  { value: "sourced", label: "Sourced" },
  { value: "contacted", label: "Contacted" },
  { value: "meeting", label: "Meeting" },
  { value: "passed", label: "Passed" },
  { value: "invested", label: "Invested" },
]

const SUGGESTED_QUERIES = [
  "social media creator launched own brand",
  "content creator entrepreneur business profile",
  "influencer started company interview",
  "TikTok creator building business",
  "YouTube creator fashion brand founder",
  "food creator entrepreneur restaurant product line",
  "Instagram influencer business owner local news",
]

// ── Helpers ────────────────────────────────────────

function SocialBadges({ handles }: { handles: unknown }) {
  if (!handles || typeof handles !== "object") return null
  const h = handles as Record<string, string>
  return (
    <div className="flex flex-wrap gap-1">
      {h.instagram && (
        <Badge variant="outline" className="text-xs">IG: @{h.instagram}</Badge>
      )}
      {h.tiktok && (
        <Badge variant="outline" className="text-xs">TT: @{h.tiktok}</Badge>
      )}
      {h.youtube && (
        <Badge variant="outline" className="text-xs">YT: {h.youtube}</Badge>
      )}
      {h.twitter && (
        <Badge variant="outline" className="text-xs">X: @{h.twitter}</Badge>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────

export function SourcingDashboard({
  initialCreators,
  initialSearchRuns,
  initialArticleLeads,
  initialMonitoredQueries,
  initialBigRuns,
}: {
  initialCreators: Creator[]
  initialSearchRuns: SearchRun[]
  initialArticleLeads: ArticleLead[]
  initialMonitoredQueries: MonitoredQuery[]
  initialBigRuns: BigRun[]
}) {
  const [creators, setCreators] = useState<Creator[]>(initialCreators)
  const [searchRuns] = useState<SearchRun[]>(initialSearchRuns)
  const [articleLeads, setArticleLeads] = useState<ArticleLead[]>(initialArticleLeads)
  const [monitoredQueries, setMonitoredQueries] = useState<MonitoredQuery[]>(initialMonitoredQueries)
  const [bigRuns, setBigRuns] = useState<BigRun[]>(initialBigRuns)

  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [stageFilter, setStageFilter] = useState("all")
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)

  const [newMonitorQuery, setNewMonitorQuery] = useState("")
  const [addingMonitor, setAddingMonitor] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [startingBigRun, setStartingBigRun] = useState(false)
  const [importingRunId, setImportingRunId] = useState<string | null>(null)
  const [reenriching, setReenriching] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const router = useRouter()

  // Poll any running big runs every 10 seconds
  const pollBigRuns = useCallback(async () => {
    const running = bigRuns.filter((r) => r.status === "running")
    if (running.length === 0) return

    for (const run of running) {
      const updated = await checkBigRun(run.id)
      setBigRuns((prev) =>
        prev.map((r) =>
          r.id === run.id
            ? { ...r, status: updated.status, matchedCount: updated.matchedCount }
            : r
        )
      )
    }
  }, [bigRuns])

  useEffect(() => {
    const hasRunning = bigRuns.some((r) => r.status === "running")
    if (hasRunning) {
      pollingRef.current = setInterval(pollBigRuns, 10000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [bigRuns, pollBigRuns])

  const handleStartBigRun = async () => {
    setStartingBigRun(true)
    try {
      const run = await startBigRun(75)
      setBigRuns((prev) => [run, ...prev])
    } finally {
      setStartingBigRun(false)
    }
  }

  const handleImportBigRun = async (runId: string) => {
    setImportingRunId(runId)
    try {
      const result = await importBigRunResults(runId)
      if (result.success) {
        setBigRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, importedCount: result.imported } : r))
        )
        // Reload article leads
        const { getArticleLeads } = await import("@/lib/actions/creators")
        const updated = await getArticleLeads()
        setArticleLeads(updated)
      }
    } finally {
      setImportingRunId(null)
    }
  }

  // ── Creator Pipeline Handlers ──

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const result = await searchCreators(query)
      if (result.success && result.creators.length > 0) {
        setCreators((prev) => [...result.creators, ...prev])
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleStageChange = async (creatorId: string, newStage: string) => {
    await updateCreator(creatorId, { stage: newStage })
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, stage: newStage } : c))
    )
    if (selectedCreator?.id === creatorId) {
      setSelectedCreator((prev) => (prev ? { ...prev, stage: newStage } : null))
    }
  }

  const handleScoreChange = async (creatorId: string, score: number) => {
    await updateCreator(creatorId, { score })
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, score } : c))
    )
  }

  const handleNotesChange = async (creatorId: string, notes: string) => {
    await updateCreator(creatorId, { notes })
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, notes } : c))
    )
  }

  const handleDelete = async (creatorId: string) => {
    await deleteCreator(creatorId)
    setCreators((prev) => prev.filter((c) => c.id !== creatorId))
    if (selectedCreator?.id === creatorId) setSelectedCreator(null)
  }

  // ── Article Feed Handlers ──

  const handleAddMonitoredQuery = async () => {
    if (!newMonitorQuery.trim()) return
    setAddingMonitor(true)
    try {
      const q = await addMonitoredQuery(newMonitorQuery.trim())
      setMonitoredQueries((prev) => [q, ...prev])
      setNewMonitorQuery("")
    } finally {
      setAddingMonitor(false)
    }
  }

  const handleRemoveMonitoredQuery = async (id: string) => {
    await removeMonitoredQuery(id)
    setMonitoredQueries((prev) => prev.filter((q) => q.id !== id))
  }

  const handleRefreshFeed = async () => {
    setRefreshing(true)
    try {
      const result = await refreshArticleFeed()
      if (result.success) {
        router.refresh()
        // Refetch article leads
        const { getArticleLeads } = await import("@/lib/actions/creators")
        const updated = await getArticleLeads()
        setArticleLeads(updated)
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handlePromote = async (articleId: string) => {
    const creator = await promoteToCreator(articleId)
    setCreators((prev) => [creator, ...prev])
    setArticleLeads((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, promoted: true } : a))
    )
  }

  const handleDeleteArticle = async (articleId: string) => {
    await deleteArticleLead(articleId)
    setArticleLeads((prev) => prev.filter((a) => a.id !== articleId))
  }

  const handleReenrich = async () => {
    setReenriching(true)
    try {
      await reenrichArticleLeads()
      // Reload article leads with fresh data
      const { getArticleLeads } = await import("@/lib/actions/creators")
      const updated = await getArticleLeads()
      setArticleLeads(updated)
    } finally {
      setReenriching(false)
    }
  }

  // ── Filters ──

  const filteredCreators =
    stageFilter === "all"
      ? creators
      : creators.filter((c) => c.stage === stageFilter)

  const stageCounts = STAGES.reduce(
    (acc, s) => {
      acc[s.value] = creators.filter((c) => c.stage === s.value).length
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="h-8 w-8" />
          Creator Sourcing
        </h1>
        <p className="mt-2 text-muted-foreground">
          Search the web for entrepreneurial creators using Parallel.ai
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for Creators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="e.g., TikTok creator launched skincare brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              {searching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Big Run */}
      <Card className="mb-6 border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Big Run — Populate 50–100 Creators at Once
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Uses Parallel.ai FindAll to search the entire web for articles matching your exact
            sourcing criteria — niche passion + real business + social audience + press profile.
            Takes 5–15 minutes. Results go straight into your Article Feed.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleStartBigRun}
              disabled={startingBigRun || bigRuns.some((r) => r.status === "running")}
              size="lg"
            >
              {startingBigRun ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Big Run
                </>
              )}
            </Button>
            {bigRuns.some((r) => r.status === "running") && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running... checking every 10s
              </span>
            )}
          </div>

          {bigRuns.length > 0 && (
            <div className="space-y-2">
              {bigRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        run.status === "completed"
                          ? "default"
                          : run.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {run.status === "running" ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Running
                        </span>
                      ) : run.status}
                    </Badge>
                    <span className="text-sm">
                      {run.matchedCount} matched
                      {run.importedCount > 0 && ` · ${run.importedCount} imported`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {run.status === "completed" && run.importedCount === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImportBigRun(run.id)}
                      disabled={importingRunId === run.id}
                    >
                      {importingRunId === run.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-3 w-3" />
                      )}
                      Import to Feed
                    </Button>
                  )}
                  {run.importedCount > 0 && (
                    <Badge variant="secondary">
                      <Check className="mr-1 h-3 w-3" />
                      Imported
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STAGES.map((s) => (
          <Card
            key={s.value}
            className={`cursor-pointer transition-all ${stageFilter === s.value ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStageFilter(stageFilter === s.value ? "all" : s.value)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stageCounts[s.value] || 0}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pipeline">Creator Pipeline</TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-1.5">
              <Rss className="h-3.5 w-3.5" />
              Article Feed
              {articleLeads.filter((a) => !a.promoted).length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {articleLeads.filter((a) => !a.promoted).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Search History</TabsTrigger>
          </TabsList>
          {stageFilter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setStageFilter("all")}>
              Clear filter
            </Button>
          )}
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* Creator Pipeline Tab                        */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="pipeline">
          <Card>
            <CardContent className="p-0">
              {filteredCreators.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {creators.length === 0
                      ? "No creators yet. Run a search or check the Article Feed!"
                      : "No creators match this filter."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCreators.map((creator) => (
                        <TableRow
                          key={creator.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => setSelectedCreator(creator)}
                        >
                          <TableCell>
                            <div className="min-w-[200px]">
                              <div className="font-medium">{creator.name}</div>
                              {creator.bio && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 max-w-[280px]">
                                  {creator.bio}
                                </div>
                              )}
                              <SocialBadges handles={creator.socialHandles} />
                            </div>
                          </TableCell>
                          <TableCell>
                            {creator.category && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {creator.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[120px]">
                              {creator.businessName && (
                                <div className="text-sm font-medium">{creator.businessName}</div>
                              )}
                              {creator.businessDesc && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {creator.businessDesc}
                                </div>
                              )}
                              {!creator.businessName && !creator.businessDesc && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{creator.audienceSize || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[100px]">
                              <span className="text-xs text-muted-foreground">
                                {creator.publication || "—"}
                              </span>
                              {creator.articleUrl && (
                                <a
                                  href={creator.articleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Article
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={creator.stage}
                              onValueChange={(val) => handleStageChange(creator.id, val)}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAGES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => handleScoreChange(creator.id, n)}
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      (creator.score || 0) >= n
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground/30"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(creator.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════ */}
        {/* Article Feed Tab (always-on)                */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="feed" className="space-y-4">
          {/* Monitored Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Rss className="h-4 w-4" />
                Monitored Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add search queries below. When you hit &quot;Refresh Feed&quot;, all queries run in
                parallel and new articles are added automatically. Duplicates are skipped.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., creator entrepreneur launched brand"
                  value={newMonitorQuery}
                  onChange={(e) => setNewMonitorQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMonitoredQuery()}
                />
                <Button
                  onClick={handleAddMonitoredQuery}
                  disabled={addingMonitor || !newMonitorQuery.trim()}
                  size="sm"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
                <Button
                  onClick={handleRefreshFeed}
                  disabled={refreshing || monitoredQueries.length === 0}
                  variant="default"
                  size="sm"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Refresh Feed
                    </>
                  )}
                </Button>
              </div>
              {monitoredQueries.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {monitoredQueries.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-sm"
                    >
                      <span>{q.query}</span>
                      {q.lastRunAt && (
                        <span className="text-xs text-muted-foreground">
                          (last: {new Date(q.lastRunAt).toLocaleDateString()})
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveMonitoredQuery(q.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Article Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Article Leads ({articleLeads.length})</span>
                {articleLeads.some((a) => !a.publication || a.publication === "Unknown") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReenrich}
                    disabled={reenriching}
                  >
                    {reenriching ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Enriching...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                        Fix Unknown Articles
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {articleLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Rss className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No articles yet. Add a monitored query and hit Refresh Feed!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Article Date
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Date Added
                          </div>
                        </TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articleLeads.map((article) => (
                        <TableRow
                          key={article.id}
                          className={article.promoted ? "opacity-50" : ""}
                        >
                          <TableCell>
                            <div className="min-w-[200px]">
                              <div className="font-medium">{article.creatorName}</div>
                              {article.bio && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 max-w-[280px]">
                                  {article.bio}
                                </div>
                              )}
                              <SocialBadges handles={article.socialHandles} />
                            </div>
                          </TableCell>
                          <TableCell>
                            {article.category && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {article.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[120px]">
                              {article.businessName && (
                                <div className="text-sm font-medium">
                                  {article.businessName}
                                </div>
                              )}
                              {article.businessDesc && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {article.businessDesc}
                                </div>
                              )}
                              {!article.businessName && !article.businessDesc && "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {article.audienceSize || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[140px]">
                              <span className="text-xs text-muted-foreground">
                                {article.publication || "Unknown"}
                              </span>
                              <a
                                href={article.articleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {article.articleTitle
                                  ? article.articleTitle.length > 40
                                    ? article.articleTitle.slice(0, 40) + "..."
                                    : article.articleTitle
                                  : "View Article"}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {article.articleDate || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(article.addedAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!article.promoted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePromote(article.id)}
                                  title="Add to pipeline"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                                  Pipeline
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Added
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteArticle(article.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════ */}
        {/* Search History Tab                          */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {searchRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No searches yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.query}</TableCell>
                        <TableCell>
                          <Badge
                            variant={run.status === "completed" ? "default" : "destructive"}
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{run.results}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(run.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════ */}
      {/* Creator Detail Side Panel                   */}
      {/* ════════════════════════════════════════════ */}
      {selectedCreator && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-lg z-50 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedCreator.name}</h2>
                {selectedCreator.category && (
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {selectedCreator.category}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCreator(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedCreator.bio && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Bio</h3>
                <p className="text-sm text-muted-foreground">{selectedCreator.bio}</p>
              </div>
            )}

            {(selectedCreator.businessName || selectedCreator.businessDesc) && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Business</h3>
                {selectedCreator.businessName && (
                  <p className="text-sm font-medium">{selectedCreator.businessName}</p>
                )}
                {selectedCreator.businessDesc && (
                  <p className="text-sm text-muted-foreground">{selectedCreator.businessDesc}</p>
                )}
              </div>
            )}

            {selectedCreator.audienceSize && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Audience</h3>
                <p className="text-sm">{selectedCreator.audienceSize}</p>
              </div>
            )}

            <SocialBadges handles={selectedCreator.socialHandles} />

            {selectedCreator.articleUrl && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Source Article</h3>
                <p className="text-xs text-muted-foreground mb-1">
                  {selectedCreator.publication || "Unknown publication"}
                </p>
                <a
                  href={selectedCreator.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {selectedCreator.articleTitle || "View Article"}
                </a>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-1">Stage</h3>
              <Select
                value={selectedCreator.stage}
                onValueChange={(val) => handleStageChange(selectedCreator.id, val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Score</h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleScoreChange(selectedCreator.id, n)}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        (selectedCreator.score || 0) >= n
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Notes</h3>
              <Textarea
                placeholder="Add notes about this creator..."
                defaultValue={selectedCreator.notes || ""}
                onBlur={(e) => handleNotesChange(selectedCreator.id, e.target.value)}
                rows={4}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Found via: &quot;{selectedCreator.searchQuery}&quot;</p>
              <p>Added: {new Date(selectedCreator.createdAt).toLocaleDateString()}</p>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => handleDelete(selectedCreator.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Creator
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
