import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./lib/auth";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyMagicLink } from "./pages/VerifyMagicLink";
import { Scan } from "./pages/Scan";
import { Skills } from "./pages/Skills";
import { Matches } from "./pages/Matches";
import { MatchDetail } from "./pages/MatchDetail";
import { Profile } from "./pages/Profile";
import { Styleguide } from "./pages/Styleguide";

/** Gate for authenticated areas: redirect anonymous users to the login. */
function ProtectedRoute() {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="flex min-h-full items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }
  if (status === "anonymous") return <Navigate to="/login" replace />;
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
          { path: "/scan", element: <Scan /> },
          { path: "/skills", element: <Skills /> },
          { path: "/matches", element: <Matches /> },
          { path: "/matches/:id", element: <MatchDetail /> },
          { path: "/profile", element: <Profile /> },
        ],
      },
    ],
  },

  // Standalone
  { path: "/styleguide", element: <Styleguide /> },

  { path: "*", element: <Navigate to="/login" replace /> },
]);
