import * as React from "react"

import { createInitialState } from "./fixtures"
import { demoReducer, type DemoAction } from "./simulator"
import type { DemoState } from "./types"

interface DemoContextValue {
  state: DemoState
  dispatch: React.Dispatch<DemoAction>
  advance: () => void
  play: () => void
  pause: () => void
  reset: () => void
  setScenario: (scenario: DemoState["ui"]["scenario"]) => void
}

const DemoContext = React.createContext<DemoContextValue | null>(null)

export function DemoProvider({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState?: DemoState
}) {
  const [state, dispatch] = React.useReducer(
    demoReducer,
    initialState,
    (provided) => provided ?? createInitialState("normal"),
  )

  React.useEffect(() => {
    if (!state.ui.sim.playing) return
    const hasPendingQueue = state.ui.queue.some(
      (item) => item.state === "admitted" || item.state === "delivered",
    )
    if (state.ui.sim.tick >= state.ui.sim.totalTicks && !hasPendingQueue) return
    const timer = window.setTimeout(() => dispatch({ type: "ADVANCE" }), 850)
    return () => window.clearTimeout(timer)
  }, [
    state.ui.sim.playing,
    state.ui.sim.tick,
    state.ui.sim.totalTicks,
    state.ui.queue,
  ])

  const value = React.useMemo<DemoContextValue>(
    () => ({
      state,
      dispatch,
      advance: () => dispatch({ type: "ADVANCE" }),
      play: () => dispatch({ type: "SET_PLAYING", playing: true }),
      pause: () => dispatch({ type: "SET_PLAYING", playing: false }),
      reset: () => dispatch({ type: "RESET" }),
      setScenario: (scenario) => dispatch({ type: "SET_SCENARIO", scenario }),
    }),
    [state],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const context = React.useContext(DemoContext)
  if (!context) throw new Error("useDemo precisa estar dentro de DemoProvider")
  return context
}
