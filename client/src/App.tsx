import { Navigate, Route, Routes, useLocation } from "react-router"

import { AppShell } from "@/components/shell/app-shell"
import { Spinner } from "@/components/ui/spinner"
import { CreateCoverPage } from "@/pages/create-cover"
import { CreateMusicPage } from "@/pages/create-music"
import { MediaStudioPage, WorkflowsPage } from "@/pages/gated-studios"
import { SoundStudioPage } from "@/pages/studio-sound"
import { SpeechStudioPage } from "@/pages/studio-speech"
import { TranscribeStudioPage } from "@/pages/studio-transcribe"
import { VoicesPage } from "@/pages/voices"
import { JobDetailPage } from "@/pages/job-detail"
import { JobsPage } from "@/pages/jobs"
import { LibraryPage } from "@/pages/library"
import { LoginPage } from "@/pages/login"
import { NotFoundPage } from "@/pages/not-found"
import { OverviewPage } from "@/pages/overview"
import { ProjectDetailPage } from "@/pages/project-detail"
import { ProjectsPage } from "@/pages/projects"
import { SettingsPage } from "@/pages/settings"
import { TrackDetailPage } from "@/pages/track-detail"
import { UsagePage } from "@/pages/usage"
import { useAuth } from "@/providers/auth-provider"

export function App() {
  const { status } = useAuth()

  if (status === "loading") {
    return (
      <div
        className="flex min-h-svh items-center justify-center"
        role="status"
        aria-label="Loading session"
      >
        <Spinner className="size-5" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="login" element={<LoginRoute />} />
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="create/music" element={<CreateMusicPage />} />
        <Route path="create/cover" element={<CreateCoverPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="tracks/:id" element={<TrackDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="studio/sound" element={<SoundStudioPage />} />
        <Route path="studio/speech" element={<SpeechStudioPage />} />
        <Route path="voices" element={<VoicesPage />} />
        <Route path="studio/transcribe" element={<TranscribeStudioPage />} />
        <Route path="studio/media" element={<MediaStudioPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

/** Sign-in page; once authenticated, return to where the user came from. */
function LoginRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === "authenticated") {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== "/login" ? from : "/"} replace />
  }
  return <LoginPage />
}

export default App
