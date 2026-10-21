# Mobile player rendering: rigid detail batches

The Author’s Edition now batches opaque details of high-mesh-count player cars. G63 is the verified target: the loaded model has 1,171 meshes after wheel extraction and cabin preparation. This stage changes rendering only; it does not alter the physical body, drivetrain, steering, tires, collisions or damage inputs.

## Implementation

`js/authors-player-render.js` groups leaf meshes by their immediate parent, exact material object, attribute layout and rendering flags. Positions, normals, UVs and triangle indices are retained. Mesh-local transforms are baked into the batch; the parent remains authoritative. Each wheel hub/spinner, native steering pivot and door/hood pivot therefore remains independently animated. Transparent glass, meshes used for cabin windshield cuts, mirrored local transforms, skinning/morphs and unsupported attribute layouts retain the original renderer path.

The module runs on coarse-pointer/mobile clients, after the imported tire rig and per-car cabin are prepared. Models with existing index LOD assets keep their established LOD path. Smaller models remain unbatched. Building is incremental, with a 4 ms work target per scheduled slice. The original car stays visible until all batches are ready, then the swap is atomic. Recorded slices in these desktop browser tests were about 4.6–6.1 ms; slower phones may take longer.

Original meshes remain in the hierarchy for the damage solver. Render proxies are explicitly excluded from damage discovery. A geometry replacement, changed attribute version or changed local transform copies only that source range into its batch. This keeps progressive dents and reset compatible with the existing damage queue. No buffer rebuild is required on each impact. Rigid wheel motion changes the parent transform and does not rewrite vertices.

The original hidden geometries retain their CPU data. Their previous WebGL allocations are released once batches activate; a fallback can upload the originals again. Batches own their geometry only, reuse the exact original materials/textures, and release their buffers and timers on disposal or disable. Additional retained CPU buffers are about 14.3 MiB for the highway configuration and 22.2 MiB for the full circuit/studio G63. This is a deliberate memory-versus-draw-call tradeoff, not a model download-size reduction. Batch frustum culling can submit more triangles than individual-mesh culling in close cropped views; the measured normal race views submitted the same triangle counts.

## Verification

All browser checks use fresh isolated headless Edge contexts, with requests restricted to `http://127.0.0.1:4317/`. They do not use the user's browser tab or saves.

| Frame | Width | Whole-frame calls before → after |
|---|---:|---:|
| Highway / G63 | 320 | 1381 → 725 |
| Highway / G63 | 390 | 1381 → 725 |
| Highway / G63 | 844 | 1386 → 730 |
| Circuit / G63 | 320 | 1339 → 325 |
| Circuit / G63 | 390 | 1339 → 325 |
| Circuit / G63 | 844 | 1342 → 328 |

These fixed-state race frames reduce whole-frame draw calls by approximately 47–76%. Physics state and input keys are byte-for-byte unchanged by the render toggle. The maximum mean image channel difference is 0.00585 / 255 in the race comparisons. High-speed highway recycling (80 section updates with speed set to 420 km/h) stabilizes at 1295 geometries / 64 textures; 80 circuit renders stay at 959 geometries / 48 textures. Both release to zero player-render states.

Six studio comparisons cover front, rear, wheel spin/steer, cockpit, dented and reset body. Draw calls fall from 370–946 to 67–128; maximum mean channel difference is 0.00412 / 255. Every source vertex and triangle is retained, checked independently from renderer culling. A separate impact while batches are active updates dented geometry without disabling the batches.

Nine mobile handling cases cover G63 on highway and circuit, plus RS7 highway, at 320×740, 390×844 and 844×390. Tests cover throttle/left/right touches, countersteering, release/cancel, upright state, cabin and HUD. Existing RS7 LOD remains on its previous path. Three new unit tests verify exact transformed attributes/index count, pivot animation, progressive damage/reset, excluded glass/cabin pieces and cancellation cleanup. Full suite: **881 passed, 0 failed**. Release syntax/link checks and the local Author’s Edition build pass.

This is browser mobile emulation and a draw-call comparison, not measured FPS, thermal behavior or Safari/iOS validation on a physical phone.

Reproduce with:

- `node --test tests/player-render.test.cjs`
- `node scripts/authors-player-render-qa.cjs`
- `node scripts/authors-player-race-qa.cjs`
- `NOMERA_DAMAGE_QA_CARS` / `NOMERA_DAMAGE_QA_DIR` with `scripts/authors-damage-traffic-qa.cjs`

Results for this delivery are in `outputs/player-render-perf/` in the chat workspace.
