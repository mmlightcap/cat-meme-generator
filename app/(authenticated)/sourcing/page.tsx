import {
  getArticleLeads,
  getBigRuns,
  getCreators,
  getMonitoredQueries,
  getSearchRuns,
} from "@/lib/actions/creators"
import { SourcingDashboard } from "./sourcing-dashboard"

export default async function SourcingPage() {
  const [creators, searchRuns, articleLeads, monitoredQueries, bigRuns] =
    await Promise.all([
      getCreators(),
      getSearchRuns(),
      getArticleLeads(),
      getMonitoredQueries(),
      getBigRuns(),
    ])

  return (
    <SourcingDashboard
      initialCreators={creators}
      initialSearchRuns={searchRuns}
      initialArticleLeads={articleLeads}
      initialMonitoredQueries={monitoredQueries}
      initialBigRuns={bigRuns}
    />
  )
}
