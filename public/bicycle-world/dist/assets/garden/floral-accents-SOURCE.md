# Approved floral accents

Author: Quaternius. Source: [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), downloaded from the author's linked [itch.io release](https://quaternius.itch.io/stylized-nature-megakit). Archive retained at workspace `outputs/playful-detail-implementation-20261110/nature-standard.zip`; extracted evidence and `License_Standard.txt` under `nature-selected/`. Actual Standard license states **CC0 1.0 Universal**, [Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/).

Exact selected original glTF models:

- A: `Flower_3_Group` — 755 triangles (710 foliage, 45 flowers), coral/pink petals in the source flower atlas. `Flower_4_Group` is yellow and was not substituted.
- C: `Bush_Common_Flowers` — 1,368 triangles (900 foliage, 468 flowers). The actual downloaded model samples the purple flower region of the atlas. Official pack preview appears pink; preserve the actual source rather than silently recoloring or claiming an exact pink match.

`floral-accents.glb`: **632,352 bytes**, SHA-256 `011cf290068b3ef67ff31a710ed119db300d93299596257fa59572690ece81af`. Two original meshes, four material primitives; four instanced submissions total for six flower-group instances and two flowering bushes. Berry bushes remain in their separate one-draw GLB.

Conversion repacks original glTF buffer data without changing positions, indices, normals, vertex colors, UVs or node transforms. Embedded PNGs use Pillow Lanczos resize, preserving aspect and alpha, with each dimension at most 512: `Leaves.png` 512×512 / 220,786 bytes; shared `Flowers.png` 512×498 / 180,165 bytes; `Leaves_NormalTree_C.png` 512×512 / 69,515 bytes. These are diffuse/alpha maps; the last filename does not mean a normal map. Duplicate flower texture pixels are embedded once. No unused pack assets or normal maps included.

The actual source uses double-sided alpha-tested foliage/petals (`MASK`, cutoff approximately 0.2). These settings and source material values are retained because opaque cards would show rectangular backgrounds. No blended transparency or new animation loop added. Runtime clones geometry/materials but leaves shared source texture ownership with the existing asset loader. Uniform scaling and grounding happen at instance placement, after all berry positions are fixed; no map, route or collision data changes.

Quality limit: resizing changes texture samples and requires live visual review for tiny leaf/petal edges. Source identity, alpha requirements and geometry are verified; this is not a claim that downsampling is visually lossless or that device/XR performance has been tested.

Runtime appearance calibration after actual browser review: C initially read almost black beside the existing garden. Its original vertex colors were inspected and are approximately white, not an accidental dark multiplier. Its source leaf swatch is dark olive RGB (88,123,0). Only C's foliage material receives linear diffuse gain (2.2,2,1) and a small emissive color floor (0.02,0.055,0.008) to keep shaded leaves readable. Petals, source atlas, alpha mask, geometry, UVs and placements remain unchanged. This is an explicit garden-palette adaptation, not a claim to reproduce the source preview exactly; lead browser review determines final appearance.
