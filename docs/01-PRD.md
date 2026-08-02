# 1. PRD — Project Requirement Document

> Project: James & Sharon — Wedding Website · Status: **Approved / In development**

## Project Overview
- **Project name:** James & Sharon — Wedding Website
- **One-liner:** A cinematic, shareable digital invitation and guest experience for James & Sharon's wedding (Oct 8, 2026, Chennai).
- **Owner:** James & Sharon (admins: family members via admin panel).

## Problem
- Paper invitations are static and can't be shared at distance; guests need an experience that matches the occasion.
- The couple needs a **controlled guest registry** (who's attending), a **gated photo gallery** (photos must not be public), **live ceremony streams** on the day, and a way to make every guest feel invited — on their phone, via a link.
- Privacy matters: photos and comments are only for invited guests, not public search engines.

## Target Users
- **Guests:** James & Sharon's family and friends (both families — hence two family names in nav/bios). Mostly mobile, reached via WhatsApp/links.
- **Admins:** James, Sharon, and designated family admins who manage guests, gallery, settings, and unblock people.

## Goals & Success Metrics
- **Primary goals:**
  1. Deliver a beautiful, cinematic invitation journey (registration → invitation → countdown).
  2. Collect guest details (name, email, mobile, city) into a registry.
  3. Gate photos/comments behind guest identity (no public leaks).
  4. Stream ceremony + reception live on the day; show post-wedding highlights.
- **Success metrics:** registered guests count, invitation open rate, comments/replies, photos viewed; zero public-URL photo leaks; site stays up on the wedding day.
- **Non-goals:** payments/tickets, full public social network, a full CMS.

## Scope
- **In scope:** opening registration form, animated invitation (envelope + wax seal), countdown hero, photo slideshow, gallery (Google Drive-sourced), venue details & itinerary, live YouTube streams, Wall of Love comments (giscus), admin panel (guests, logs, breaches, settings), phase system, breach/rate-limit protection, photo album book (GSAP flip).
- **Out of scope:** RSVP with +1 management, dietary/meal selection, hotel bookings, payments.

## User Stories / Requirements
- As a **guest**, I open the link and register with my name, contact, and city so the site recognizes me.
- As a **guest**, I open my invitation with a tap and feel the ceremony's emotion (music, animation).
- As a **guest**, I return later and see the countdown, gallery, venue details, and Wall of Love without re-registering.
- As a **guest** on the wedding day, I watch the live ceremony/reception streams.
- As an **admin**, I see every guest, their device, and access logs, and can block/unblock or promote an owner.
- As an **admin**, I control site settings (phase override, announcement, stream URLs) without code changes.

## Constraints & Assumptions
- **Constraints:** mobile-first (guests on phones); must run on free tier (Vercel + Supabase); no photo hotlinking (HMAC-signed, proxied tokens); Indian mobile format validation.
- **Assumptions:** guests share the link among invited people; new/unregistered devices get a limited view (no registration allowed — prevents impersonation); Google Drive holds the gallery source files.

## Questions to Ask (answered — recorded for reference)
1. Problem to solve → deliver a cinematic, controlled guest experience (above).
2. Users → wedding guests + family admins.
3. Success → registrations, opens, comments; site up on Oct 8.
4. Deadline → **Oct 8, 2026** (hard date; phases keyed to it).
5. MVP → live today (pre-wedding phase live).
6. Owner/decision → James & Sharon.
7. Existing systems → Google Drive photos, giscus comments, YouTube streams.
8. Should NOT do → expose guest-only content publicly.
