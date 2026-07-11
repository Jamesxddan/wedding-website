"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { SiteContent, DEFAULT_CONTENT, mergeSiteContent } from "./content";

const SiteContentContext = createContext<SiteContent>(DEFAULT_CONTENT);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        if (data.site_content) {
          try {
            const parsed = JSON.parse(data.site_content) as Partial<SiteContent>;
            setContent(mergeSiteContent(DEFAULT_CONTENT, parsed));
          } catch { /* use default */ }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
