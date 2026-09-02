"use client";

import { useSyncExternalStore } from "react";

/*
 * Shared by components/Nav.tsx and components/MobileNav.tsx — factored
 * out so there's exactly one copy of the hydration-safe theme logic
 * (see the note in Nav.tsx's history on why useSyncExternalStore is
 * used here rather than useState + useEffect) instead of two that could
 * quietly drift apart.
 */

const THEME_CHANGE = "bookhub-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE, onChange);
  return () => window.removeEventListener(THEME_CHANGE, onChange);
}

const getSnapshot = () => document.documentElement.getAttribute("data-theme") === "dark";

// The server has no localStorage, so it always renders the light default.
const getServerSnapshot = () => false;

export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setTheme(dark: boolean) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("bookhub-theme", dark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_CHANGE));
  }

  return { isDark, setTheme };
}
