import { def as collections } from "./collections"
import { def as environments } from "./environments"
import { def as history } from "./history"
import { def as settings } from "./settings"

/**
 * Centralized sync handles. The dispatcher/subscriber wiring lives in
 * `lib/sync/{collections,environments,history,settings}` and talks to the
 * Postgres backend directly — every shell (web, desktop, selfhost) shares the
 * same code path, so there's no per-platform forking here.
 */
export const sync = {
  collections,
  environments,
  history,
  settings,
}
