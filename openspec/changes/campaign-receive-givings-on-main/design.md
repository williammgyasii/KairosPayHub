## Context

See proposal.md for why. Today `AcceptsContributionsNow` ignores whether the program is a parent with children; dual giving is always allowed (`campaign-sub-campaigns`). Create campaign is a single form; first-sub create already supports `moveParentContributions`.

## Goals / Non-Goals

**Goals:**

- Persist `ReceiveGivingsOnMain` (bool) on root `GivingProgram`.
- Create flow branches: ON → optional first sub; OFF → required first sub.
- Campaign settings on root: toggle with turn-off migrate (pick or create sub, then move directs).
- Contribution create + UI gated by setting ∧ open window.
- Manager vs engine: policy helpers for labels/help and “can log on this program”; wizards/settings read them.

**Non-Goals:**

- Per-sub settings or church-wide default beyond migrate-true.
- Year-end archive (parked).
- Renaming `acceptsContributions` in the API payload (compose in clients / enrich DTO if needed).

## Decisions

1. **Column on root program (not settings table)**  
   `ReceiveGivingsOnMain` on `GivingProgram`. Sub rows ignore/always N/A.  
   *Alt:* `CampaignSettings` table — defer until more settings pile up.

2. **API field name**  
   JSON: `receiveGivingsOnMain`. UI copy: “Receive givings on main campaign?”  
   *Alt:* `acceptsDirectContributions` — less aligned with product language.

3. **Create OFF requires inline first sub**  
   Same request or transactional create parent + child; reuse sub create payload shape.  
   *Alt:* allow empty container — rejected by product.

4. **Turn-off migrate**  
   Settings PATCH with `receiveGivingsOnMain: false` requires `moveDirectToProgramId` or embedded `createSubThenMove`. Reuse existing move-parent-contributions path (all direct rows on root, pending + approved).  
   *Alt:* block turn-off until empty — worse UX.

5. **Who can edit settings**  
   Same as campaign manage (pastor / church admin). Intermediate leaders do not change root settings.

6. **DTO**  
   Expose `receiveGivingsOnMain` on program responses. Effective “can log here” for UI = existing acceptsContributions ∧ (not root ∨ receiveGivingsOnMain).

## Risks / Trade-offs

- [Create OFF + first sub fails mid-way] → Single transaction or compensating delete; tests for atomicity.
- [Partial move] → Move all directs in one transaction before flipping the flag.
- [Spec conflict with archived campaign-sub-campaigns always-on] → This change supersedes that requirement for parent logging.

## Migration Plan

1. Add column default `true`; backfill existing roots to `true`.
2. Deploy API guards + DTO.
3. Ship create + settings UI.
4. Rollback: column remains; ignore in UI / treat as always true if needed.

## Open Questions

None that block specs or tasks. Exact settings chrome (sheet vs modal) can follow existing campaign action patterns.
