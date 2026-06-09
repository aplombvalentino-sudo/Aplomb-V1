# Refactor plan — `OutfitBuilder.tsx` and `CaptureFlow.tsx`

*Status: planned, not yet executed. Triage doc for the next refactor pass.*

## Why

Both files crossed 850 lines, each holds ~6 logical sub-components, and they
share patterns (multi-step state machine, blob-preview hook, pill rows,
file-size + MIME validators) that have started to diverge instead of being
shared. Splitting before the next feature lands prevents merge-conflict
churn and makes test surfaces tractable.

| File | Current LOC | Top-level functions | Subcomponents in same file |
|---|---:|---:|---|
| `CaptureFlow.tsx` | 867 | 8 | `IntroStep`, `CaptureStep`, `ReviewStep`, `ReviewSlot`, `PillRowWithOther`, `ConfirmStep`, `Bullet`, `PhotoSlot` |
| `OutfitBuilder.tsx` | 875 | 9 | `SlotRow`, `SlotPickedThumb`, `PickableItem`, `SelfieStep`, `PickedThumb`, `BulletLi`, `GeneratingStep` |

## Target architecture

```
src/components/client/wardrobe/
├── capture/
│   ├── CaptureFlow.tsx              ← only the top-level state machine + step routing (~120 LOC)
│   ├── IntroStep.tsx
│   ├── CaptureStep.tsx              ← photo capture screen (used twice: front + back)
│   ├── ReviewStep.tsx               ← thumbnail review w/ retake buttons
│   ├── ConfirmStep.tsx              ← category + size + color + type + material + description
│   └── constants.ts                 ← CATEGORY_OPTIONS, COLOR_PILLS, SIZE_PILLS, TYPE_PILLS, MATERIAL_PILLS, OTHER sentinel
│
├── builder/
│   ├── OutfitBuilder.tsx            ← only the top-level state machine + step routing (~150 LOC)
│   ├── ItemsStep.tsx                ← slot picker + name + occasion (currently inline)
│   ├── SlotRow.tsx                  ← individual slot row + expandable picker
│   ├── PickableItem.tsx             ← thumbnail tile inside the picker
│   ├── SelfieStep.tsx               ← selfie capture + height + items summary
│   ├── GeneratingStep.tsx           ← in-flight progress UI
│   ├── constants.ts                 ← SLOT_RULES, SLOT_LABELS, SLOT_ORDER, ACCEPTED_SELFIE_MIME, MAX_SELFIE_BYTES
│   └── types.ts                     ← BuilderItem, BuilderStep, Slot
│
└── shared/
    ├── PillRowWithOther.tsx         ← lifted from CaptureFlow — also wanted in edit flows
    ├── PhotoSlot.tsx                ← lifted from CaptureFlow — used by builder selfie step too
    ├── useObjectUrl.ts              ← lifted from CaptureFlow + OutfitBuilder (duplicated currently)
    ├── BulletLi.tsx                 ← merge of `Bullet` and `BulletLi` — identical apart from naming
    └── validators.ts                ← MAX_PHOTO_BYTES, ACCEPTED_PHOTO_MIME, validatePhotoFile()
```

## Concrete extraction order (low → high risk)

### Phase 1 — pure helpers (zero risk, mechanical)

These are leaf utilities with no internal state. Lifting them to `shared/`
is a copy + import rename. **One commit per phase or all in one — both
work.**

1. **`useObjectUrl`** is literally duplicated between the two files. Move
   to `shared/useObjectUrl.ts`. Both files import from there.
2. **`Bullet` / `BulletLi`** — same component, two names. Pick one name
   (`BulletLi`), move to `shared/BulletLi.tsx`.
3. **Validators** — `MAX_BYTES`, `ACCEPTED`, `MAX_SELFIE_BYTES`,
   `ACCEPTED_SELFIE_MIME` are the same set under different names. Unify
   into `shared/validators.ts` exporting `MAX_PHOTO_BYTES` and
   `ACCEPTED_PHOTO_MIME` constants + a `validatePhotoFile(file)` helper
   that returns `{ ok: true } | { ok: false; reason: string }`. Callers
   stop inlining the same three `if` branches.

### Phase 2 — leaf components (low risk)

These are presentational components with no external dependencies beyond
shared helpers. Lifting them is a file-move + adjust imports. Test
coverage stays the same (most aren't directly tested).

4. **`PillRowWithOther`** → `shared/PillRowWithOther.tsx`. Already used
   3× in `CaptureFlow` (color, type, material) and will be reused by
   any future edit-item form.
5. **`PhotoSlot`** → `shared/PhotoSlot.tsx`. Currently
   `CaptureFlow`-only but the selfie input in `OutfitBuilder.SelfieStep`
   re-implements the same control. After the move, `SelfieStep` swaps
   its inline picker for `<PhotoSlot file={…} onFile={…} aspect="3/4" />`.

### Phase 3 — step components (medium risk — they own UI state)

These hold per-step local state (input controllers, error toggles).
Self-contained, but more lines to move. **Do one component per commit
to keep diff review manageable.**

6. **`CaptureFlow` steps:** `IntroStep`, `CaptureStep`, `ReviewStep`,
   `ReviewSlot`, `ConfirmStep` → `capture/*.tsx`. After this, the parent
   `CaptureFlow.tsx` becomes a state-machine + router (~120 LOC).
7. **`OutfitBuilder` steps:** `SlotRow`, `PickableItem`, `SlotPickedThumb`,
   `SelfieStep`, `GeneratingStep`, `PickedThumb` → `builder/*.tsx`. After
   this, the parent `OutfitBuilder.tsx` becomes a state-machine + router
   (~150 LOC).

### Phase 4 — constants + types (housekeeping)

8. Move category/color/type/material/size pill arrays + slot rules from
   the parent files into `capture/constants.ts` and `builder/constants.ts`.
   Export `BuilderItem`, `BuilderStep`, `Slot` from `builder/types.ts`.

## Phase 5 — optional follow-ups (not required for the split)

- **A shared `WizardShell`** primitive (progress dots + AnimatePresence
  step transition) lifted from both wizards. Both files implement the
  same dot-progress + animated swap pattern in slightly different ways.
  Worth doing only after the splits above so the abstraction is shaped
  by two concrete callers, not three.
- **`useFileInput`** hook that bundles `useRef<HTMLInputElement>` +
  `validatePhotoFile` + object-URL preview into one return. Replaces
  the boilerplate `inputRef.current?.click()` + ref-passing in every
  upload step.

## Acceptance criteria for the refactor

- Every existing test still passes (no behaviour change).
- `tsc --noEmit` clean.
- `CaptureFlow.tsx` ≤ 150 LOC.
- `OutfitBuilder.tsx` ≤ 180 LOC.
- No file in `wardrobe/` exceeds 350 LOC.
- No duplication between `useObjectUrl`, `Bullet`/`BulletLi`, or photo
  validators.
- The `eslint-disable @next/next/no-img-element` comments remain only
  where they currently live (on blob-preview `<img>` elements), and the
  rationale stays documented next to `useObjectUrl`.

## Time estimate

| Phase | Effort |
|---|---|
| 1 (helpers)        | ~30 min |
| 2 (leaf components)| ~45 min |
| 3 (step components)| ~90 min — biggest churn, do across 2–3 commits |
| 4 (constants/types)| ~20 min |
| **Total**          | ~3 hours focused work |

## Why now

Three pressures are building:

1. **Future feature work** — an "edit wardrobe item" page is the next
   obvious surface to add. It will reuse `PillRowWithOther`, the size
   pills, and the photo upload UI. Without the split, the edit form
   becomes either a 4th copy of those components or a tangle of
   imports from a 900-line file.
2. **Merge conflicts** — both files have been touched in 4 of the
   last 6 wardrobe-feature commits. Every new branch that touches them
   shares a conflict zone with every other branch.
3. **Test surface** — extracting leaf components makes them
   independently testable. `PillRowWithOther` and `PhotoSlot` are
   pure-input/pure-output and would benefit from unit coverage that
   isn't worth setting up while they're buried inside a wizard.

## Risk notes

- **Animations**: both wizards use `AnimatePresence mode="wait"` with
  `key={step}` for crossfade. When step components move to their own
  files, the parent's `<AnimatePresence>` MUST stay; only the
  `<motion.section key="...">` returns move out with the component.
  Watch for accidental removal of the section wrapper during extraction.
- **Form state**: Step components currently receive `value` + `setValue`
  pairs as props. Keep this pattern — don't try to colocate state in
  the leaf during the split. Lifting state up changes risk profile
  beyond pure refactor.
- **Capture flow's 5-dot progress bar** indexes off a step-name array
  (`["intro", "front", "back", "review", "confirm"]`). After the split
  this array lives in `capture/constants.ts`; the parent component
  imports it. Don't let the order drift between the array and the
  AnimatePresence branches.
