import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Spinner as SpinnerIcon } from "./components/ui/Spinner";
import { useAuth } from "./lib/auth";
import { useMyCommunities } from "./lib/community";
import { useMySkillsStatus } from "./lib/skills";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyMagicLink } from "./pages/VerifyMagicLink";
import { Scan } from "./pages/Scan";
import { LinkedinConnect } from "./pages/LinkedinConnect";
import { Skills } from "./pages/Skills";
import { Matches } from "./pages/Matches";
import { MatchDetail } from "./pages/MatchDetail";
import { Profile } from "./pages/Profile";
import { JoinCommunity } from "./pages/JoinCommunity";
import { Styleguide } from "./pages/Styleguide";

function Spinner() {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg">
      <SpinnerIcon size="sm" />
    </div>
  );
}

/** Gate for authenticated areas: redirect anonymous users to the login. */
function ProtectedRoute() {
  const { status } = useAuth();
  if (status === "loading") return <Spinner />;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <Outlet />;
}

/**
 * Onboarding gate: matching and skills only make sense inside a community.
 * A user with no membership is sent to the scan/join screen first. Scan and
 * profile stay reachable so they can actually complete onboarding.
 */
function RequireCommunity() {
  const { status, communities } = useMyCommunities();
  if (status === "loading") return <Spinner />;
  if (communities.length === 0) return <Navigate to="/scan" replace />;
  return <Outlet />;
}

/**
 * Second onboarding gate: matches only make sense once the user picked their
 * own skills. Someone who joined a community but quit before the skills step
 * resumes there instead of staring at an empty match list.
 */
function RequireSkills() {
  const { status, hasSkills } = useMySkillsStatus();
  if (status === "loading") return <Spinner />;
  if (!hasSkills) return <Navigate to="/skills" replace />;
  return <Outlet />;
}

/** Screens that live inside the app shell (bottom nav). */
function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },

  // Auth (no shell)
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/auth/verify", element: <VerifyMagicLink /> },

  // Onboarding + app (with shell) — requires a session
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <ShellLayout />,
        children: [
          // Always reachable once logged in (onboarding entry points).
          { path: "/scan", element: <Scan /> },
          { path: "/profile", element: <Profile /> },
          // Gated behind community membership.
          {
            element: <RequireCommunity />,
            children: [
              { path: "/connect-linkedin", element: <LinkedinConnect /> },
              { path: "/skills", element: <Skills /> },
              // Matches additionally require the user's own skills.
              {
                element: <RequireSkills />,
                children: [
                  { path: "/matches", element: <Matches /> },
                  { path: "/matches/:id", element: <MatchDetail /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Standalone
  // Deep link from shared/printed QR codes — public, routes by auth state.
  { path: "/join/:code", element: <JoinCommunity /> },
  { path: "/styleguide", element: <Styleguide /> },

  { path: "*", element: <Navigate to="/login" replace /> },
]);
