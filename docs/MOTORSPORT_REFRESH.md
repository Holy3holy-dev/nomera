# Motorsport / collection refresh

Local Author’s Edition only. No deployment, live-account access or change to the payout rules.

## Races

`authors-race-experience.js` records elapsed time at the existing validated checkpoints, including the final crossing **before** settlement. The HUD shows the next sector, an early turn warning and the most recent split. The result separates driving/finish income from the existing drift bonus; these components sum to the original gross receipt. Fuel, wear, XP and net credit continue through the original single settlement path.

Personal sector bests are local and scoped by profile, car, track, difficulty, physics, transmission, physical upgrades, effective performance and weather. Cosmetic paint/plate income do not reset them. Health can change effective performance; repair restores comparable settings. A weather change during a run disables its record write. There is no bonus payment for the clean-sector indicator. At most 48 configurations and 32 split times per configuration are kept. Failed/unavailable storage does not block a race.

The route coach reads the spline at 4 Hz; it neither writes steering nor changes the camera/force solver. It follows the nearest upcoming bend, rather than a sharper, opposite bend further away. Pursuit hides the duplicate coach while the existing police panel is visible. Landscape navigation, position, minimap and speedometer have separate areas. Touch targets remain at least 44 px high while pressed; feedback changes brightness rather than shrinking the hit area. Results reopen at the top, with focus on the title. Tiny or negative receipts no longer produce an epic celebration. A completed circuit reports the finish reason to the shared settlement screen, so the result shows the finishing position rather than the generic exit title.

Circuit startup now applies the selected weather to both the renderer state and vehicle physics. Previously the renderer could start at night while the physics received the chosen weather.

## Track and visuals

`authors-route-dressing.js` adds readable yellow chevrons, industrial district signs and water-tower silhouettes. Placements are checked against the complete track, not just a local segment. All are decorative and remain outside the driveable road. Highway groups reuse the existing chunk pool. Mobile static batching also collects these groups.

One 512 × 256 RGBA sign atlas is about 0.5 MiB before mipmaps. Geometry and materials are shared; the circuit has at most 28 turn signs. No dynamic light, shadow map, postprocessing pass or external download is added. Owned textures/geometries, groups and DOM HUD are released with the engine.

## Tire effects

The existing highway VFX pools now use actual suspension contact positions, height and normal. Smoke and marks respond to tire slip/lock; an ordinary straight launch is not classified as a burnout just because the throttle is down. Front-wheel spin can emit from front tires. Airborne wheels and large position discontinuities break mark continuity. Rain uses smaller, shorter spray; tunnel shelter prevents outdoor spray. Emission is paced and a duplicate drift-smoke emitter is disabled in this edition. Existing pool capacities are unchanged.

The circuit’s separate 24-particle pool follows grounded rear-wheel contacts and road height, with paced emission and a small rain effect. Full tire-ribbon parity between the two renderers remains a possible later improvement.

## Plates and interface

Seven display treatments progress from enamel/satin through platinum, ruby, opal and gold. Material names explicitly describe the showcase, not the manufactured plate or a real-world entitlement. National dimensions, glyphs, game rarity, prices and generation odds remain authoritative. A short sheen replaces the permanent repeating sweep. Reward accents remain brief and respect reduced motion. Passport text and rarity labels retain solid backgrounds and contrast.

## Validation

- 902 Node tests passed, including new checkpoint ordering, storage normalization, cosmetic-independent record keys, selected-weather startup and contact VFX tests.
- Local Edge/Playwright contexts only; all requests restricted to the local preview. Existing user tabs and saves were not used.
- Four viewport sizes for the generator; all five national formats fit their stage.
- 12 race views: highway, Rockport Ring, Canyon Pass and Bayview Sprint at 320/390/844 CSS px. Touch cancellation, singleton HUD, landscape overlay separation, visual-only state invariance and result panels passed.
- A scripted sequence of all 12 validated crossings verifies the final sector, finish reason, initial result scroll position, bounded awards and reduced motion. This is a checkpoint fixture, not a driven lap or an income benchmark.
- Personal times reload, improve and remain isolated between profiles; the timing layer leaves the wallet unchanged.
- Highway chunk recycling did not grow the route pool or geometry count after warmup.
- Six additional mobile handling/camera/HUD checks for Chiron and G63; the same harness also checked dents, traffic contacts, police durability/cooldown and tunnel shelter.
- Asset/syntax checks and local `dist --authors` build passed; the new stylesheet is included in the distributable.

This is mobile viewport/touch emulation, not a real-phone FPS, temperature, Safari or iOS measurement. Player GLBs, LOD data, wheel rigs and damage geometry were not edited in this stage.
