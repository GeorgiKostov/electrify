# Power Places — Design Language

Version 0.3 · 1 Oct 2026 · Owner: design (Opus) · Status: approved for implementation

How Power Places looks, moves and is laid out. Tokens here are the only allowed values for UI styling; add a token
before adding a new literal. Copy rules live in [VOICE_AND_COPY.md](VOICE_AND_COPY.md).

**Lineage.** The owner selected the final **Cool Places** UI on 30 Sep 2026. Its final cascade in
`navigation.css`, `placement.css`, `menu.css`, `toolbox.css` and `experience.css` is authoritative for the
shell, superseding the earlier Paint Clouds dashboard. Port the structures and exact values locally; never
import from the reference repository. The world remains the existing matte electrical diorama.

---

## 1. Principles

1. **Only energy glows.** The world is matte and calm. Emissive colour, motion and glow are reserved for
   electricity: pulses, lit windows, charging, status rings, sparks. If something glows, it is about power.
2. **Quiet until it matters.** A healthy grid shows neutral cables and flowing pulses, nothing else. Colour and
   labels appear only when something is busy, over, wasted or selected.
3. **One encoding per quantity.** Direction and amount of power = pulses. Loading = cable/ring colour. Stored
   energy = fill level. Loss = heat shimmer. Never reuse a channel for a second meaning.
4. **Never colour alone.** Every state also has an icon, shape or motion (colour-blind safe, prints in greyscale).
5. **The scene explains, the UI confirms.** A player should understand what is wrong from the diorama; UI text
   confirms and gives numbers.
6. **One screen, one job.** Build mode is for placing, run mode is for watching. The UI changes to match.

---

## 2. World (3D)

### 2.1 Style

- Orthographic isometric camera, fixed angle (as Cool Places). Terrain block with a soil cut-away edge, like the
  concept boards.
- Low-poly, small bevels, flat colours, no textures, soft cool shadows. Blender CLI script generates every GLB
  (Cool Places pipeline). No hand-edited exports.
- World saturation stays at or below ~45 % so energy colours pop. No outlines; silhouettes do the work.
- Scale: procedural node meshes have modestly reduced horizontal footprints and narrower roofs so adjacent
  authored tiles leave visible gaps. Object coordinates, electrical distances and save layouts stay unchanged.
  Poles and lines remain slightly thick for readability.

### 2.2 World palette (flat material colours)

| Material | Colour | Material | Colour |
|---|---|---|---|
| Meadow | `#A9C79A` | Roof terracotta | `#D9785B` |
| Meadow shade | `#8DB27E` | Wall cream | `#F3EDE2` |
| Soil edge | `#8A6A4F` | Timber | `#B98B5E` |
| Road | `#C9CCC6` | Foliage (faceted) | `#7FA88A` |
| River | `#6FB3D2` | Rock | `#A8A39A` |
| LV pole (wood) | `#8B6A4A` | MV pole (concrete) | `#BFC4C6` |
| Cable | `#34424D` | Transformer housing | `#8FA3AD` |
| Battery housing | `#EEF1EF` | Solar panel | `#2F4A73` |

### 2.3 Electricity encodings

| Quantity | Encoding | Spec |
|---|---|---|
| **Power flow** (direction + amount) | Pulses moving along cables | Additive sprite, `--pp-spark` core with white centre. Constant speed 2.5 tiles/s at 1× (speed never encodes amount). **Spacing encodes kW**: one pulse per 5 kW per tile, max 6 per tile; any non-zero flow shows at least one pulse per 4 tiles. Direction follows flow; on reversal, pulses fade out and restart the other way over 300 ms. |
| **Loading** (% of limit) | Cable colour; ring gauge at transformers | < 80 %: cable base colour. 80–100 %: `--pp-busy` + gentle 2 Hz vibration + ph-warning badge. > 100 %: `--pp-over`, flicker, sparks, ph-lightning-slash badge. Transformer ring arc fills with loading at all times (neutral until 80 %). |
| **Voltage tier** | Silhouette | LV: short wooden pole, one twisted cable, low sag. MV: tall concrete pole, three cables, crossarm. Never colour-coded. |
| **Stored energy** | Fill level in battery window | Segmented bars (5) in `--pp-battery`; partial top segment. Charging: bars shimmer upward; discharging: downward. |
| **Loss as heat** | Heat shimmer above the cable | Distortion sprite; opacity ∝ loss per tile. Only lines with loss > 0.5 kW show it. |
| **Unused solar** | Panels dim + pulses stop at the bottleneck | Panel material darkens 40 %; ph-sun-dim badge on the array. |
| **Powered building** | Windows lit, activity on | Night: warm emissive windows `--pp-window`. Day: activity cue (café awning out, workshop door open, wisp of steam). |
| **Unpowered building** | Dark, desaturated | Windows off, 30 % desaturated, ph-plug badge when unconnected. After a trip: lights go out along the branch, 120 ms stagger. |
| **Placement** | Actual object silhouette + tile | Valid: green at 55 % opacity with a check badge and cost. Invalid: red with an X badge and reason. The construction grid stays subtle on the terrain. Connection sources use a blue ring, compatible targets green, incompatible ports muted; the hovered invalid target and span turn red. |

### 2.4 Time of day

Keyframed lighting: 05:30 dawn (warm, low), 12:00 neutral high sun, 17:30 golden, 18:00 blue dusk, 21:00 night
(ambient 25 %, cool moonlight). Background gradient follows (day: Cool Places radial `#f4f7f7 → #d8e5ec`; night:
`#22334a → #0f1822`). Windows switch on at dusk only when powered, so the 18:00 connection lesson and 18:30 blackout visibly change them. Solar panels catch a specular glint when output
is high. Interpolate smoothly between steps; never jump.

### 2.5 Camera

Orthographic isometric at the fixed angle; zoom 25–1200 % of Fit, no arbitrary pan clamp. Pan uses the
unsnapped ray-to-ground displacement. Wheel magnitude and delta units affect zoom, anchored at the cursor.
Pinch preserves the moving centroid. Navigation remains available with every construction tool. Fit uses the
measured free frame only on explicit Fit, stage entry or initial load; changing a panel never re-fits the camera.

---

## 3. UI tokens

`src/ui/tokens.css` contains the locally ported Cool Places values. Menu ink, warm surface, primary green,
control and tray families keep the reference values. Electrical semantic colours remain distinct.

```css
:root {
 --pp-font:'Manrope Variable',Manrope,ui-sans-serif,system-ui,sans-serif;
 --pp-ink-strong:#294a48; --pp-ink:#315c4d; --pp-ink-muted:#7b8880; --pp-ink-disabled:#8b968a;
 --pp-menu:#f9f8f4; --pp-menu-top:#f9f8f4ed; --pp-menu-border:#fff; --pp-menu-shadow:0 30px 100px #304b5530; --pp-hero-shadow:0 22px 17px #506b5720; --pp-primary-shadow:0 6px 15px #355f5216; --pp-card-shadow:0 12px 30px #3b635513; --pp-coach:#fff; --pp-coach-ring:#fff8; --pp-backdrop:#dce6e1c9;
 --pp-accent:#3a6659; --pp-accent-hover:#2e5548; --pp-focus:#398a91; --pp-on-accent:#fff;
 --pp-glass:linear-gradient(130deg,#ffffffc4,#ffffff85); --pp-glass-border:#ffffffe6; --pp-glass-shadow:0 8px 32px #33596a0a,inset 0 1px 0 #ffffffb8;
 --pp-control:#f2f7f1f5; --pp-control-border:#abc4bb; --pp-control-shadow:0 3px 9px #355b5b16,inset 0 1px 0 #ffffff; --pp-control-hover:#e4efe7;
 --pp-tray:#edf5f3f2; --pp-tray-border:#bdd2ce; --pp-tray-shadow:0 5px 18px #2b555b14,inset 0 1px 0 #ffffff;
 --pp-item:#ffffffb3; --pp-item-border:#cfdfda; --pp-item-hover:#f8fcf9; --pp-selected:#c5e4e4; --pp-selected-border:#398a91;
 --pp-placement:#f5faf9f2; --pp-placement-border:#d9e6e3; --pp-brief:#f7faf2e8; --pp-close:#eeeee9; --pp-wordmark:#dd9274; --pp-card:#fff; --pp-card-border:#e6e9df;
 --pp-peach:#f1e1d4; --pp-rose:#f2e2df; --pp-sage:#e2ecde; --pp-sky:#dfecef; --pp-sand:#ebe6db; --pp-lavender:#e8e4f0;
 --pp-ok:#236347; --pp-ok-fill:#deefe5; --pp-over:#9e3527; --pp-over-fill:#f9e2dc; --pp-spark:#ffd23f; --pp-grid:#6b7fd7; --pp-solar:#d69a12; --pp-battery:#34b27b; --pp-window:#ffcf8a; --pp-heat:#ff7a45; --pp-busy:#f28c28;
 --pp-r-control:14px; --pp-r-panel:20px; --pp-r-menu:32px; --pp-r-primary:18px; --pp-r-secondary:16px; --pp-r-card:23px; --pp-r-pill:999px;
 --pp-tool-width:112px; --pp-tool-compact:104px; --pp-tool-height:112px;
 --pp-target:44px; --pp-edge:12px; --pp-s1:4px; --pp-s2:8px; --pp-s3:12px; --pp-s4:16px; --pp-s5:24px; --pp-s6:32px;
 --pp-text-body:14px; --pp-text-label:13px; --pp-text-micro:12px; --pp-text-title:20px; --pp-text-display:38px;
 --pp-t-ui:200ms; --pp-t-press:120ms; --pp-ease:cubic-bezier(.2,.8,.2,1);
 --pp-background:radial-gradient(ellipse at 48% 34%,#f4f7f7 0,#e7eff3 48%,#d8e5ec 100%);
}
```

## 4. Layout

### 4.1 Zones

- Upper left: Menu and Tasks, inset by the safe area. Tasks shows the current goal count and opens a compact panel.
- Upper right: a resource pill with remaining / total coins and earned stars. Resources opens beneath it on the
  right; Tasks opens beneath its control on the left. Resources labels Coins left and Budget explicitly.
- Below the controls: a quiet stage heading, short goal and one current teaching step.
- Bottom centre: compact Run day / clock controls above a horizontal tool tray. The tray prioritises the current
  lesson; More tools reveals already learned tools. Undo sits beside the tray without overlapping Run day.
- Placement and inspection share a compact right column on desktop (300 px, 20 px from the edge); phone and
  short landscape keep the context above the bottom controls. Panels scroll when Details grows. Coordinate and
  endpoint alternatives live inside Keyboard building / Details. Placement hides duplicate top teaching and the
  Run row; inspection hides duplicate teaching. Context headers contain only the title and close control; status,
  coin cost and confirmation each have their own row. Advanced numbers and graphs start at stage 3, battery schedules
  at stage 5, robotaxi schedules at stage 6.
- View controls form a group of three 44 px Phosphor buttons: minus, four corners (Fit view), plus. Each has an
  accessible name and tooltip; the coach and help explain the four-corner button and keyboard 0. The group sits
  at the lower right on desktop; 850–1049 px desktop widths place it below Resources at the upper right to keep
  the tool tray clear. Phones place the group at the lower right above the tray, with goal text and teaching
  at full width. Expanded phone timelines temporarily hide the camera group; Collapse restores it. Short landscape places the bottom controls beside the scene, following Cool Places' layout.
- Fit uses projected world bounds within a measured frame below the heading. Desktop always reserves the context
  column; phone reserves 64 px above the compact bottom controls for camera targets. Panel visibility changes only the stored frame,
  keeping the current projection stable. Short landscape reserves the right control column horizontally and
  the lower-left camera controls vertically, leaving the scene the full height above those controls. The first
  stage displays the initial small island; growth widens it.

### 4.2 Menus and modes

Home opens on every launch. Continue identifies the saved stage. Home, pause, stages, settings, help, diagnosis
and completion share the warm native dialog. The menu history gives Back and Escape consistent behaviour; the
dialog traps focus and blocks map input. Opening any menu pauses day playback and power pulses.

One shared visibility rule suppresses labels, hover feedback, construction grid, ports, ghosts, context panels
and the coach whenever a window owns focus or the interface is hidden. Window backgrounds show the committed
scene. Teaching and Run controls are hidden behind windows while retaining their layout measurements. Tasks
and Resources keep the held preview, tool and selection; closing restores the preview scene and ghost without
a camera fit. Full dialogs retain their existing preview cancellation; tool and selection survive closing.

Build exposes only centrally permitted tools. Run hides the tray and placement preview. Closing a menu keeps the
day paused until the player explicitly resumes. Hide interface leaves a Show interface control and allows only
camera navigation: drag/pinch, wheel, pan/zoom keys and Fit. Canvas taps cannot select, place or connect; Enter,
undo, arrow edits and Space cannot change the hidden build or start playback. A held preview survives hidden
navigation and restores when the interface returns. Central preview and ghost guards enforce the same rule.

### 4.3 Breakpoints

`< 600` phone menus fill the screen; `600–849` compact gameplay; `≥ 850` desktop shell.
Short landscape (`height < 481`) places the tools at the right. Verify at 320 × 640, 390 × 844,
844 × 390, 1280 × 720 and 1920 × 1080. Phone scrub and speed controls live in the expanded timeline to keep the
compact Run / Check actions readable.

Line confirmation is explicit at the target, with the existing keyboard controls retained in Details. After a
commit the line tool stays armed and the target becomes the next source; cumulative LV reach still applies.
Change start clears the source without leaving the tool. Escape or a stationary secondary click leaves line
mode; a secondary drag pans. Hovered, source and target labels suppress text while every unpowered load keeps
its plug badge clear of the port. Inspectors show authoritative current demand, need interval, peak time,
connections and whether the cause is a missing line, an upstream trip or no demand now.

## 5. Components

| Family | Current port | Used for |
|---|---|---|
| Header control | 44 × 44, control radius; Tasks 64 wide | Menu, Tasks |
| Resource pill | 44 high, control radius | Coins and earned stars |
| Menu dialog | 880 wide, 32 radius, warm surface; full screen on phone | Home, pause, settings, stages, results |
| Menu primary | 54 high, 18 radius, reference green | Continue and Next stage |
| Secondary browse | 48 high, 16 radius | Explore stages, replay |
| Chapter card | Two columns on desktop; one on phone, 23 radius | Six electrical stage cards with locks and stars |
| Tool tray | Reference light sage surface, 19 radius, 4 padding | Current lesson tools and More tools |
| Tool tile | 112 × 112 desktop, 104 × 112 compact, 14 radius | Flow rows for glyph, full name and coin cost; names and costs at least 12 px |
| Context panel | Reference placement surface, 20 radius; measured height | Placement and selected object |
| Run / Check action | 44 high, reference green / white secondary | Day playback and inspection |
| Map label | Quiet white capsule with text | Selected object and current problems |

The current procedural core uses Phosphor tool glyphs. Home and stage cards use captures of the actual electrical
scene: chapter covers use their completed audited layout and chapter focus time, so Evening rush shows dusk
and Sunny field shows the solar field at noon. Missing covers retain their placeholder until the image is ready,
without rebuilding the menu. Home fits its content on desktop, has no ambiguous close action and puts the
archiving new-campaign action below the regular utilities. Tool costs share the same aligned 16 px coin glyph and 12 px numeral treatment as resource and preview
costs. Line tiles explicitly say / tile. Select and navigation carry no zero-cost badge. More tools starts at the
first tile when explicitly opened or closed; ordinary refreshes retain horizontal browsing position. Transformer tiles say Small or Large transformer, show capacity and use distinct glyphs. Desktop rows wrap
before scrolling; compact screens retain horizontal browsing. Asset
thumbnails remain an art-pass concern; no Cool Places building imagery belongs in this game.

### 5.1 Timeline

Stage 1 exposes Run day only after a connection. Stage 2 adds Check day. Stage 3 adds scrubbing, speed and an
expand control. Expanded graphs and schedule lanes are optional. Battery and robotaxi selectors use the same
committed command path as timeline lanes, so keyboard alternatives obey the same capabilities. Expanded
timelines suppress the teaching paragraph on narrow screens. In short landscape the details scroll within the
available height, keeping Run, Check and Collapse visible beneath the header. Robotaxi Start uses the labelled
schedule-control layout, with legal minimum and maximum start times and a next-day annotation after midnight.

The expanded desktop timeline is an opaque 340 px right dock, bounded to the viewport height minus five
control heights; its details scroll while Run, Check and Collapse stay reachable. Phone details are bounded
to 40 svh or six control heights, whichever is smaller. Demand, grid import and solar share one kW scale;
the dashed threshold is labelled Grid connection limit. Hour ticks and Now follow the scrubber.

### 5.2 Menu and settings (Cool Places pattern)

The native warm menu copies Cool Places' wordmark header, Back, circular close, centred hero and primary,
chapter card browser and utility rows. Utility buttons group the icon and label at the leading edge. Settings
contains labelled region, clock, motion and tip controls; Numbers
appears from stage 3. Settings persist immediately and keep keyboard focus on the changed control.

Start new campaign preserves the active campaign in a local archive. Restore previous campaign offers saved
stages and keeps the current campaign too. Existing version-1 saves migrate without deleting their original key.
Audio controls are not shown in this functioning web core; no sound system has been added in this UI pass.

### 5.3 Gesture coach (Paint Clouds pattern)

A lightweight white-hand navigation coach starts when the player continues from Home before completing it.
Move, zoom and Fit advance after a 1.8-second reading interval; Skip is always available. Completion is saved,
and How to play → Practice moving replays it. The current core uses a static hand when motion is reduced.

### 5.4 Stars

`ph-star` regular (empty) and `ph-star` fill weight (earned, `--pp-spark` with ink-strong outline for contrast).
Earned stars pop in with `--pp-ease-pop` one at a time, 180 ms apart.

---

## 6. Icons (Phosphor, `@phosphor-icons/web`, regular weight)

One icon means one thing everywhere. Controls use regular weight; earned stars use fill. The current core tray uses
Phosphor glyphs; rendered tool thumbnails belong to the later art pass. Every class used must have its glyph declared in `src/ui/icons.css`, and a test
fails otherwise (Cool Places / Paint Clouds pattern). Verify each name exists in the pinned package; if one does not,
choose the nearest and update this table in the same change.

| Meaning | Icon | Meaning | Icon |
|---|---|---|---|
| Run day / play | `play` | Pause | `pause` |
| Speed | `fast-forward` | Check day | `magnifying-glass` |
| Expand / collapse timeline | `caret-up` / `caret-down` | Undo | `arrow-u-up-left` |
| Menu | `list` | Hint / tips | `lightbulb` |
| Numbers on map | `hash` | Close | `x` |
| Coins | `coins` | Star | `star` |
| Goal met | `check-circle` | Busy (80–100 %) | `warning` |
| Over limit / tripped | `lightning-slash` | Invalid placement | `prohibit` |
| Not connected | `plug` | Power (kW) | `lightning` |
| Battery charging / discharging | `battery-charging` / `battery-full` | Battery empty | `battery-empty` |
| Solar making | `sun` | Unused solar | `sun-dim` |
| Night | `moon` | Lost as heat | `thermometer-hot` |
| Home | `house` | Café | `coffee` |
| Workshop | `factory` | Robotaxi | `car` |
| Grid connection | `plugs-connected` | Move | `arrows-out-cardinal` |
| Upgrade | `arrow-fat-up` | Remove | `trash` |
| Field notes | `book-open` (inside Guide) | Settings | `gear` |
| Sound | `speaker-high` / `speaker-slash` | Restart stage | `arrow-counter-clockwise` |
| Replay the moment | `clock-counter-clockwise` | Hide / show interface | `eye-slash` / `eye` |
| Guide | `book-open` | Stages | `map-trifold` |
| Tips & controls | `hand-pointing` | Home | `door-open` |
| Music | `music-notes` | Sound effects | `waveform` |
| Ambience | `tree` | Region | `globe-hemisphere-west` |

---

## 7. Motion

- UI: hover/press `--pp-t-press`, panel in/out `--pp-t-panel` with `--pp-ease` (slide 12 px + fade). Nothing
  bounces except earned stars and the placement settle.
- Placement: 700 ms settle (drop 0.2 tile, squash 4 %), plus two staggered ground ripples (Cool Places recipe).
- World motion that carries information (pulses, fill levels, vibration, flicker) is never decorative.
- **Reduced motion** (system default, overridable in Settings): pulses become static chevrons along cables with the
  same spacing rule; no vibration or flicker (busy/over keep colour + badge); no stagger, no camera moves (cuts
  instead); settle becomes a 150 ms fade. Information must survive this mode.
- Frame-rate independent: all animation uses elapsed time, never frame counts.

## 8. Sound (MVP set)

Short, soft, woody and tactile, never alarming. Three channels, each with its own slider under a master **Sound**
switch (§5.2): **Music** (a calm loop), **Sound effects** (the cues below) and **Ambience** (wind, birds by day,
crickets at night, the river near the water).

| Cue | Character |
|---|---|
| Pick tool / place pole / place transformer | Soft click / wooden tap / low "thunk" |
| Line connected | Short rising zip |
| Building powered | Two-note chime, pitch by building type |
| Busy | Transformer hum rises smoothly with loading (continuous, subtle) |
| Trip | Crackle, then the "clunk" of a switch; ambience ducks |
| Battery in / out | Soft rising / falling tone |
| Star earned | Bright pluck, one per star |
| Stage complete | 3-second warm motif |

## 9. Do / don't

- Do keep the diorama visible: panels never cover more than 40 % of the canvas on desktop (phone sheets may cover
  the tray area and up to 55 %).
- Do anchor every map label to its object with a leader; hide labels that would overlap, keeping problems first.
- Don't add dashboards, tables or multi-series charts outside the timeline and inspector.
- Don't use emoji, text glyphs (`✓ × → +`) or non-Phosphor icons in controls.
- Don't use red for anything that is not "over the limit / not allowed".
- Don't animate numbers counting up in labels (it hides the value); animate bars instead.
