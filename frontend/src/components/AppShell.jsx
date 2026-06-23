import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  Receipt,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/vehicles", label: "Vehicles", icon: Car },
  { to: "/jobs", label: "Job orders", icon: Wrench },
  { to: "/invoices", label: "Invoices", icon: Receipt },
];

export default function AppShell() {
  const { logout } = useAuth();

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-mark">⛭</span>
          <span className="shell__brand-name">Torquehouse</span>
        </div>

        <nav className="shell__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                "shell__nav-link" + (isActive ? " shell__nav-link--active" : "")
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button className="shell__logout" onClick={logout}>
          <LogOut size={18} strokeWidth={2} />
          Sign out
        </button>
      </aside>

      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
