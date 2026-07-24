# Graph Report - /home/user/wedding-website  (2026-07-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 531 nodes · 894 edges · 31 communities (26 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20c7c18a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- supabase.ts
- app/page.tsx
- Gallery.tsx
- InvitationCard.tsx
- dependencies
- WeddingDayBanner.tsx
- constants.ts
- devDependencies
- compilerOptions
- api/comments/route.ts
- CountdownHero.tsx
- FirstVisitForm.tsx
- fingerprint.ts
- YoutubeComments.tsx
- Comments.tsx
- layout.tsx
- supabase-types.ts
- seed-super-admin.mjs
- middleware.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `supabase` - 26 edges
2. `isAdmin()` - 18 edges
3. `useSiteContent()` - 17 edges
4. `isSuperAdmin()` - 17 edges
5. `compilerOptions` - 16 edges
6. `auditLog()` - 13 edges
7. `validateSession()` - 11 edges
8. `Phase` - 10 edges
9. `getOrCreateDeviceUUID()` - 9 edges
10. `DrivePhoto` - 8 edges

## Surprising Connections (you probably didn't know these)
- `ContentTab()` --calls--> `mergeSiteContent()`  [EXTRACTED]
  app/admin/page.tsx → lib/content.ts
- `GET()` --calls--> `isSuperAdmin()`  [EXTRACTED]
  app/api/admin/admins/route.ts → lib/admin-auth.ts
- `PATCH()` --calls--> `isSuperAdmin()`  [EXTRACTED]
  app/api/admin/admins/route.ts → lib/admin-auth.ts
- `DELETE()` --calls--> `isSuperAdmin()`  [EXTRACTED]
  app/api/admin/admins/route.ts → lib/admin-auth.ts
- `GET()` --calls--> `isSuperAdmin()`  [EXTRACTED]
  app/api/admin/audit/route.ts → lib/admin-auth.ts

## Import Cycles
- None detected.

## Communities (31 total, 5 thin omitted)

### Community 0 - "supabase.ts"
Cohesion: 0.07
Nodes (33): DELETE(), GET(), PATCH(), POST(), GET(), POST(), DELETE(), GET() (+25 more)

### Community 1 - "app/page.tsx"
Cohesion: 0.07
Nodes (36): Admin, AdminPage(), ContentTab(), DeviceRow, Flag, Guest, LogRow, PHASES (+28 more)

### Community 2 - "Gallery.tsx"
Cohesion: 0.07
Nodes (29): GET(), GET(), GET(), AlbumBook(), ctxDrawCurl(), ctxDrawHalfPage(), Gallery(), GalleryState (+21 more)

### Community 3 - "InvitationCard.tsx"
Cohesion: 0.07
Nodes (26): Divider(), FlipPhase, GA(), InvitationCard(), Props, RA(), Stage, Divider() (+18 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (36): bad-words, cities-list, @giscus/react, gsap, motion, next, dependencies, bad-words (+28 more)

### Community 5 - "WeddingDayBanner.tsx"
Cohesion: 0.08
Nodes (26): extractYoutubeId(), PostWeddingHero(), Props, Props, extractYoutubeId(), LiveStream(), Props, CabDialog() (+18 more)

### Community 6 - "constants.ts"
Cohesion: 0.10
Nodes (23): getTimeLeft(), STAGES, VIEWPORTS, COLORS, COUPLE, GISCUS_CONFIG, ITINERARY, VENUES (+15 more)

### Community 7 - "devDependencies"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, shadcn (+25 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 9 - "api/comments/route.ts"
Cohesion: 0.14
Nodes (20): DELETE(), deobfuscate(), isBad(), isSilentDrop(), PATCH(), POST(), GET(), isValidSession() (+12 more)

### Community 10 - "CountdownHero.tsx"
Cohesion: 0.13
Nodes (12): analyzeImageLuminance(), CountdownHero(), pad(), Props, TimeLeft, Props, createParticle(), Particle (+4 more)

### Community 11 - "FirstVisitForm.tsx"
Cohesion: 0.20
Nodes (10): FirstVisitForm(), Props, BackgroundMusic(), getBackgroundAudio(), startBackgroundMusic(), ALL_CITIES, City, INDIA_CITIES (+2 more)

### Community 12 - "fingerprint.ts"
Cohesion: 0.24
Nodes (12): iconBtn, Photo, PhotoGallery(), pillBtn, Props, trackEvent(), _getCookie(), _getFromIDB() (+4 more)

### Community 13 - "YoutubeComments.tsx"
Cohesion: 0.24
Nodes (8): GET(), State, timeAgo(), YoutubeComments(), fetchYoutubeComments(), YoutubeComment, fetchMock, SAMPLE_COMMENT

### Community 14 - "Comments.tsx"
Cohesion: 0.24
Nodes (9): Comment, Comments(), EMOJI_GROUPS, formatCountdown(), isSticker(), Props, stickerData(), STICKERS (+1 more)

### Community 15 - "layout.tsx"
Cohesion: 0.25
Nodes (6): cormorant, inter, metadata, playfair, DevViewportFrame(), VP_WIDTHS

### Community 16 - "supabase-types.ts"
Cohesion: 0.40
Nodes (4): AccessLog, BreachFlag, DeviceFingerprint, Guest

## Knowledge Gaps
- **155 isolated node(s):** `Tab`, `Guest`, `LogRow`, `Flag`, `Admin` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `supabase.ts` to `api/comments/route.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `validateSession()` connect `api/comments/route.ts` to `supabase.ts`, `Gallery.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `Tab`, `Guest`, `LogRow` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07055630936227951 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07049180327868852 - nodes in this community are weakly interconnected._
- **Should `Gallery.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07092198581560284 - nodes in this community are weakly interconnected._
- **Should `InvitationCard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._