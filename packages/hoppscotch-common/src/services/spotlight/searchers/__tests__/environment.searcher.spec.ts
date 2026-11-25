import { TestContainer } from "dioc/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HoppAction, HoppActionWithArgs } from "~/helpers/actions"
import { SpotlightService } from "../.."
import { EnvironmentsSpotlightSearcherService } from "../environment.searcher"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

const actionsMock = vi.hoisted(() => ({
  value: [] as (HoppAction | HoppActionWithArgs)[],
  invokeAction: vi.fn(),
}))

vi.mock("~/helpers/actions", async () => {
  const { BehaviorSubject }: any = await vi.importActual("rxjs")

  return {
    __esModule: true,
    activeActions$: new BehaviorSubject(actionsMock.value),
    invokeAction: actionsMock.invokeAction,
  }
})

const envMock = vi.hoisted(() => ({
  selectedIndex$: null as any,
  currentEnv$: null as any,
}))

vi.mock("~/newstore/environments", async () => {
  const { BehaviorSubject }: any = await vi.importActual("rxjs")

  envMock.selectedIndex$ = new BehaviorSubject({ type: "NO_ENV_SELECTED" })
  envMock.currentEnv$ = new BehaviorSubject(null)

  return {
    __esModule: true,
    selectedEnvironmentIndex$: envMock.selectedIndex$,
    currentEnvironment$: envMock.currentEnv$,
    environments$: new BehaviorSubject([]),
    globalEnv$: new BehaviorSubject([]),
    duplicateEnvironment: vi.fn(),
    getGlobalVariables: vi.fn(() => []),
    setGlobalEnvVariables: vi.fn(),
    getLegacyGlobalEnvironment: vi.fn(() => null),
    addGlobalEnvVariable: vi.fn(),
  }
})

describe("EnvironmentsSpotlightSearcherService", () => {
  beforeEach(() => {
    actionsMock.invokeAction.mockReset()
  })

  const bindSearcher = () => {
    const container = new TestContainer()
    container.bindMock(SpotlightService, { registerSearcher: vi.fn() })
    return container.bind(EnvironmentsSpotlightSearcherService)
  }

  // A personal env stays selectable inside a team workspace, and the team
  // editor resolves by NAME — branching on workspace instead of the selected
  // env's scope silently edits a same-named team environment
  it("edits the personal environment when a personal env is selected", () => {
    envMock.selectedIndex$.next({ type: "MY_ENV", index: 0 })
    envMock.currentEnv$.next({ name: "shared-name", variables: [] })

    const searcher = bindSearcher()
    searcher.onDocSelected("edit_selected_env")

    expect(actionsMock.invokeAction).toHaveBeenCalledWith(
      "modals.my.environment.edit",
      { envName: "shared-name" }
    )
  })

  it("edits the team environment when a team env is selected", () => {
    envMock.selectedIndex$.next({
      type: "TEAM_ENV",
      teamEnvID: "env-1",
      teamID: "team-a",
      environment: { name: "shared-name", variables: [] },
    })
    envMock.currentEnv$.next({ name: "shared-name", variables: [] })

    const searcher = bindSearcher()
    searcher.onDocSelected("edit_selected_env")

    expect(actionsMock.invokeAction).toHaveBeenCalledWith(
      "modals.team.environment.edit",
      { envName: "shared-name" }
    )
  })
})
