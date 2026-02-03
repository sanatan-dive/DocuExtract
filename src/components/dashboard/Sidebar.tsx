"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  LayoutDashboard,
  FileUp,
  FolderOpen,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Building2,
  Newspaper,
  MessageSquare,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "dashboards",
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const mainNavItems: NavItem[] = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "upload", label: "Upload", icon: FileUp },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
  ];

  /* Pages nav items removed */

  return (
    <aside className="sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)]">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white"
        >
          <FileText className="w-5 h-5" />
        </motion.div>
        <span className="font-bold text-lg text-[var(--color-text-primary)]">
          DocuExtract
        </span>
      </div>

      {/* Favorites / Recently */}
      <div className="flex gap-4 px-4 py-3 border-b border-[var(--color-border)]">
        <button className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <Star className="w-4 h-4" />
          Favorites
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <Clock className="w-4 h-4" />
          Recently
        </button>
      </div>

      {/* Scrollable Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Dashboards Section */}
        <div>
          <button
            onClick={() => toggleSection("dashboards")}
            className="sidebar-section-title w-full flex items-center justify-between"
          >
            Dashboards
            {expandedSections.includes("dashboards") ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.includes("dashboards") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-0.5 mt-1"
            >
              {mainNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onTabChange(item.id)}
                  className={`sidebar-nav-item w-full ${
                    activeTab === item.id ? "sidebar-nav-item--active" : ""
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Pages Section Removed */}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[var(--color-border)] space-y-0.5">
        <button className="sidebar-nav-item w-full">
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <button className="sidebar-nav-item w-full">
          <HelpCircle className="w-5 h-5" />
          Help & Support
        </button>
        <button
          onClick={onLogout}
          className="sidebar-nav-item w-full text-[var(--color-error)] hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
