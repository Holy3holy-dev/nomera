# Mobile LOD across the heavy player fleet

This stage extends the G63 approach to the rest of the active heavy fleet. The inventory counts actual scene primitives in the shipped GLBs; 22 active models contain at least 190,000 source triangles. Nine had no LOD: GT-R, Cayman, Chiron, SF90, X5M, Camry, Cullinan, Vesta and Jesko. Twelve existing heavy-model payloads were rebuilt and their switching policy updated. G63 remains a regression target. Three lighter pre-existing LOD models retain their previous settings.

## Behavior

`js/player-lod-profiles.js` is the explicit per-model policy and source-to-catalogue binding. Medium/far alternatives remain index-only: original GLBs, vertices, material/texture data, rigs and physics are unchanged. The near distance policy remains full below 5.2 m, held to 6 m on exit; far thresholds remain 22/18 m. Newly covered profiles use an estimated 0.5 CSS-pixel error ceiling. Previously optimized heavy models retain their 0.75-pixel ceiling and original simplification error budget, so the extension does not force them into denser geometry. Both use a lower entry threshold and wheel distance hysteresis around 6.5 m. Cabin cut meshes, transparent glass and native steering parts remain protected. No fade requires drawing two complete cars at once.

The nine newly covered models request optional LOD data only for the prepared racing player. Existing models preserve their established preparation behavior so rival LOD is not removed. Batched models keep the preceding draw-call optimization. Alternative batch indices are built in small scheduled slices and share the same deformable attributes. Each batch retains at most three alternatives; source-index downloads retain the existing bounded cache. If matching or loading fails, original full geometry remains visible.

Wheel keys use stable versioned source topology and source-triangle mapping to tolerate PCA bind-coordinate roundoff. GT-R required a further fix: its unnamed primitive ordinals change across fresh loads. Only its explicitly opted-in generated `Mesh_N` path components are normalized; parent names, geometry samples, index counts, vertex counts and source version still guard binding. Non-indexed full geometry now has a logical sequential index representation for LOD without converting or overwriting the full geometry. Regression tests cover both paths.

X5M required a separate simplifier profile because its disconnected seams and normal discontinuities prevented meaningful reduction under the generic normal weight. Its profile uses attribute-aware permissive simplification with a lower normal weight; topological border locking and the geometric error bound remain enabled. Near geometry is unchanged. Paired views, wheel axes, progressive dents and reset were checked after this tuning. This is not a change to its original materials or full model.

## Validation

All browser checks use fresh isolated headless Edge contexts restricted to localhost. No user tab or saved state is used.

- 22 cars × 4 paired studio views (near/chase/far/return): **88 comparisons**. Each car also passes source binding, wheel spin/steer, mesh-level boundary jitter, progressive damage, far/near retention, reset, repeat-cycle memory stability and cleanup. Maximum mean channel difference across these comparisons is below 0.379 / 255; near views retain the full topology.
- **72 race comparisons:** 12 cars × highway/circuit × 320/390/844 px. Whole-frame triangles fall without increased draw calls. Render toggles leave physics state and held controls byte-for-byte unchanged. Each context includes 80 section/render cycles and cleanup checks.
- **36 touch scenarios:** all nine newly covered models, with GT-R, X5M and Chiron additionally checked in both modes. Direction reversal, release/cancel, upright state, driver camera and HUD pass at three mobile sizes.
- **9 dedicated driver-camera checks:** forward rays, seat placement, animated steering and exterior restoration pass.
- **890 unit/integrity tests** pass; syntax/local-link checks and the local Author’s Edition build pass. Tests additionally cover source-version guards, index validity, untouched GLBs, non-indexed restoration and anonymous GT-R matching.

Example highway frames at 390 px (whole-frame submitted triangles):

| Player | Full → LOD | Reduction |
|---|---:|---:|
| GT-R | 1,411,712 → 783,566 | 44% |
| RS7 | 2,529,346 → 1,782,062 | 30% |
| M3 G80 | 1,398,445 → 868,283 | 38% |
| Cayman | 741,505 → 513,845 | 31% |
| Camry | 361,795 → 290,531 | 20% |
| X5M | 357,950 → 315,708 | 12% |
| Vesta | 286,821 → 240,293 | 16% |
| Chiron | 670,954 → 619,976 | 8% |
| SF90 | 447,418 → 431,860 | 3% |
| Cullinan | 293,020 → 283,815 | 3% |
| Jesko | 285,372 → 243,658 | 15% |

The gain depends on the original mesh structure and protected parts. These figures are renderer counters, not physical-phone FPS. Optional JSON/index data adds transfer and memory overhead; it is not a GLB-size reduction. Server response compression matters for delivery. Safari/iOS, real-device thermal behavior and a phone frame-time benchmark are not tested.

The full X5M already shows surface/material defects with LOD and batching disabled. Its unbatched reference was inspected separately; the LOD comparisons retain that existing appearance. Repairing this source asset belongs to a separate visual cleanup, documented in the next-step proposal.

Reproduce with `npm run fleet:lod:qa`, the selected-car touch/camera harnesses, and `node --test tests/fleet-lod.test.cjs tests/player-lod.test.cjs tests/vehicle-lod.test.cjs`. Local delivery artifacts are in `outputs/fleet-player-lod/` in the chat workspace. No deployment or push was performed.
