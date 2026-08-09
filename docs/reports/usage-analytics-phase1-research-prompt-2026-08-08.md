---
title: Usage Analytics Phase 1 研究提示
date: 2026-08-08
category: reports
status: active
related: ["usage-analytics-phase1-research-report-2026-08-08.md", "usage-analytics-phase1-research-review-response-2026-08-08.md"]
---

# OpenCodex Usage Analytics — Phase 1 Research Prompt

## Role

You are acting as a senior frontend / repository architecture engineer.

This phase is **research and planning only**.

**Do not modify any source code. Do not create implementation commits. Do not refactor unrelated files.**

The goal is to produce an implementation-ready research report for enhancing the existing OpenCodex Web GUI Usage experience.

---

## Repository Layout

Assume the local workspace is structured approximately as follows:

```text
~/Projects/
├── opencodex-dev/        # OpenCodex development repository — this is the target project
└── cc-switch/            # CC Switch — read-only frontend reference
```

You are running from inside:

```text
~/Projects/opencodex-dev
```

The CC Switch repository is therefore available at:

```text
../cc-switch
```

---

## Project Goal

Enhance the existing **OpenCodex Web GUI Usage / request-history experience**.

The main pain points are:

1. Large token counts are displayed too coarsely.
   - Example: when usage exceeds 100M tokens, the UI may display only something like `1.x` instead of exposing useful precision.
   - Exact integer values should always be accessible.

2. Usage analysis lacks sufficiently useful filtering and drill-down.
   - Need better time-range filtering.
   - Need Provider filtering.
   - Need Model filtering.
   - Need Status filtering where supported.
   - Need request-level usage detail.
   - Need useful aggregation/trend views.

The intended result is a native OpenCodex GUI enhancement suitable for an upstream pull request.

---

# Critical Design Constraint

## CC Switch is frontend inspiration only

Study CC Switch primarily for:

- information architecture;
- visual hierarchy;
- Usage Dashboard layout;
- summary/KPI cards;
- time-range controls;
- Provider / Model / Status filtering UI;
- request-history table UX;
- token trend charts;
- Provider / Model breakdown presentation;
- pagination/infinite-loading UX;
- loading / empty / error states;
- numeric formatting;
- tooltip / hover behavior;
- responsive behavior;
- reusable frontend component structure.

### Do NOT copy or reproduce CC Switch backend architecture

Do not adopt or port:

- Rust backend logic;
- proxy request logging;
- CLI session parsing;
- CC Switch database schema;
- pricing engine;
- CC Switch-specific API contracts;
- statistics collection architecture.

Only inspect backend-related CC Switch code if it is strictly necessary to understand a frontend field or component behavior.

**OpenCodex must remain the source of truth for all usage data.**

---

# OpenCodex Architecture Principle

Prefer this architecture:

```text
OpenCodex native usage/request-history data
                ↓
OpenCodex existing management API
                ↓
OpenCodex GUI API client / hooks
                ↓
Enhanced Usage Analytics UI
```

Do not introduce a parallel analytics storage layer unless the existing OpenCodex backend demonstrably cannot support a required feature.

The default assumption should be:

> Reuse the existing OpenCodex request-history / usage capabilities and improve how the GUI exposes them.

---

# Phase 1 Tasks

## 1. Read repository instructions first

Before analyzing implementation:

1. Locate and read the root `AGENTS.md`.
2. Locate and read any additional `AGENTS.md` files that apply to:
   - `gui/`;
   - relevant API / server directories;
   - relevant test directories.

Summarize all repository rules that materially constrain this work, including:

- target branch expectations;
- required package manager;
- test commands;
- GUI lint/build commands;
- style conventions;
- screenshot/UI evidence requirements;
- PR requirements;
- directory ownership or scope rules.

Do not proceed to implementation.

---

## 2. Analyze the existing OpenCodex Usage frontend

Locate the current OpenCodex GUI implementation for:

- Usage page;
- Dashboard usage summary;
- Logs/request history if separate;
- existing charts;
- tables;
- filters;
- date/time controls;
- number formatting utilities;
- tooltips;
- API hooks / query hooks;
- pagination logic.

Determine:

### Page structure

- Where is the Usage route defined?
- Which component is the page root?
- Which child components are involved?
- Which reusable design-system components already exist?

### Current numeric formatting

Find the exact implementation responsible for formatting large token counts.

Determine:

- how `1K`, `1M`, `1B`, etc. are generated;
- how many decimal places are currently used;
- whether the raw exact number is still present in state;
- whether exact values could be exposed via tooltip without backend changes;
- whether formatter behavior is global or Usage-specific.

### Current filtering

Document which filters currently exist and where they are applied:

- frontend only;
- API query parameters;
- backend/database query.

---

## 3. Analyze OpenCodex request-history / usage backend capabilities

Find the canonical implementation of OpenCodex usage and request-history data.

Study relevant code for:

- `/api/request-history` or equivalent;
- request-history query types;
- usage records;
- persisted history/index;
- pagination;
- cursor handling;
- time range parameters;
- Provider filter;
- requested Model filter;
- resolved/actual Model filter;
- status filter;
- surface/protocol/profile fields where relevant;
- conversation/session identifiers;
- token fields.

Create a precise field inventory.

For each useful UI field, document:

| UI Concept | Backend/API Field | Available? | Notes |
|---|---|---:|---|
| Timestamp | ? | | |
| Provider | ? | | |
| Requested model | ? | | |
| Resolved model | ? | | |
| Input tokens | ? | | |
| Output tokens | ? | | |
| Cache read tokens | ? | | |
| Cache creation/write tokens | ? | | |
| Total tokens | ? | | |
| Status | ? | | |
| Duration | ? | | |
| Conversation/session | ? | | |
| Surface | ? | | |
| Fallback | ? | | |

Do not infer fields that do not exist.

Identify whether the existing API can support:

- `from` / `to`;
- Provider;
- Model;
- Status;
- cursor pagination;
- requested vs resolved Model filtering;
- aggregation by hour/day;
- aggregation by Provider/Model.

---

# 4. Study CC Switch Usage frontend

Focus on the frontend implementation.

Search the repository for Usage-related components, hooks, API wrappers, table configuration, chart configuration, formatters, and type definitions.

Likely relevant areas may include paths similar to:

```text
src/components/usage/
src/lib/api/usage.*
src/lib/query/usage.*
src/types/usage.*
```

Do not assume these exact paths are current; verify them.

For each relevant CC Switch frontend component, record:

- purpose;
- UI behavior;
- input data shape;
- useful UX ideas;
- whether OpenCodex already has an equivalent;
- whether the concept is worth adopting.

Pay particular attention to:

### Summary cards

- What metrics are shown?
- Do cards follow active filters?
- How are large numbers displayed?
- Are exact values accessible?

### Time controls

- Today;
- Last 24 hours;
- 7 days;
- 30 days;
- custom range;
- hourly vs daily aggregation.

### Trend chart

- metrics shown;
- aggregation logic expected by frontend;
- legend behavior;
- tooltip details;
- sparse-data handling.

### Request details table

- columns;
- sorting;
- filtering;
- pagination;
- row expansion/detail view;
- error/status representation;
- loading states.

### Provider / Model breakdown

- layout;
- table vs chart;
- percentage/share representation;
- sort behavior.

---

# 5. Produce a CC Switch → OpenCodex component mapping

Create a table similar to:

| CC Switch UX / Component | Purpose | OpenCodex Existing Equivalent | Recommendation |
|---|---|---|---|
| Usage summary cards | KPI overview | ... | reuse/adapt/new |
| Time-range selector | filter | ... | ... |
| Token trend | chart | ... | ... |
| Request log table | drill-down | ... | ... |
| Provider stats | breakdown | ... | ... |
| Model stats | breakdown | ... | ... |
| Exact-number tooltip | precision | ... | ... |

The objective is **not** to replicate CC Switch.

The objective is to identify useful interaction patterns that can be implemented using OpenCodex-native components and conventions.

---

# 6. Evaluate whether backend changes are actually necessary

This is a mandatory decision gate.

Answer explicitly:

```text
Can the target V1 Usage Analytics feature be implemented without backend changes?
YES / PARTIALLY / NO
```

Then justify the answer.

### Target V1 functionality

P0:

- exact token values accessible;
- useful compact number formatting;
- time-range filtering;
- Provider filtering;
- Model filtering;
- Status filtering where supported;
- request-level history;
- cursor-based pagination;
- summary values consistent with current filters;
- token usage trend.

P1:

- Provider breakdown;
- Model breakdown.

Not in V1:

- monetary cost;
- pricing configuration;
- budgets;
- billing;
- quota prediction;
- CSV export;
- CC Switch session parsing;
- custom analytics database.

If a backend change is proposed, document:

1. the exact missing capability;
2. why frontend-only computation is inappropriate;
3. the smallest possible backend change;
4. compatibility implications;
5. tests required.

Avoid backend changes merely for convenience.

---

# 7. Design the proposed OpenCodex Usage UI

Produce a page-level wireframe in Markdown.

Recommended information hierarchy:

```text
Usage
├── Global filters
├── Summary
├── Token trend
└── Detail section
    ├── Requests
    ├── Providers
    └── Models
```

Evaluate whether tabs, sections, or another structure best matches the existing OpenCodex design system.

### Global filters

Consider:

- Today;
- Last 24 Hours;
- 7 Days;
- 30 Days;
- Custom range;
- Provider;
- Model;
- Status;
- Reset.

All relevant panels should remain logically consistent with active filters.

---

# 8. Define number-formatting behavior

Design a deterministic formatter specification.

Example desired behavior:

| Raw | Compact |
|---:|---:|
| 999 | 999 |
| 1,000 | 1K |
| 12,340 | 12.34K |
| 1,234,567 | 1.23M |
| 128,394,822 | 128.39M |
| 1,234,567,890 | 1.23B |

Exact integer value must always remain available, for example through:

- tooltip;
- title;
- detail panel;
- optional exact display.

Investigate locale conventions already used by OpenCodex before recommending formatting implementation.

Test boundary values including:

```text
999
1,000
999,999
1,000,000
99,999,999
100,000,000
999,999,999
1,000,000,000
```

---

# 9. Pagination and performance requirements

Do not design the frontend to fetch all historical requests and filter them in browser memory.

Prefer existing server-side indexed filtering and cursor pagination.

Research and document:

- API page size;
- next-cursor semantics;
- stable ordering;
- whether infinite scrolling or explicit pagination better matches current GUI;
- how changing filters resets pagination;
- how stale queries are handled;
- expected behavior with very large histories.

---

# 10. Data consistency rules

Define how Summary, Trend, Request History, Provider Breakdown, and Model Breakdown remain consistent.

Determine whether aggregates should be:

1. calculated server-side;
2. derived from a bounded result set;
3. retrieved from an existing usage aggregate endpoint;
4. implemented via a minimal new aggregation API only if unavoidable.

Do **not** sum only the currently loaded cursor page and label that result as total filtered usage.

Flag any such correctness risk explicitly.

---

# 11. Proposed file changes

Produce a concrete file plan.

Separate into:

## Existing files to modify

For every file:

```text
path/to/file
- why it changes
- intended change
- risk
```

## New files to add

For every file:

```text
path/to/new-file
- responsibility
- why a new file is preferable to modifying an existing one
```

Prefer small, composable changes.

Avoid unrelated refactors.

---

# 12. Testing plan

Identify tests required for:

### Unit tests

- token formatter;
- date-range conversion;
- filter query serialization;
- API field transformation;
- aggregation helpers if any;
- requested vs resolved model handling.

### UI/component tests where repository conventions support them

- filter changes;
- reset;
- loading;
- empty;
- API error;
- pagination;
- request row details;
- exact-value tooltip/display.

### Build/repository validation

List the exact commands required by OpenCodex repository instructions.

Do not invent commands. Use those defined by repository documentation/package scripts.

---

# 13. PR scope recommendation

Propose a deliberately reviewable first PR.

Prefer a PR that can be described approximately as:

> Expose existing OpenCodex request-history capabilities through a more useful Usage Analytics GUI.

Avoid turning the first PR into a complete billing/observability platform.

Specify:

### Include in first PR

- exact / useful token formatting;
- time filter;
- Provider filter;
- Model filter;
- Status filter if API supports it;
- request-history table;
- pagination;
- token trend;
- small Provider/Model breakdowns if low-risk.

### Explicitly defer

- pricing;
- cost;
- budgets;
- billing;
- exports;
- unrelated analytics;
- backend redesign.

---

# 14. Copyright / implementation independence

CC Switch is being used as a design and behavior reference.

Do not copy large blocks of CC Switch source code.

For every adopted idea:

- understand the behavior;
- implement it idiomatically in OpenCodex;
- reuse OpenCodex components and conventions;
- keep source-level implementation independent.

If any source code is proposed for direct reuse, flag it explicitly instead of copying it.

---

# Required Final Deliverable

Create a research report containing these sections:

```text
1. Executive Summary
2. Repository Constraints
3. Current OpenCodex Usage Architecture
4. Current OpenCodex GUI Limitations
5. OpenCodex Request-History API Capability Matrix
6. CC Switch Frontend Findings
7. CC Switch → OpenCodex UX/Component Mapping
8. Backend-Change Decision
9. Proposed OpenCodex Usage UX
10. Data Flow and Field Mapping
11. Pagination and Performance Design
12. Number Formatting Specification
13. File-by-File Implementation Plan
14. Testing Plan
15. Risks / Unknowns
16. Recommended First-PR Scope
17. Implementation Checklist
```

At the end, provide a concise implementation sequence suitable for a coding agent.

---

# Stop Condition

After producing the research report:

**STOP.**

Do not modify files.
Do not implement components.
Do not create commits.
Do not open a PR.

Wait for the implementation plan to be reviewed and approved before starting Phase 2.
