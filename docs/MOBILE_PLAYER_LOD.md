# G63 player LOD on mobile

The Author’s Edition adds two optional index-only LOD levels to G63 and makes them compatible with the existing rigid-detail batches. The full GLB, vertex attributes, wheel hierarchy, steering and physical model remain unchanged. Other cars retain their existing LOD behavior.

## Selection and appearance

- Full geometry is mandatory inside 5.2 m from the model center. It stays full until the camera passes 6 m; the far-level thresholds remain 22 m out / 18 m in.
- G63 uses an estimated projected-error cap of 0.5 CSS pixel, with a lower 0.425-pixel threshold before entering a coarser level. This additional hysteresis prevents per-mesh error thresholds from flickering when the camera moves slightly.
- Wheel LOD is independent: full below 6 m, held full until 7 m when moving out. The same screen-error check applies. Hubs, axles, spin/steer/compression transforms and source vertices are unchanged.
- Native steering geometry, cabin cut meshes, transparent glass and unsupported or unmatched meshes remain on their full path. Every close-up pixel comparison returned to full topology after moving the camera back.

The offline inventory is 1,298,610 triangles full, 992,354 at medium and 702,600 at far. These are available topology counts, not a guarantee that every mesh will switch at a particular distance: screen-error protection and exact source matching can retain individual full meshes.

G63 wheel PCA can introduce tiny floating-point differences in bind coordinates between fresh loads. Its LOD keys therefore use the versioned source, named hierarchy, vertex/index counts, index samples and source-triangle mapping, rather than a bind-position hash. Changed topology fails matching and stays full. Some borderline body/wheel partitions can still differ between loads; those parts also safely retain full detail. The final studio run matched 475 of 477 generated entries.

## Batches and damage

`NomeraVehicleLOD.fullGeometry(mesh)` exposes the authoritative full geometry to the batch builder. Race rendering now selects source LOD first, then updates the player batch. Batch alternatives contain only index buffers and share the existing position/normal/UV attributes. They reuse the original materials.

New combinations are assembled in scheduled slices with a 4 ms work target. The current finer geometry stays visible while a coarser combination is prepared; when moving closer, unavailable finer combinations immediately fall back to full. Each batch keeps at most three cached alternatives. Alternatives dispose their own indices without disposing the shared vertex attributes. Pending jobs are cancelled on release. Measured index-build slices in the race checks were below 2 ms on this desktop browser; this is not a phone timing guarantee.

Damage still starts on full original source geometry. Batch render proxies remain excluded from impact discovery. The resulting deformed attributes update all cached alternatives, so switching does not undo a dent or change its physical input. Progressive processing and reset use the existing queue. The studio impact changed 91,044 vertices across 222 source meshes; hashes stayed identical through far → near and returned to their original values after reset.

The optional G63 payload is requested only for the prepared player in a race. Preparing podium wheels does not download it. It is decoded in the existing worker and guarded by the source GLB hash. A missing worker or failed payload leaves the full, batched car visible. Raw JSON is 5,160,227 bytes; an offline gzip measurement is 1,088,739 bytes (compressed network transfer depends on the host). Decoded source indices use approximately 13–14 MiB, and measured additional batch index caches use 3–8.2 MiB. These are additional to the preceding stage’s vertex batches; this stage reduces submitted triangles rather than vertex storage or the original GLB download.

## Browser verification

Fresh isolated headless Edge contexts allow requests only to localhost. User tabs and saves are not used.

| G63 frame | Width | Full → LOD submitted triangles | Draw calls |
|---|---:|---:|---:|
| Highway | 320 | 1,294,802 → 1,042,144 | 759 → 759 |
| Highway | 390 | 1,294,802 → 1,042,144 | 759 → 759 |
| Highway | 844 | 1,295,290 → 1,042,632 | 768 → 768 |
| Circuit | 320 | 1,506,071 → 1,217,623 | 325 → 325 |
| Circuit | 390 | 1,506,105 → 1,217,657 | 325 → 325 |
| Circuit | 844 | 1,507,711 → 1,219,263 | 328 → 328 |

Default chase views save approximately 19–20% of whole-frame triangles on top of the earlier draw-call optimization. Physics state and held keys remain byte-for-byte unchanged by the rendering toggle. The maximum mean channel difference in these race frames is 0.0067 / 255.

Six studio comparisons cover close, first transition, chase, far, distant and return-close views with spun/steered wheels. The distant view saves about 44% of submitted triangles. Near and return-near images are identical. The maximum mean channel difference is 0.0273 / 255. Boundary jitter switches the distance level only on entry and final return; a separate unit test exercises the projected-error threshold.

Thirty-six repeated near/medium/far cycles stabilize at 247 geometries / 3 textures and about 8.2 MiB of batch alternative indices. Eighty highway section updates with speed set to 420 km/h stabilize at 1481 geometries / 64 textures; 80 circuit frames stay at 1008 / 48. Cleanup releases both player-render and LOD model states. Nine touch scenarios cover G63 highway/circuit and RS7 highway at 320/390/844 px, including direction reversal, release/cancel, upright state, driver camera and HUD.

Five new unit cases cover combined batch LOD, deformation/reset, boundary hysteresis, failed optional data, stable wheel keys and lazy player-only preparation. Full suite: **886 passed, zero failed**. Syntax/link checks and the local Author’s Edition build pass.

These are mobile viewport/touch emulation and renderer counters, not measured physical-phone FPS, Safari/iOS behavior or thermal performance.

Reproduce with `npm run player:lod:qa`, `node --test tests/player-lod.test.cjs tests/vehicle-lod.test.cjs tests/player-render.test.cjs`, and the existing selected-car touch harness. Artifacts are delivered under `outputs/player-lod/` in the chat workspace.
