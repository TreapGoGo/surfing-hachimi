# Hachimi Resonance Algorithm v1.0 Implementation Plan

## 1. Version Control
- **Goal**: Bump version to 0.0.4.4 to mark this major algorithm update.
- **Actions**:
    - Update `version` in `package.json`.
    - Update `version` in `public/manifest.json`.
    - *Note*: Since I cannot directly push to your remote git repository, I will perform the local file updates. You can commit and push after verification.

## 2. Documentation
- **Goal**: Create a single source of truth for the algorithm to ensure maintainability.
- **Actions**:
    - Create `docs/HACHIMI_RESONANCE_ALGORITHM.md` (or similar path).
    - **Content**:
        - **Core Philosophy**: Energy, Decay, Feedback.
        - **Mathematical Model**: Exact formulas for $E$, $C$, $I$, $W$.
        - **Weight Constants**: `copy` (+5), `coin` (+5), `open_comment` (+4), etc.
        - **Sampling Strategy**: Details of the "Stratified Probabilistic Sampling" (High/Normal pools).

## 3. Implementation: Data Layer
- **Goal**: Support new metadata and efficient querying.
- **Actions**:
    - **`src/shared/types/index.ts`**:
        - Add `copy` to `ActionType`.
        - Add `lastShownAt`, `capsuleShowCount`, `capsuleHoverCount`, `capsuleClickCount` to `ContentMetadata`.
    - **`src/shared/db/index.ts`**:
        - Update `mergeAndSaveItem` to preserve new metadata fields.
        - Implement `getResonanceCandidates()`:
            - Use IndexedDB `getAllKeys` on `by-score` index to get keys for High (`>=7`) and Normal (`<7`) pools separately.
            - Randomly sample keys from both pools (e.g., 50 from High, 50 from Normal).
            - Fetch full items only for the selected keys (Batch Fetch).
        - Implement `updateItemStats(id, stats)`: Helper to update capsule stats without full object merge overhead.

## 4. Implementation: Algorithm Layer
- **Goal**: Encapsulate the complex weighting logic.
- **Actions**:
    - Create **`src/dashboard/utils/algorithm.ts`**.
    - Implement `calculateResonanceWeight(item)`: Pure function taking an item and returning its weight $W$.
    - Implement `selectCapsuleItems(candidates, count)`: Logic to perform weighted random selection from the candidates.

## 5. Implementation: UI Layer
- **Goal**: Connect the algorithm to the view and track interactions.
- **Actions**:
    - **`src/dashboard/components/TimeCapsule.tsx`**:
        - Refactor data loading: Switch from client-side `items.filter` to async `db.getResonanceCandidates()`.
        - Implement `refreshItems` function: Calls DB -> Calc Weights -> Select -> Update State.
        - **Interaction Tracking**:
            - `onMouseEnter`: Track hover (debounce to avoid jitter).
            - `onClick` / `Copy`: Track click, update `lastShownAt` and counts in DB immediately.
        - **Display**: Ensure the UI loading state is handled during the async calculation.

## 6. Verification
- **Goal**: Ensure no regressions and algorithm works as expected.
- **Actions**:
    - Run `npm run build`.
    - Verify type safety.
    - Check if "Copy" action is correctly recorded.
