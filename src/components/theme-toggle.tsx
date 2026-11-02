"use client";

import { Switch } from "@fanvue/ui";
import { useEffect, useState } from "react";

const STORAGE_KEY = "bundle-audit-theme";

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span id="theme-switch-label" className="typography-description-12px-semibold text-content-secondary">
        Dark
      </span>
      <Switch
        size="small"
        checked={dark}
        aria-labelledby="theme-switch-label"
        onCheckedChange={(checked) => {
          applyTheme(checked ? "dark" : "light");
          setDark(checked);
        }}
      />
    </div>
  );
}
