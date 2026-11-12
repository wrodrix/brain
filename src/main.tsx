import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"

import { App } from "./App"
import { TooltipProvider } from "./components/ui/tooltip"
import { DemoProvider } from "./demo/DemoProvider"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DemoProvider>
        <TooltipProvider>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </DemoProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
