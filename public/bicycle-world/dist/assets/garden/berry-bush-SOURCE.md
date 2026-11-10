# Berry bush source and conversion

Approved object: **BushBerries_4**, by **Quaternius**, from [Ultimate Crops](https://quaternius.com/packs/ultimatecrops.html). License: **CC0 1.0 Universal**, [Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/).

Original acquired files and license are retained in `outputs/playful-detail-implementation-20261110/` at workspace root. Acquisition manifest records the official linked Google Drive folder and individual file IDs.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| BushBerries_4.obj | 41,665 | 8223eccb61f774ba0360c94f995e2ead2c786283272352895b73574a71c00ae0 |
| BushBerries_4.mtl | 423 | 3d2306e15f61aed8b4c9a86db5e7f8d7bdbce6c1a6098469b2c098a2da3a3b33 |
| Crops-License.txt | 364 | 83d8959f9fc56353ed571fbe2dc52e4bcd64508e2399501cd45ac2ce3df0bf8c |

`berry-bush.glb`: 97,868 bytes, 892 triangles, 2,676 non-indexed vertices, one primitive and one opaque vertex-colored material. No textures, skins, animations, compression or simplification. Local Three.js OBJLoader parsed source faces; original expanded positions and supplied normals remain exact. MTL `Kd` values for `Berry` and `Green_Bush` were copied numerically into per-vertex float RGB, merging the two material groups into one draw. Source has no UV coordinates or texture maps. GLTFExporter wrote the self-contained GLB.

Appearance adaptation: an opaque standard material with roughness 1 and metalness 0 replaces legacy MTL specular/shininess values; diffuse colors and source geometry are retained. This is not a claim of identical legacy renderer lighting. Runtime clones geometry, grounds its original bounds and uniformly scales each bush to 0.9–1.2 world units high. Three instances occupy two small groups, use existing garden clearance, avoid existing trunks/stones/other planting, and add no colliders or animation loop.

Runtime garden-palette adaptation after browser review: cloned material diffuse gain is 1.25, uniformly applied so the source berry/leaf color relationship stays intact. Original GLB vertex colors and geometry remain unchanged. This modest increase keeps the small bushes readable beside the brighter established planting.

Original license text:

> LowPoly Models by @Quaternius
>
> Consider supporting me on Patreon, even $1 helps me a lot!
>
> https://www.patreon.com/quaternius
>
> License: CC0 1.0 Universal (CC0 1.0)
>
> Public Domain Dedication
>
> https://creativecommons.org/publicdomain/zero/1.0/
