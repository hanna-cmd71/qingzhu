# Fanren pixel assets — generation record

Generated with the built-in image_gen tool. Exactly three calls completed; no variants, retries, postprocessing, or project-source edits were performed. Originals remain in the tool output directory. These files are copied to the asset-only staging directory for main-agent integration.

## Deliverables and validation

| File | Dimensions | Layout | Alpha status |
| --- | --- | --- | --- |
| local-generation/hanli-sword-atlas.png | 1536 × 1024 | 4 columns × 2 rows; nominal cell 384 × 512 | **FAIL** — RGB, no alpha channel or tRNS chunk. Tool baked a pale checkerboard into empty areas despite the explicit transparency request. |
| local-generation/enemy-atlas.png | 1254 × 1254 | 4 columns × 4 rows; nominal cell 313.5 × 313.5 | **PASS** — RGBA, alpha range 0–255; 47.57% fully transparent pixels, 824409 partially transparent pixels, 102 fully opaque pixels. Tool output differs from requested 1024 square. |
| local-generation/battlefield-atlas.png | 1536 × 1024 | 3 columns × 2 rows; exact 512 × 512 panels | RGB opaque, appropriate for terrain. |

## Visual inspection

- Han Li: seven full-body sprites plus one upward-pointing sword, correct row ordering, identity and dark teal/gold costume are closely preserved. No large portraits or labels. The two walking cells appear near-identical, so they provide very little animation difference. Do not directly composite this sheet on the game floor without addressing its baked checkerboard.
- Enemy atlas: all sixteen intended archetypes are present in the specified order, and genuinely transparent empty areas are present. Several enemies use most of the available cell area; crop using proportional boundaries instead of assuming 256-pixel cells. Some effects approach adjacent row boundaries.
- Battlefield atlas: six requested themes appear in the specified order with broad open centers, low-contrast floor texture, decorative edges, no characters, no UI, and no labels. Terrain panels are directly adjacent with exact square panel boundaries. Perimeter buildings/rocks show some visible front-face depth despite the strict overhead request. Walkable percentage is a visual design target, not a measured collision mask.
- Outputs were left unchanged according to the instruction not to retry unless the tool outright failed.

## Reference images

- local-generation/改为卡通Q版像素风格小人。白色背景.png — identity/costume reference; inspected before generation.
- local-generation/改为卡通Q版像素风格道具。白色背景.png — sword design reference; inspected before generation.

## Original generated outputs

- Han Li: local-generation/exec-a3892954-b2f9-4307-9ba5-7c4f2555b3e1.png
- Enemies: local-generation/exec-d805e6f2-49eb-4b9b-bff0-98aeb47b928e.png
- Battlefields: local-generation/exec-170541c5-6bad-4eed-a2c8-b1cccea54375.png

## Hero background and crop diagnostics

The baked checkerboard primarily uses #FEFEFE and #F5F5F5. Variations cluster near #F4F4F4 through #FFFFFF, with occasional one-channel tints. In the top 60-pixel empty band, the five most frequent exact colors are (254,254,254), (245,245,245), (246,246,246), (244,244,244), and (253,253,253). The checker square size appears around 20 pixels. Sprite edges remain dark and distinct against that pale backdrop. Bright, near-neutral removal connected to cell boundaries is technically plausible and would preserve enclosed bright collar pixels better than unrestricted color keying. The casting sprite has a faint cyan edge glow that broad light-pixel removal could erase. No such removal was applied to these delivered files.

Exact nominal cell boundaries: x = [0, 384, 768, 1152, 1536], y = [0, 512, 1024]. All bounds below use absolute atlas pixels, with exclusive right and bottom. Strong-foreground detection included a pixel if channel spread exceeded 30 or its brightest channel was below 180; therefore faint edge fringes may extend a few pixels outside the detected box. These are diagnostic boxes, not exact alpha masks.

| Cell | Nominal bounds [L,T,R,B] | Strong foreground bounds [L,T,R,B] |
| --- | --- | --- |
| Front standing | [0,0,384,512] | [141,76,341,441] |
| Back standing | [384,0,768,512] | [499,83,688,441] |
| Left standing | [768,0,1152,512] | [903,99,1063,441] |
| Right standing | [1152,0,1536,512] | [1217,99,1379,441] |
| Walk 1 | [0,512,384,1024] | [149,544,335,901] |
| Walk 2 | [384,512,768,1024] | [492,544,680,901] |
| Casting | [768,512,1152,1024] | [841,557,1090,899] |
| Sword | [1152,512,1536,1024] | [1236,512,1322,907] |

Sword tip begins at the row-2 boundary, so retain that boundary pixel. The character sprites are not centered perfectly in every nominal cell; use the visible bounds for positioning/baseline alignment if extracting them.

## Exact final prompts

### 1. hanli-sword-atlas.png

```text
Use case: stylized-concept
Asset type: production pixel RPG sprite atlas.
Primary request: Generate a single 4 columns by 2 rows sprite sheet, preferably 1536x1024 pixels, on a genuinely transparent alpha background. All eight cells must be equal size, with no grid drawn. Each sprite is completely isolated, centered inside its cell with generous transparent margins, no bleed into neighbors.
Input images: Image 1 is a character identity and costume reference only; preserve the chibi pixel Han Li identity. Image 2 is a green sword design reference only; preserve its emerald blade, small gold motifs, emerald hilt and gold crossguard.
Subjects, exact cell order:
Row 1 left to right: Han Li front standing; same Han Li back standing; same Han Li left profile standing; same Han Li right profile standing.
Row 2 left to right: Han Li front walking pose 1 with left foot forward; Han Li front walking pose 2 with right foot forward; Han Li casting with one hand forward, small contained turquoise light around hand; the green sword by itself, perfectly vertical, tip pointing UP, handle below.
Character invariants: full body in every character cell, same petite chibi head-to-body proportions, warm brown eyes, fair skin, long dark charcoal hair with partial bun, slim gold hairpin and blue ribbon, dark teal long cultivation robe, gold decorative shoulder edges and hem embroidery, pale silver inner crossed collar, ornate gold waist ornament and restrained red tassel, black boots. Do not include the large portrait from the reference.
Style: crisp handcrafted game-ready low resolution pixel sprites with deliberately visible square pixels, limited consistent palette, restrained pixel shading, sharp silhouette. Match all character sizes and foot baseline. Straight-on sprite sheet presentation. No smooth painted edges.
Constraints: exactly 8 cells, exactly one sprite per cell, no extra weapons carried by the character, no portraits, no floor, no shadow, no text, no labels, no watermark, no opaque background and no checkerboard drawn into the image. Actual PNG transparency throughout all empty space.
```

### 2. enemy-atlas.png

```text
Use case: stylized-concept
Asset type: production low-resolution pixel RPG enemy atlas.
Primary request: Create a 1024x1024 square image, 4 columns by 4 rows, 16 perfectly equal 256x256 cells. The entire background must be genuinely transparent alpha, not white or checkerboard artwork. Do not draw the grid. Each cell has exactly one complete isolated centered enemy sprite occupying about 60 percent of cell height, with generous transparent margins. The enemies are readable chibi pixel-game front / three-quarter views intended to move in a topdown game, consistent scale and crisp visible pixels.
Exact ordering from left to right:
Row 1: teal ghost wisp with eerie eyes; hostile dark-robed cultivator; skeletal ghost; dark wolf-head automaton.
Row 2: demonic snake; black spider; rust-red fire ant; giant beetle.
Row 3: pale elderly ghost cultivator in a dark robe; horned ghost king; armored ancient puppet; ghost caster.
Row 4: poisonous beast; fire spirit; bow-carrying cultivator; giant stone guardian.
These are visual enemy archetypes only. Invent original small readable designs with different silhouettes. Chinese cultivation dark fantasy, dark teal, pale spectral turquoise, violet, bone ivory, restrained ember red. Use crisp pixel clusters, deliberate square edges, tiny strong readable features, restrained shading; no smooth painting or 3D rendering. Each sprite stays within its cell. No numbers, labels, letters, text, UI, border, scenery, portraits, watermark or characters overlapping. No large shadow; at most a tiny contained contact shadow under feet. Deliver real alpha transparency for every empty area.
```

### 3. battlefield-atlas.png

```text
Use case: stylized-concept
Asset type: production pixel RPG battlefield atlas.
Primary request: Create one 1536x1024 landscape image comprising exactly 3 columns by 2 rows of equal 512x512 square terrain panels, tightly adjoining with no dividers, gutters, separators, labels or text. The six panels are individual playable game arenas viewed strictly topdown overhead, not isometric, no horizon or side-view.
Exact order left to right:
Top row: coastal ancient stone ruins in dark teal; underground cave with an ancient sealed chamber; haunted mist graveyard in violet.
Bottom row: volcanic black sand path with small ember cracks; ancient jade palace corridors and courtyard; frosty treasure altar in azure.
Composition of every panel: broad open center with at least 80 percent walkable floor. Put characteristic decorations only along the outermost perimeter corners and thin edge, keeping the large center clear and evenly textured. Floor texture is dark and low contrast so game sprites will read clearly. Coastal panel has wet cracked stone with subtle sea hints at edges; cave panel has rough ancient tiles and peripheral cavern rock; graveyard has cool worn paving, thin edge mist, a few peripheral gravestones; volcanic panel has broad dark walkable ash and sparse thin ember seams; jade palace has large dark green stone floor with restrained perimeter architecture; frozen altar has open cold azure patterned floor with a subtle flat altar motif and sparse crystals at perimeter.
Style: atmospheric handcrafted 16-bit pixel art, crisply visible square pixels, coherent scale across all six panels, carefully limited colors, subtle terrain texture, dark moody floor. These are clean gameplay arenas, no characters, monsters, people, large central obstacles, UI, text, letters, logos or watermark. No perspective, no visible vertical faces, no painted blur.
```


## 0.2beta 首页与金虫修订

本次通过内置 imagegen 生成两张素材，源文件保留，未重试或生成替代变体。提示词见同目录 `refresh-prompts.json`，生成检查见 `refresh-manifest.json`。

- `golden-beetle.png`：金色噬金虫，沿用原甲虫参考的形态。生成器返回 RGB 并将浅色棋盘格画入背景；游戏沿用精灵提取流程，在加载时去掉与边缘相连的近白背景，绘制时保留金壳与深色肢体。此文件本身没有 alpha，不能把原始 PNG 描述为透明成品。
- `menu-backdrop.png`：海岸洞府与远海首页背景，人物和飞剑由游戏原有素材叠加。

当前项目使用的最终文件路径为 `game/public/assets/golden-beetle.png` 与 `game/public/assets/menu-backdrop.png`，均已嵌入离线 HTML。敌方甲虫继续使用旧敌人图集。


## 秘境探索与机缘像素素材 · 2026-09-06

本轮使用内置 image_gen 生成三张新图集，未重绘韩立、飞剑或金色噬金虫。完整最终提示词保存在本目录 `expedition-prompts.json`；原始尺寸及透明度检测见 `expedition-asset-metadata.json`。

- `expedition-portraits-atlas.png`：1536×1024，3×2，紫灵、元瑶、玄骨、极阴、蛮胡子、曲魂。同人解释，非动画官方复刻。
- `expedition-icons-atlas.png`：1774×887，6×3，十二核心与六种任务图标；运行时按归一化格位裁切。
- `expedition-props-atlas.png`：1254×1254，3×3，阵眼、关闭／开启石门、三阶段草株、绿瓶、香炉与物资袋。

三张为 RGBA，具有真实透明像素，头像 alpha 上限为 254，另两张上限 255；保留原始透明通道。人物与物件的取样、裁切用于精灵渲染，未把透明背景替换为假棋盘格。


## 飞剑独立图集 · 2026-09-21

`weapon-atlas.png`（1536×512，4 列 × 1 行，格 384×512）由 `hanli-sword-atlas.png` 的第 7 格（第 2 行第 4 列）逐像素裁切得到，写入第 0 格；其余三格为全透明，留给后续新增的御剑法门。

- 裁切只搬运像素，不改色、不缩放。运行时背景提取与紧致裁切因此得到与原实现完全相同的结果：同一固定战斗画面在改动前后渲染出的画布哈希一致。
- 该图集为 RGBA。第 0 格沿用原图的浅色棋盘格背景，仍由运行时提取，与其他图集的处理方式一致。
- 编码为无损 WebP（`encoded/weapon-atlas.webp`），RGB 与 alpha 均与源图逐像素相同，哈希登记在 `encoded/manifest.json`。
