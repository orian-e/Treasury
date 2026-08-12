# Homepage scripted demo — plan

Branch: `feature/homepage-demo-preview` (off `main` @ `205156e`, which now
includes everything previously on `feature/expense-group-search`).

## Goal

A decorative, looping, scripted mini-preview of Treasury's core flow
(Groups → Expenses → add expense → Settlements) embedded in the existing
purple intro column of `HomePage.tsx`. Hardcoded demo data only. No API
calls, no shared/app state, no reuse of production form handlers
(`ExpenseForm`, `useExpenseApp`, `useAuth`, etc). Not a functional duplicate
of the app — just enough visual fidelity to communicate what it does.

Deliberately went with GPT's "safer first step": embed the mockup inside
the *existing* two-column layout (purple intro left / login card right),
not the bigger hero-restructure GPT also sketched. Minimal diff, no
layout/functionality break.

**Status: Revisions 1-5 done and verified. Revision 4's bug is fixed (as
part of Revision 5). Nothing known-broken remains; the one standing item is
the dockerized e2e run before merging** (see Phase 5 / each revision's
re-verification section — never run in this sandbox, no Docker available).

## Orientation for the next session

1. Nothing is currently known-broken. Revisions 1–5 (below) are done,
   verified, and shouldn't need to be redone — they're kept as context for
   *why* the code looks the way it does, so the next session doesn't undo a
   deliberate fix by accident. Skim the bug write-ups under each if
   something looks like it "should" be simplified or redesigned — it's
   probably already been through one round of exactly that.
2. `npm run test:e2e` has never been run against this branch — every
   sandbox used so far had no Docker daemon available. **This still needs
   to happen before merging**, regardless of what else changes.
3. Verification method used throughout (no Docker needed for this part):
   `cd frontend && PORT=3100 BROWSER=none npx react-scripts start`, then
   drive it with a locally-installed Playwright (`npx playwright install
   chromium`) from a scratch `.js` file at the repo root — delete those
   scratch files before finishing, they're not part of the feature. `git
   status --porcelain` should show only the files under "Files touched"
   below plus this file.

## Hard constraints (held to)

- No imports from `services/`, `hooks/useApi`, `hooks/useAuth`, no `fetch`/
  `axios` anywhere in the new component tree. Verified by grep, see Phase 4.
- No real `<form>` / `onSubmit`, no reuse of `ExpenseForm`/`ExpenseList`/etc
  handlers — visual look-alikes only (`Typography`/`Box`, no inputs).
- `LoginPage.tsx` copy/roles/DOM untouched.
- Demo root has `aria-hidden="true"` — excluded from the a11y tree, so it's
  invisible to `getByRole` e2e locators regardless of mock copy.
- `npm run test:unit` (CRA/Jest) green — 121 tests, including 5 new ones for
  `TreasuryDemo`.

## Phase 0 — Setup — done

- [x] Reconciled branch base: fast-forwarded local `main` to
      `feature/expense-group-search` (`205156e`), pushed to `origin/main`,
      recreated `feature/homepage-demo-preview` off updated `main`.
- [x] Surveyed `HomePage.tsx`, `LoginPage.tsx`, `App.tsx`, `MainApp.tsx`
      (nav = Groups/Expenses/Settlements/Totals), `theme.ts`
      (`primary #5b2c87`, `secondary #00897b`), `e2e/auth.spec.ts`
      (locator style), frontend test conventions (CRA + RTL + Jest).

## Phase 1 — Data & state machine — done

- [x] `frontend/src/components/TreasuryDemo/demoData.ts`: `DemoStep` union
      type (7 steps), `STEP_SEQUENCE`, `STEP_DURATIONS` (~11.5s/loop),
      `ACTIVE_TAB_BY_STEP`, hardcoded fixtures.
- [x] `frontend/src/components/TreasuryDemo/TreasuryDemo.tsx`: owns
      `useState<number>` step index, advances on a `setTimeout` in
      `useEffect`, cleared on unmount/step change (unit-tested). Honors
      `prefers-reduced-motion` via MUI's `useMediaQuery` — freezes on the
      "expenses" frame instead of cycling (unit-tested; see note below on
      why this needed a non-obvious test setup).

## Phase 2 — Visuals per step — done

- [x] `frontend/src/components/TreasuryDemo/DemoScreens.tsx`: `GroupsScreen`,
      `ExpensesScreen` (covers expenses/expenseForm/expenseSaved),
      `SettlementsScreen`, `TotalsScreen`. All presentational, no inputs.
- [x] Step transitions via MUI `Fade`/`Collapse`/`Grow` — no new deps.
- [x] Styling from existing theme tokens only.

## Phase 3 — Homepage integration — done

- [x] `<TreasuryDemo />` rendered inside the purple column in
      `HomePage.tsx`, below the `FEATURES` stack, at **every** breakpoint
      (not just `md+`). Verified in-browser at 1440px, 700px, 375px, and
      320px widths — fits without overflow or pushing the login card
      meaningfully below the fold, even at 320px. The `FEATURES` bullet
      list stays hidden below `sm` as it already did.
- [x] Zero changes to `LoginPage.tsx`.

## Phase 4 — Safety re-check — done

- [x] Grepped new files for `services/`, `useApi`, `useAuth`, `fetch(`,
      `axios` — clean.
- [x] `HomePage.tsx` passes no props into `TreasuryDemo` — it's fully
      self-contained.
- [x] Grepped `e2e/` for literal copy overlap. Found real ones:
      `e2e/seeded-fixtures.spec.ts` uses `page.getByText('Flatmates')`
      (substring-matches the real seeded group `"Flatmates 🏠"`), and
      `e2e/expenses.spec.ts` touches `'Dinner'`. Unlike `getByRole`,
      `getByText` is **not** scoped by `aria-hidden`. In practice these are
      still safe today because `HomePage` and `MainApp` are mutually
      exclusive in `App.tsx` (never both mounted, and every such e2e
      locator call happens after login) — but rather than lean on that
      coincidence, the demo's copy was changed to not share any string with
      `backend/scripts/seed.ts`: `"Flatmates"` → `"Roomies"`, `"Dinner"` →
      `"Takeout"`, `"Internet"` → `"Streaming"`. Removes the coupling
      entirely instead of just documenting it.

## Phase 5 — Verification — done except the dockerized e2e run

- [x] `npm run test:unit`-equivalent (`react-scripts test`) green: 12 suites,
      121 tests.
- [x] Added `frontend/src/tests/components/TreasuryDemo.test.tsx`: renders
      and is `aria-hidden`; cycles through every step without crashing;
      reaches the totals screen with the hardcoded total; clears its timer
      on unmount (asserted via a `console.error` spy staying uncalled after
      unmount + advancing fake timers); freezes on one frame under
      `prefers-reduced-motion`.
  - Non-obvious finding while writing that last test: this jsdom has no
    `window.matchMedia` at all (not even a stub) — MUI's `useMediaQuery`
    already guards for that and silently falls back to `false`, which is
    also why the first four tests never touched the reduced-motion branch.
    `jest.spyOn` can't mock a property that doesn't exist, so the test
    assigns `window.matchMedia` directly and restores it after.
- [ ] **`npm run test:e2e` could not be run in this sandbox** — no Docker
      daemon (`/var/run/docker.sock` absent, no systemd, no sudo,
      `no_new_privileges` blocks starting one). This is required by
      CLAUDE.md before pushing any `frontend/src` copy/DOM change. **Run
      this yourself before merging**: `npm run test:e2e`.
  - As a substitute, ran the frontend alone (`PORT=3100 npx react-scripts
    start`, no backend/Docker needed since `HomePage` renders standalone)
    and drove it with a locally-launched Playwright Chromium (installed via
    `npx playwright install chromium`, not part of the repo's own e2e
    config) to screenshot every step at four viewport widths. This is how
    the Phase 3 layout check and the color bug below were actually found.
    It does not substitute for the real `auth.spec.ts` /
    `seeded-fixtures.spec.ts` run against the dockerized stack.
- [x] Manual in-browser check (via the substitute above): full 7-step loop
      confirmed frame-by-frame, no overflow at any tested width, timer
      cleanup confirmed.

### Bug found and fixed during manual verification

The purple HomePage column sets `color: common.white` on itself for the
tagline/feature text. That cascades via normal CSS inheritance into any
descendant `Typography` that doesn't set its own explicit color — which is
exactly what most of the demo's `Typography` elements were doing. Result:
group names and expense labels rendered white-on-white (invisible) inside
the white demo card, while the few pieces of text with explicit colors
(amounts, "+ Add expense", captions) were fine. Fixed with one line —
`color: "text.primary"` on `TreasuryDemo`'s root `Box` — which resets
inheritance for the whole card. Caught only by actually rendering it in a
browser; neither the type checker nor the unit tests would have caught this
class of bug, since RTL/jsdom doesn't compute cascaded CSS color the way a
real renderer does.

## Phase 6 — Wrap-up

- [x] All subtasks above marked done, with the one exception (dockerized
      e2e run) called out explicitly rather than silently skipped.
- [x] Temporary verification scripts and the incidental root
      `package-lock.json` npm-version churn (from installing deps with an
      unsupported npm/Node combo in this sandbox) were cleaned up / reverted
      before finishing, so the diff is just the feature.
- [ ] Not pushed, no PR opened — out of scope of the original go-ahead.
      Ask before doing either.

## Files touched

- `frontend/src/pages/HomePage.tsx` (added the demo, no other changes)
- `frontend/src/components/TreasuryDemo/demoData.ts` (new)
- `frontend/src/components/TreasuryDemo/DemoScreens.tsx` (new)
- `frontend/src/components/TreasuryDemo/TreasuryDemo.tsx` (new)
- `frontend/src/tests/components/TreasuryDemo.test.tsx` (new)
- This file (new)

## Revision 2 — visual fidelity pass

User feedback on the first pass: the demo was structurally correct (right
steps, right timing, no API calls) but visually it had drifted from real
Treasury — custom mini-rows and an invented progress bar on Totals, rather
than actually reusing Treasury's card/button/field language. Principle
given: **simplify content, not design language** — fewer fields, fewer
expenses, smaller cards are fine; inventing new visual patterns is not.

Before touching code, re-read the real components for reference:
`GroupManagement.tsx` (card border/shadow/selected-chip treatment),
`ExpenseList.tsx` (row style), `SettlementPanel.tsx` (`from → to  amount`
with `ArrowForwardIcon`, not the `SwapHorizIcon` the demo had invented),
`Totals.tsx` (icon-badge group card + currency box — **no progress bar
exists in the real component**, so the invented one in rev 1 was a genuine
deviation, not a simplification), `ExpenseForm.tsx` (outlined `TextField`s,
`variant="contained"` "Add Expense" button).

Kept from rev 1 (architecture was already right, GPT's second message
confirmed the same approach): `TreasuryDemo.tsx`'s state machine, timer,
`aria-hidden`, reduced-motion handling, `demoData.ts`'s shape, the test
file's structure.

Rewrote `DemoScreens.tsx` to reuse the real components' actual MUI patterns
instead of inventing new ones:
- [x] `GroupsScreen`: real `Card`/`CardContent` with the same
      selected-border (`2px solid primary.main` vs `divider`) and shadow
      (4 vs 1) treatment as `GroupManagement`, plus a `Chip label="Selected"
      color="primary"` — the exact chip `GroupManagement` shows — instead of
      the invented checkmark icon from rev 1.
- [x] `ExpensesScreen`: rows now match `ExpenseList`'s rounded/shadowed/
      `background.default` list-item look. The add-expense form uses three
      real `<TextField variant="outlined" size="small" disabled>` (for
      Description/Amount/"Paid by" — a `Select` in the real form,
      simplified to a matching-styled disabled `TextField` per "omit
      secondary controls") and a real `<Button variant="contained" disabled>
      Add Expense</Button>` — same label as the production button. All
      disabled, so still zero handlers/state, but pixel-identical styling
      since it's literally the same MUI components.
- [x] `SettlementsScreen`: rewritten to match `SettlementPanel` — bordered
      rounded list container, `{ower} → {owee}` with `ArrowForwardIcon`,
      amount bold in `primary.main`. Previously used an invented
      `SwapHorizIcon` two-line layout.
- [x] `TotalsScreen`: rewritten to match `Totals.tsx` — icon badge
      (`primary.light` bg / `primary.main` icon) + "GROUP" label + group
      name, "TOTAL SPENDING" label, one currency box (`grey.50`, bordered,
      dot + currency code, bold `success.dark` amount). **Progress bar
      removed** — it never existed in the real Totals component.
- [x] Amounts reformatted to match `utils/currencies.ts#formatCurrency`
      exactly: `€48.00` (2dp), not `€48`.

Rewrote `TreasuryDemo.tsx`'s header/frame:
- [x] AppBar-style bar switched from an invented `primary.dark` to the real
      `primary.main` (what `MainApp`'s actual `AppBar` uses).
- [x] Tabs now show icon + short text label ("Groups Expenses Settle
      Totals") instead of rev 1's icon-only row — GPT's specific example of
      an invented pattern ("Treasury never has icon-only desktop nav").
      Selected-pill treatment (`rgba(255,255,255,0.18)` bg, bold white text)
      copied from `MainApp`'s real `Tab` `sx`.
- [x] Added the real locked-tab behavior: Expenses/Settlements show
      `LockOutlinedIcon` and dim until a group is selected, exactly
      mirroring `MainApp`'s `isTabLocked`/`NAV_ITEMS[].requiresGroup` — not
      an invention, an accurate miniature of real, existing behavior.
      Computed from `step !== "groups"` (every step past the first has
      "Roomies" selected).
- [x] Card given a `minHeight: 260` with a `transition: "min-height 0.25s
      ease"` rather than letting height jump per step, as a pragmatic
      reading of GPT's "fixed-aspect-ratio preview frame". **This turned out
      to be insufficient — see Revision 3.** `minHeight` is still only a
      minimum; the tallest step (the add-expense form) exceeded it and grew
      the card anyway, which reflowed the whole page. Screenshots alone
      didn't catch it because each one only captures a single instant, not
      the page reflowing between instants.

Updated `frontend/src/tests/components/TreasuryDemo.test.tsx`: the "starts
on groups screen" assertion used to check for the text "Groups", which
became ambiguous once tab labels are always-rendered text too (the "Groups"
tab label is on screen at every step now, not just the groups step). Now
asserts on a group name (`DEMO_GROUPS[0]`, i.e. "Weekend Trip") instead,
which only renders on the groups/groupSelected screens.

### Re-verification (same method as rev 1: local `react-scripts start` +
### locally-launched Playwright, no Docker)

- [x] `npx tsc --noEmit` clean on the changed files.
- [x] Full unit suite green: 12 suites, 121 tests (5 for `TreasuryDemo`).
- [x] All 7 steps screenshotted and eyeballed individually at 700px width:
      groups, groupSelected (chip appears), expenses, expenseForm (real
      outlined fields + disabled button), settlements (`Bob → Alice
      €24.00`), totals (real card, no progress bar) — all correct.
- [x] Re-checked 375px and 320px widths with the taller frame: no overflow,
      login card still reachable with normal scrolling. The mini tab row
      wraps to two lines below ~400px width (e.g. "Groups Expenses Settle" /
      "Totals") — not broken, just not perfectly tidy; left as-is rather
      than shortening labels further, since it's still legible and GPT's
      constraints don't demand pixel-perfect nav wrapping in the smallest
      viewport.
- [ ] `npm run test:e2e` — same blocker as rev 1 (no Docker in this
      sandbox). Still the one thing to run yourself before merging.

One methodology note for whoever continues this: a quick multi-page
Playwright screenshot script (opening a fresh page per step with a
fixed-nominal wait time) produced a false negative here — it looked like
the `expenseForm` step never rendered. A single continuous page traced with
`page.evaluate` polling every 250ms showed the state machine is correct;
the fixed per-page wait times just didn't account for per-page-load
mount/bundle latency variance under the dev server. If you re-verify
timing-sensitive UI like this, prefer one continuous page over many fresh
ones with hardcoded waits.

## Revision 3 — page-reflow bug the screenshots missed

User caught this by watching it live, not from a screenshot: when the
add-expense form step appeared, the whole card grew taller, which grew the
purple column, which changed the total page height enough to shift/flicker
everything below it — including the login card — as the browser's
scrollbar appeared and disappeared. Every rev-2 screenshot was a single
frozen instant, so this never showed up in any of them; it only shows up by
watching the page across a transition, or by measuring page height over
time.

Confirmed with a Playwright trace polling `document.documentElement.
scrollHeight` and the card's `getBoundingClientRect()` every 350ms across a
full loop: content height cycled between 260px (most steps) and 301px (the
form step) — a 41px jump every ~11.5s loop, exactly matching what the user
saw.

Root cause: the content box used rev 2's `minHeight: 260`, which is a
*minimum*, not a cap — content taller than 260px (the form) still grew the
box past it.

- [x] Fixed in `TreasuryDemo.tsx`: replaced `minHeight: 260` with a true
      fixed `height: 310` (260 plus headroom over the measured 301px
      tallest content) and added `overflow: "hidden"` as a safety clamp
      against ever exceeding it. Also added `display: "flex", flexDirection:
      "column", justifyContent: "center"` so shorter screens (Settlements,
      Totals) sit vertically centered in the fixed frame instead of
      top-pinned with dead space below — reads like a clean device preview
      rather than looking broken. This is a frame-layout choice, not a new
      Treasury UI pattern, so it doesn't reopen the rev-2 "don't invent
      design language" concern.
- [x] Re-measured after the fix: content height is now **constant at
      exactly 310px on every single step** across a full traced loop (was
      260/301 before). Page height is correspondingly constant too.
- [x] Re-screenshotted groups/form/settlements at 700px and at 375px mobile
      width: the login card's "Welcome back" heading sits at the exact same
      pixel y-position in every screenshot at a given width — confirms zero
      reflow, at both desktop and the mobile width the user hadn't checked
      yet. No clipping on the tallest (form) step at either width.
- [x] Full unit suite (121 tests) and `tsc --noEmit` re-run clean after the
      change — this was a pure layout fix, no test assertions changed.
- [ ] `npm run test:e2e` — still blocked on Docker in this sandbox, still
      the thing to run before merging.

## Revision 4 — OPEN BUG: page scrolls unnecessarily (not fixed yet)

**Reported by user, not yet investigated in a browser or fixed.** After the
Revision 3 fix, the whole homepage became scrollable "for nothing" — a
small, seemingly pointless sliver of vertical scroll room, not the
dramatic jump/flicker from Revision 3 (that part is confirmed fixed).

### Most likely cause (reasoned from the numbers already measured, not yet
### re-confirmed in a browser)

Revision 3 fixed the jank by making the demo card's content box a
**constant** `height: 310` on every step, sized for the tallest step (the
add-expense form, measured at 301px). That constant is now reserved on
*every* step, including the much shorter ones (Settlements measured way
under that — a single row). Before Revision 3, the box's height ranged
260–301px depending on step (still janky, but sometimes shorter). After,
it's always 310px — never shorter, and 9px taller than even the old worst
case, because of the added headroom.

Measured at one specific viewport (1440×700, i.e. a fairly short browser
window) partway through Revision 3's own verification:
- Before the rev-3 fix: total page height ranged **735–776px** depending on
  step (already taller than the 700px viewport in *every* step, so that
  specific viewport already needed to scroll even before rev 3).
- After the rev-3 fix: total page height is **constant at 785px** — close
  to the old worst case, slightly past it.

So at viewport heights a little above 776px but below ~785px, Revision 3's
fix is plausibly what flipped that viewport from "fits, no scrollbar" to
"just barely doesn't fit, permanent 5-10px-worth-of-scroll" — which matches
"scrollable for nothing" much better than a dramatic layout problem would.
This is a hypothesis built from the numbers on hand, not re-confirmed after
the fact — **first task next session should be re-measuring in a browser
at the user's actual viewport size (ask them, or test a range) to confirm
before changing anything.**

### Candidate directions for next session (none implemented)

- Shrink the tallest step's actual footprint instead of just accommodating
  it, then shrink the fixed `height` to match. E.g. the add-expense form
  currently shows 3 fields (Description/Amount/"Paid by") *and* the
  existing 2-row expense list underneath, all at once — GPT's brief
  explicitly allows "show fewer fields" / "omit secondary controls" as a
  valid simplification. Hiding the existing list while the form is open
  (form-only, like an intermediate step) would cut a large chunk of the
  301px figure without inventing any new visual pattern.
- Alternatively, tighten padding/gaps within the card, or drop from 3 form
  fields to 2, to shrink the worst case directly.
- Whatever the new worst-case measures, re-set `height` to match it
  exactly (not with the ~9px of extra headroom this revision added) —
  keep the "constant, not minimum" fix from Revision 3, just re-tune the
  number down.
- Re-run the same page-height trace method from Revision 3 (Playwright
  polling `document.documentElement.scrollHeight` every ~300ms across a
  full loop) both before and after any change, at more than one viewport
  height, to confirm the fix without reintroducing the original jank.

## Revision 5 — polish pass from GPT feedback (Revision 4 fixed as part of this)

User brought a second round of GPT feedback (screenshots, not live-viewed) once
Revision 4's open bug was already understood. Went through it point by point
rather than a rewrite — user's own framing of the ask was "focused adjustment
prompt", not "another redesign". This pass also resolves Revision 4: the fix
GPT converged on independently (shrink the tallest step's footprint, retune
the fixed height down) was the plan's own leading candidate direction.

- [x] **Vertical whitespace / Revision 4 fix**: `ExpensesScreen` no longer
      renders `DEMO_BASE_EXPENSES` while the add-expense form is open
      (`DemoScreens.tsx`) — the list under the form wasn't the point of that
      step and was what made it the tallest. Re-measured every step's real
      settled (post-transition, not mid-`Collapse`-animation) content height
      with a Playwright trace against a local `react-scripts start` server
      (same no-Docker method as Revisions 1-3): groups/groupSelected 148px,
      expenses 145px, **expenseForm 201px (new tallest)**, expenseSaved
      187px, settlements 83px→161px after the row addition below, totals
      161px. Retuned `TreasuryDemo.tsx`'s fixed `height` from 310 down to
      **215** (≈14px headroom over the new tallest step, same "constant not
      minimum + `overflow: hidden`" safety clamp from Revision 3, just a
      much tighter number now that the tallest step is genuinely shorter).
      Re-traced `document.documentElement.scrollHeight` across a full loop
      at 1440×700 — the exact viewport class Revision 4 was measured at —
      before touching anything and confirmed the earlier 785px page height;
      after this fix, page height is constant at ≤700px with **no
      scrollbar** at that viewport. Also re-confirmed at 1440×900 (fits) and
      the existing mobile breakpoints still scroll only for the expected
      reason (columns stack below `sm`, not a regression).
- [x] **Groups screen identity**: each row now has a small circular icon
      badge (`GroupsIcon` in a `primary.light`/`primary.main` circle,
      inverting to solid `primary.main`/white when selected) instead of
      being bare text — GPT's "tiny bit of Treasury identity" ask. Card
      shadows for *unselected* rows dropped from `boxShadow: 1` to `0`
      (the existing 2px border already reads as a boundary at this scale;
      several small stacked shadows read as toy-like, matching GPT's
      elevation note); selected keeps a shadow (`4` → `3`) so the highlight
      still reads as elevated.
- [x] **Expense row shadows**: same reasoning applied to `ExpensesScreen`'s
      list rows and the grow-in new-expense row — swapped `boxShadow: 1` for
      a `1px solid divider` border, no shadow, on all of them.
- [x] **Kept "Settlements", not "Settle"**: reverted the tab label and
      instead shrank the whole tab row's typography (`0.65rem` → `0.6rem`
      captions, `13px` → `12px`-equivalent icon box, tighter `px`/`gap`) so
      it still fits without wrapping at the 700px width tested — GPT's
      explicit ask, framed as "the section name over the abbreviation".
      Below ~400px width it still wraps to two lines, same as documented
      and accepted in Revision 2 — unrelated to this change, not reopened.
- [x] **Lock → unlock crossfade**: the AppBar tab icons now crossfade
      between `LockOutlinedIcon` and the real section icon (stacked,
      absolutely positioned, `opacity` transition, 0.5s) instead of swapping
      instantly, so picking a group visibly *unlocks* Expenses/Settlements
      rather than just flipping a boolean. `groupSelected`'s hold time went
      1200ms → 1600ms to give that beat more room to read, per GPT's
      "500-800ms more attention" note on this specific transition. The
      Roomies-highlights-before-navigating-away behavior GPT also asked for
      already existed (the `Selected` chip on `groupSelected`) — nothing
      new needed there, just confirmed it's real and not just a lucky
      screenshot.
- [x] **Screen-to-screen crossfade**: wrapped `renderScreen(step)` in a MUI
      `Fade`, but **keyed by `activeTab` (the tab index), not by the literal
      `DemoStep`**. Keying by the raw step would remount `ExpensesScreen` on
      every one of its three sub-steps (expenses/expenseForm/expenseSaved),
      which would kill the existing `Collapse`/`Grow` entrance animations
      for the form and the new-expense row — they only animate on a prop
      change to an already-mounted instance, not on first mount. Keying by
      tab index crossfades only on the four real screen switches
      (Groups→Expenses→Settlements→Totals) and leaves the sub-step
      animations alone. Verified both still work by screenshotting each
      individual step, not just the four tab boundaries.
- [x] **Settlements screen composition**: `DEMO_SETTLEMENT` (singular)
      became `DEMO_SETTLEMENTS` (array of two: `Bob → Alice €24.00`,
      `Charlie → Alice €9.00`), and `SettlementsScreen` now maps over it
      with a divider between rows — same row shape as before, just more of
      it, mirroring how `SettlementPanel` is a list in the real app. Direct
      response to GPT's "one card at the top, blank space underneath"
      complaint; grepped `e2e/` and `backend/scripts/seed.ts` for "Charlie"
      first — no collision, same discipline as the rest of the demo's
      fixture names.
- [x] Explicitly did **not** touch: the purple frame / no browser chrome,
      the AppBar color, the Totals card's design, the locked-tab pattern
      itself (only how it animates), or the overall component architecture
      — per both GPT's list and the user's "polish, not another redesign"
      framing.

### Re-verification

- [x] `npx tsc --noEmit` clean on the changed files (pre-existing,
      unrelated `setupTests.ts` errors from a Node/npm version mismatch in
      this sandbox are untouched and unrelated to this change).
- [x] Full unit suite green: 12 suites, 121 tests, including the 5 for
      `TreasuryDemo` (no test changes needed — none of them asserted on
      exact pixel height, shadow style, or the old "Settle" label).
- [x] All 7 steps re-screenshotted individually (settled state, not
      mid-transition) at 700px width: avatar badges on Groups, tighter
      Expenses/expenseForm without the list crowding the form, two-row
      Settlements, nav row reads "Settlements" in full.
- [x] Re-checked 375px mobile width: card unclipped, nav still wraps to two
      lines exactly as before (expected, see Revision 2), login card
      reachable below via normal scroll.
- [ ] `npm run test:e2e` — still not run in this sandbox (no Docker). Same
      standing item as every prior revision: **run this before merging.**

## Explicitly out of scope for this pass

GPT's later idea (screen-recording this same component for a LinkedIn MP4 /
README GIF) — no export tooling was built. The component being a real,
rendered React tree makes that possible later without rework, but nothing
here targets it.
