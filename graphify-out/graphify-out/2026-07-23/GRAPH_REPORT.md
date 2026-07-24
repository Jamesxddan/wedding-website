# Graph Report - C:\Users\jjame\Documents\Claude work\wedding-website  (2026-07-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 536 nodes · 887 edges · 41 communities (32 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 1,286 input · 418 output

## Community Hubs (Navigation)
- Admin and Audit API
- Hero and Media Components
- Photo Gallery and Albums
- Digital Invitation and Opening
- Project Dependencies
- Development Tools and Config
- Session and Comment API
- TypeScript Configuration
- Admin Dashboard UI
- Wedding Day Logistics
- Post-Wedding and Comments
- Site Content and Sections
- Onboarding and Background Music
- Device Tracking and Gallery
- YouTube Comments Integration
- Home Page and Tracking
- Story and Timeline
- App Layout and Metadata
- Venue and Itinerary
- Database Schema Types
- Database Seeding
- Next.js Middleware
- ESLint Configuration
- Next.js Configuration
- PostCSS Configuration
- Project Changelog
- Backend Architecture Docs
- Wedding Ring Assets
- Wax Seal Assets

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
- `OurStory()` --calls--> `useSiteContent()`  [EXTRACTED]
  components/sections/OurStory.tsx → lib/SiteContentContext.tsx
- `Venue()` --calls--> `useSiteContent()`  [EXTRACTED]
  components/sections/Venue.tsx → lib/SiteContentContext.tsx
- `AdminPage()` --calls--> `useTrackPageVisit()`  [EXTRACTED]
  app/admin/page.tsx → lib/useTrackPageVisit.ts
- `ContentTab()` --calls--> `mergeSiteContent()`  [EXTRACTED]
  app/admin/page.tsx → lib/content.ts
- `GET()` --calls--> `isSuperAdmin()`  [EXTRACTED]
  app/api/admin/admins/route.ts → lib/admin-auth.ts

## Import Cycles
- None detected.

## Communities (41 total, 9 thin omitted)

### Community 0 - "Admin and Audit API"
Cohesion: 0.07
Nodes (32): DELETE(), GET(), PATCH(), POST(), GET(), POST(), DELETE(), GET() (+24 more)

### Community 1 - "Hero and Media Components"
Cohesion: 0.06
Nodes (35): analyzeImageLuminance(), CountdownHero(), getTimeLeft(), pad(), Props, TimeLeft, Props, STAGES (+27 more)

### Community 2 - "Photo Gallery and Albums"
Cohesion: 0.07
Nodes (28): GET(), GET(), GET(), AlbumBook(), ctxDrawCurl(), ctxDrawHalfPage(), Gallery(), GalleryState (+20 more)

### Community 3 - "Digital Invitation and Opening"
Cohesion: 0.07
Nodes (26): Divider(), FlipPhase, GA(), InvitationCard(), Props, RA(), Stage, Divider() (+18 more)

### Community 4 - "Project Dependencies"
Cohesion: 0.05
Nodes (36): bad-words, cities-list, @giscus/react, gsap, motion, next, dependencies, bad-words (+28 more)

### Community 5 - "Development Tools and Config"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, shadcn (+25 more)

### Community 6 - "Session and Comment API"
Cohesion: 0.13
Nodes (21): DELETE(), deobfuscate(), isBad(), isSilentDrop(), PATCH(), POST(), GET(), isValidSession() (+13 more)

### Community 7 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "Admin Dashboard UI"
Cohesion: 0.12
Nodes (19): Admin, AdminPage(), ContentTab(), DeviceRow, Flag, Guest, LogRow, PHASES (+11 more)

### Community 9 - "Wedding Day Logistics"
Cohesion: 0.13
Nodes (17): Props, extractYoutubeId(), LiveStream(), Props, CabDialog(), CabMode, olaCeremonyToReception(), olaFromVenueTo() (+9 more)

### Community 10 - "Post-Wedding and Comments"
Cohesion: 0.13
Nodes (13): extractYoutubeId(), PostWeddingHero(), Props, Comment, Comments(), EMOJI_GROUPS, formatCountdown(), isSticker() (+5 more)

### Community 11 - "Site Content and Sections"
Cohesion: 0.27
Nodes (6): AboutJames(), AboutSharon(), Families(), Footer(), Props, useSiteContent()

### Community 12 - "Onboarding and Background Music"
Cohesion: 0.20
Nodes (10): FirstVisitForm(), Props, BackgroundMusic(), getBackgroundAudio(), startBackgroundMusic(), ALL_CITIES, City, INDIA_CITIES (+2 more)

### Community 13 - "Device Tracking and Gallery"
Cohesion: 0.24
Nodes (12): iconBtn, Photo, PhotoGallery(), pillBtn, Props, trackEvent(), _getCookie(), _getFromIDB() (+4 more)

### Community 14 - "YouTube Comments Integration"
Cohesion: 0.24
Nodes (8): GET(), State, timeAgo(), YoutubeComments(), fetchYoutubeComments(), YoutubeComment, fetchMock, SAMPLE_COMMENT

### Community 15 - "Home Page and Tracking"
Cohesion: 0.29
Nodes (6): Home(), ITEMS, Marquee(), TEXT, getBrowserSignalsHash(), useTrackPageVisit()

### Community 16 - "Story and Timeline"
Cohesion: 0.20
Nodes (5): OurStory(), POSITIONS, Props, ROTATIONS, Milestone

### Community 17 - "App Layout and Metadata"
Cohesion: 0.25
Nodes (6): cormorant, inter, metadata, playfair, DevViewportFrame(), VP_WIDTHS

### Community 18 - "Venue and Itinerary"
Cohesion: 0.29
Nodes (4): Itinerary(), Venue(), VENUE_COORDS, VenueCardProps

### Community 19 - "Database Schema Types"
Cohesion: 0.40
Nodes (4): AccessLog, BreachFlag, DeviceFingerprint, Guest

## Knowledge Gaps
- **159 isolated node(s):** `Tab`, `Guest`, `LogRow`, `Flag`, `Admin` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Admin and Audit API` to `Session and Comment API`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `validateSession()` connect `Session and Comment API` to `Photo Gallery and Albums`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `Tab`, `Guest`, `LogRow` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin and Audit API` be split into smaller, more focused modules?**
  _Cohesion score 0.0744047619047619 - nodes in this community are weakly interconnected._
- **Should `Hero and Media Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Photo Gallery and Albums` be split into smaller, more focused modules?**
  _Cohesion score 0.07215541165587419 - nodes in this community are weakly interconnected._
- **Should `Digital Invitation and Opening` be split into smaller, more focused modules?**
  _Cohesion score 0.07439024390243902 - nodes in this community are weakly interconnected._