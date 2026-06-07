import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Scan } from "./pages/Scan";
import { Skills } from "./pages/Skills";
import { Matches } from "./pages/Matches";
import { MatchDetail } from "./pages/MatchDetail";
import { Profile } from "./pages/Profile";
import { Styleguide } from "./pages/Styleguide";

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

  // Onboarding + app (with shell)
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

  // Standalone
  { path: "/styleguide", element: <Styleguide /> },

  { path: "*", element: <Navigate to="/login" replace /> },
]);
