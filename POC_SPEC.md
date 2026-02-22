# AI App Builder -- POC Spec

## Goal

Build a proof of concept that allows users to generate and iterate on
applications using sensible defaults while still allowing technical
users to customize their tech stack.

Principle: **Sensible defaults first. Customization second.**

------------------------------------------------------------------------

# Core Concept

The system generates real working applications using predefined **Stack
Kits** that run inside reusable sandbox environments.

Each kit includes: - Framework - Runtime - Dev server - Database setup -
File conventions - Validation commands - Preview configuration

------------------------------------------------------------------------

# User Personas

## Non‑technical users

Goals: - Describe what they want - See a working app quickly - Avoid
configuration choices

They receive a **Golden Path stack**.

## Technical users

Goals: - Start quickly - Choose their stack - Modify generated code
freely

------------------------------------------------------------------------

# Architecture

User → Web App → Session Manager → Sandbox/VM → Template Stack → Preview

Components:

### Orchestrator

Handles: - onboarding - stack selection - prompting - diff application -
preview UI - logs

### Template Registry

Stores stack kits.

Each kit includes:

-   template repository
-   kit.json configuration
-   startup commands
-   allowed dependencies
-   dev server port

### Runner

Creates environments and runs apps.

Responsibilities: - create sandbox - clone template - install
dependencies - apply generated changes - run checks - start dev server -
expose preview

Possible infrastructure: - Vercel Sandbox - exe.dev

------------------------------------------------------------------------

# Sensible Defaults Strategy

The system always provides: - recommended stack - working dev server -
starter schema - UI primitives - deployable structure

Users can customize later.

------------------------------------------------------------------------

# Onboarding Flow

## Step 1 -- Identify user type

Question:

What best describes you?

Options: - I'm technical - I'm non‑technical

------------------------------------------------------------------------

# Non‑Technical Flow

Non‑technical users skip configuration.

They receive the **Golden Path Stack**.

## Golden Path (to confirm)

Frontend - Next.js

Auth - better-auth

Database - TBD

ORM - TBD

Styling - Tailwind

UI primitives - TBD

Flow:

User → Non‑technical → Project created → Golden Path → Prompt → App
builds → Preview

------------------------------------------------------------------------

# Technical Flow

Technical users can choose their stack.

Question:

Do you want to choose your tech stack?

Options: - No → Golden Path - Yes → Stack Builder

------------------------------------------------------------------------

# Stack Builder

User selects:

-   Frontend
-   Backend
-   Database

------------------------------------------------------------------------

# Frontend Options (to confirm)

-   Next.js
-   React (Vite + TanStack)
-   Vue
-   Solid

Questions: - Should React without TanStack exist? - Should Next only be
the default? - Should Astro be supported later?

------------------------------------------------------------------------

# Backend Options (to confirm)

-   Node.js
-   Python
-   Go

Open decisions: - Node framework? - Go framework? - Python: FastAPI?

------------------------------------------------------------------------

# Database Options (to confirm)

Possible defaults:

-   Postgres
-   SQLite
-   Optional managed DB

Questions: - Hosted Postgres provider? - Run DB in sandbox? - Support no
DB?

------------------------------------------------------------------------

# Example Technical Flow

User → Technical → Choose stack → Select FE → Select BE → Select DB →
Create project → Preview

------------------------------------------------------------------------

# Flow Diagram

Start ↓ What describes you? ↓ Non‑technical or Technical ↓ If technical
→ choose stack? ↓ No → Golden Path Yes → Stack Builder ↓ Create project
↓ Sandbox starts ↓ App generated ↓ Preview

------------------------------------------------------------------------

# Stack Kit Specification

Each kit includes:

kit.json

Example:

{ "name": "nextjs-default", "devCommand": "pnpm dev", "port": 3000,
"checkCommand": "pnpm lint && pnpm typecheck", "allowedDirectories":
\["app","components","lib"\], "installCommand": "pnpm install" }

------------------------------------------------------------------------

# Generation Loop

User prompt → model generates diff → patch applied → validation runs →
if errors → repair → server reload → preview updates

------------------------------------------------------------------------

# Sandbox Lifecycle

Start - create sandbox - clone template - install dependencies - start
dev server

Iteration - apply patch - run checks - restart server

End - snapshot environment - destroy sandbox

------------------------------------------------------------------------

# Security Considerations

-   sandbox isolation
-   CPU/RAM limits
-   network restrictions
-   dependency restrictions
-   command allowlist

------------------------------------------------------------------------

# POC Scope

Keep small.

Goal:

Support **three stacks** initially.

Suggested: 1. Golden Path (Next.js) 2. Vite React 3. FastAPI

------------------------------------------------------------------------

# Open Questions

Auth - better-auth configuration? - OAuth providers? - magic links?

Database - Postgres provider? - ORM? - migrations?

Node backend - Fastify / Express / Hono / other?

Go backend - Fiber / Chi / Gin?

Python - FastAPI default?

UI - shared design system or framework native?

Styling - Tailwind everywhere?

------------------------------------------------------------------------

# Success Criteria

The POC proves:

1.  onboarding is clear
2.  environments start fast
3.  generated code compiles
4.  preview updates quickly
5.  new stack kits are easy to add
