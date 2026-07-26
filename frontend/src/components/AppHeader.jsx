import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Activity } from "lucide-react";

export function AppHeader() {
  const { user, logout, settings } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const onLogout = async () => {
    await logout();
    nav("/");
  };

  const name = settings?.site_name || "National SSPE Registry";
  const accent = settings?.site_name_accent || "SSPE";
  const tagline = settings?.tagline || "Pakistan · SSPE Surveillance Network";
  const logo = settings?.logo_data_url;

  // Highlight the accent word inside the name if present
  const renderName = () => {
    if (!accent || !name.toLowerCase().includes(accent.toLowerCase())) {
      return <>{name}</>;
    }
    const idx = name.toLowerCase().indexOf(accent.toLowerCase());
    const before = name.slice(0, idx);
    const match = name.slice(idx, idx + accent.length);
    const after = name.slice(idx + accent.length);
    return (<>{before}<span className="text-[#C48F38]">{match}</span>{after}</>);
  };

  return (
    <header className="w-full bg-white border-b border-[#E5E7E5] sticky top-0 z-40" data-testid="app-header">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
          {logo ? (
            <img src={logo} alt="logo" className="w-9 h-9 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-[#1B3B36] flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}
          <div className="leading-none">
            <div className="font-display text-lg text-[#172320] leading-tight">{renderName()}</div>
            <div className="uppercase-label mt-0.5">{tagline}</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {!user && (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-[#172320] hover:bg-[#F2F4F3]" data-testid="nav-doctor-login">Doctor Login</Link>
              <Link to="/admin/login" className="px-4 py-2 text-sm font-semibold text-[#172320] hover:bg-[#F2F4F3]" data-testid="nav-admin-login">Admin</Link>
              <Link to="/register" className="btn-pine px-4 py-2 text-sm font-semibold" data-testid="nav-register">Register as Doctor</Link>
            </>
          )}
          {user && (
            <>
              <div className="mr-3 text-right leading-tight">
                <div className="text-sm font-semibold text-[#172320]" data-testid="header-user-name">{user.name}</div>
                <div className="uppercase-label">{user.role}{user.status ? ` · ${user.status}` : ""}</div>
              </div>
              {user.role === "doctor" && !loc.pathname.startsWith("/doctor") && (
                <Link to="/doctor" className="btn-outline-pine px-3 py-2 text-sm font-semibold" data-testid="nav-doctor-dashboard">Dashboard</Link>
              )}
              {user.role === "admin" && !loc.pathname.startsWith("/admin") && (
                <Link to="/admin" className="btn-outline-pine px-3 py-2 text-sm font-semibold" data-testid="nav-admin-dashboard">Admin Panel</Link>
              )}
              <button onClick={onLogout} className="ml-1 p-2 hover:bg-[#F2F4F3]" data-testid="nav-logout" title="Log out">
                <LogOut className="w-4 h-4 text-[#172320]" />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
