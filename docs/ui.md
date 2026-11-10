# UI and UX guide

The rules for every screen of FigExtract Agents: the extract page (`extract.html`: sidebar cards, top bar, view bar, Settings dialog) and the landing page (`index.html`). Read this before any UI change. How the React side is wired is in [react.md](react.md); typing rules are in [typescript.md](typescript.md).

When a case is not covered here, ask the user before inventing a new pattern, then add the answer to this file.

## 1. Principles

- **The sidebar is a settings panel, not a manual.** It shows objects, their state and the actions on them. How-to text goes in tooltips (`title`) or the *How it works* box.
- **One way to do each thing.** A concept has one name, one button style and one place in the card, in every tool.
- **Tools share cards.** Grid, Colorbar, Scale and Panels appear in more than one tool. A change asked for in one tool applies to every tool that shows the card. Map keeps its own word "Plot area" for the grid.
- **Nothing empty.** Empty visuals (the colorbar strip before a colorbar exists), empty hints and empty chip lists are hidden.
- **Undo is the safety net.** Destructive actions on objects run at once with a toast that mentions undo. A `confirm()` comes first only when the action drops something undo cannot easily reach: a whole panel, or ticks lost by placing the colorbar again.

## 2. Tokens

All tokens are on `:root` in `src/styles/base.css`. Never hard-code a color, size, radius or z-index in a component or a page sheet. The only inline styles allowed are **data colors**: an overlay color from Settings → Colors, a region's or profile's swatch.

Shared components and tokens go in `base.css` (its "UI standard" block); rules for one page go in that page's sheet (`extract.css`, `landing.css`).

**Colors.** Each token has a light and a dark value (dark follows `prefers-color-scheme`; `data-theme="light|dark"` on `<html>` forces one).

| Token | Use |
| --- | --- |
| `--bg` | page and sidebar background |
| `--surface` | cards, bars, inputs, buttons, dialogs |
| `--surface-2` | hover fill, chips, table heads, the agent log |
| `--border` | every 1 px border |
| `--text` / `--muted` | body text / secondary text, hints, units |
| `--accent` / `--accent-contrast` / `--accent-soft` | primary buttons, focus ring, links / text on accent / pressed toggles and selected chips |
| `--danger` / `--danger-contrast` | danger buttons, error text / text on a danger fill (error toast) |
| `--warn-bg` / `--warn-text` | `.notice`, `.badge.todo` |
| `--good-bg` / `--good-text` / `--good-dot` | `.badge.ok`, exact colormap match / done status dot |
| `--decision-bg` / `--decision-text` | Jev's lines in the agent log |
| `--stage` | the canvas backdrop |
| `--grid-color`, `--bar-color`, `--flag-color`, `--highlight-color`, `--region-color` | overlay colors, set from Settings → Colors at start-up |
| `--brand-1..4` | the logo's four squares (brand mark and favicon) |

Code that draws on a canvas resolves a token through an element's computed `color` (see `tokenColor` in `profile-plot.ts`): `getPropertyValue('--text')` returns the unresolved `light-dark(…)` text, which a canvas ignores.

**Sizes.**

| Token | Value | Use |
| --- | --- | --- |
| `--control-h` | 32 px | top bar, empty state, dialogs |
| `--control-h-sm` | 28 px | every control in the sidebar and the view bar |
| `--space-1..3` | 4 / 8 / 12 px | gaps and paddings; 16 px and up are multiples of `--space-2` |
| `--fs-xs` / `--fs-sm` / `--fs-md` / `--fs-base` / `--fs-lg` | 11 / 12 / 13 / 14 / 16 px | badges and key caps / fields, hints, tables / card titles, buttons / body / dialog title |
| `--radius-sm` / `--radius-md` / `--radius` / `--radius-lg` / `--radius-pill` | 4 / 6 / 8 / 12 / 999 px | tags, key caps / buttons, inputs, notices / cards, dialogs / landing cards, empty state / chips, badges |
| `--z-sticky` / `--z-popover` / `--z-toast` / `--z-alert` | 2 / 20 / 30 / 99 | table heads / the colormap picker list / toasts / the start-up error banner |

## 3. Card anatomy

A sidebar card is a `<section class="card" id="sec-…">` shell in `extract.html`, filled by a React component from `src/ui/`. From top to bottom:

1. **Head** (`CardHead`): title (`h2`), optional `tag` (`optional`), status badge right after the title, then on the right either head actions (`IconBtn`s) or toggles (`Check`s, Results cards).
2. **Status**: `Notice` (a problem) and `Hint` (live status, a results summary).
3. **Main step** (`MainStep`): the card's main action, a block-wide button on its own row.
4. **Fields** (`Fields` of `Field`s).
5. **Actions** (`Actions` / `SplitActions`): secondary buttons; danger last.
6. **Options** (`Options`): a `details.options` disclosure for rarely changed settings, with an optional `note` in the summary showing the current value or `custom`.

Settings needed on every run stay visible, not in Options (the Agent card's Model).

Known exceptions, which are the standard for their cards:

- **Colorbar and Axes**: the tick pair (Add ticks + Type a tick, Add x ticks + Add y ticks) sits right after the main step, before the fields, because ticks are placed next.
- **Grid**: *Detect rows and columns* is a second block button right after Rows and Columns, since it fills them. *Read labels with AI* lives in the *Row and column labels* disclosure.
- **Results** (all tools, one layout): head with toggles → `Notice` → summary `Hint` → fields (the measurement shown) → table → *Download CSV* (`MainStep`, primary) → `SplitActions` *Long CSV* + *Copy table* → `Options` (rarely changed settings such as Map's bin size). Results cards have no badge.

## 4. Buttons

Always `Btn`, `MainStep` or `IconBtn` from `src/ui/`; never a raw `<button class="btn">` in a card.

| Variant | When |
| --- | --- |
| `primary` (blue) | a required placing step (Place grid corners, Place plot area, Place colorbar ends), Run agent, Sweep, Read labels with AI, every Download CSV. Always blue, not only when it is the next step |
| default (bordered, white) | secondary actions (Add ticks, Type a tick, Long CSV, Copy table) and the main step of an optional card (Measure scale bar, Draw profile, Detect rows and columns) |
| `danger` (bordered, red) | Remove, Delete, Clear, Stop; always last in its row |
| `subtle` (borderless) | small utilities inside a row (Overlay all, Use colormap colors) and the × of a table row |

Never `ghost` or `.small` in the sidebar or the dialog. No *Zoom to* buttons in the cards; the view has zoom.

- **Icons**: every button has `icon` (`data-icon`), drawn by a CSS mask in `base.css`. Available: `place`, `plus`, `minus`, `zoom`, `trash`, `close`, `download`, `copy`, `detect`, `type`, `ai`, `ruler`, `line`, `layers`, `play`, `pause`, `stop`, `reset`, `settings`, `check`, `undo`, `redo`, `prev`, `next`, `upload`, `ellipse`, `rect`, `polygon`, `agent`, `decision`. A new icon is a 24 × 24 stroke SVG in the same style, added to `BtnIcon` and `base.css` together.
- **Icon-only buttons** (`IconBtn`, with `label` as tooltip and accessible name) sit in the card head: Panels + and trash; the trash that removes or deletes the card's object (Grid / Plot area, Colorbar, Scale, the selected region or profile). A head trash for a selected item is hidden without a selection; one for a calibration object is disabled while there is nothing to remove.
- **Row remove** (tick tables): `Btn variant="subtle" icon="close"` with `aria-label` and `title` "Remove tick", no text.
- **Pairs**: two related buttons share a row in equal halves (`SplitActions`); a third takes half of the next row (Polygon).
- **Key caps**: a button with a hotkey passes `hotkey="<action id>"`; the first key is drawn as a cap. `noCap` for zoom, Fit, page flips, Undo and Redo, whose keys are in the tooltip only.
- **Toggles**: `pressed={…}` sets `.active` and `aria-pressed` together. Two-way modes are a `.segmented` pair (Agent only / Agent decision).
- **Busy and swap**: a long action shows its state in the label with "…" ("Reading…"). Run and Stop are two buttons switched with `hidden`, not one relabelled button.

## 5. Badges and tags

- Lowercase text. Several facts are joined with " · " (`viridis_r · 3 ticks`).
- **Counts** pluralise properly: `1 region`, `3 regions`; `none` when empty.
- **Calibrated values** show the value: `9 × 12`, `640 × 480 px`, `1 cm`, `x, y calibrated`.
- **States**: `ok` (green) only when the object is usable (a colorbar with ≥2 valid ticks, both axes calibrated). `todo` (orange) only for a **required** object that is missing (`not placed` on Grid in Heatmap and Map, Colorbar). An **optional** card (tag `optional`: Scale, Axes, ROI's Grid) shows its fallback plain (`pixels`, `none`). Run state (Agent: `off`, `running`) is plain; `done` is ok.
- The tag `optional` marks a card whose absence falls back to a default (pixels, the whole image).
- Badge ids are `{card}-state`.

## 6. Fields and selects

- One field per row: label on the left, control on the right (`Field`). Textareas use `Field stack` (label above). Never put a button on a field's row.
- Labels are short, in sentence case, and name the object ("Measurement", not "Show"). Units go in the label in parentheses: `Bin size (px)`, `Width (± px)`, `Speed (px/s)`. A number with a selectable unit uses `InputPair` (Length [1][cm]) and no Unit label. Explanations go in `title`.
- Numbers are short and right-aligned; selects and text inputs fill the column.
- Select options are plain text: `Log10`, not `Log₁₀`; `Divide by max`, not `÷ each max`. Put explanations in the option's or field's `title`, not in parentheses in the option.
- Placeholders show an example value (`sk-or-…`, `0.5`), never an instruction.
- Bind inputs with `BoundInput` / `BoundSelect` (keeps the draft while typing); an API key uses `SecretInput`.
- Fields bound to the active panel take `key={panel.id}`.

**One name per concept.** Use these words in buttons, labels, notices, tooltips, hotkey names and docs:

| Concept | Word | Not |
| --- | --- | --- |
| Clearing calibration that falls back to a default (grid, plot area, colorbar, scale bar, a tick) | **Remove** ("Remove the colorbar", "Remove tick") | Delete, Clear |
| Discarding something the user made (panel, region, profile) | **Delete** ("Delete the region"); the last panel of a page is replaced by an empty one, so its button reads "Clear the panel" | Remove |
| Emptying a field or list in Settings (a hotkey) | **Clear** | |
| Clicking points on the image to set an object | **Place** ("Place the grid corners.") | Set, Mark |
| The two ends of a colorbar | **colorbar ends** | start and end |
| Map's grid | **Plot area** | grid |
| Labelled numbers on a colorbar or axis | **ticks** | marks, labels |
| Dividing a profile by its max or mean | **Normalize** | Scale |
| Half-width of a sampled line (colorbar, profile) | **Width (± px)** | Averaging |
| How map x/y are reported | **Coordinates**: `Axis values`, `Pixels`, `Scale bar` | X axis, units |
| The heatmap values painted back over the figure | **Show reconstruction** | Reconstruct |
| The ROI statistic shown in the Results table | **Measurement** | Show, Metric |

## 7. Text

- **No how-to text** in the sidebar or the Settings dialog: no gray sentences, no "No X yet. Click …", no explanation paragraphs. Guidance goes in `title` tooltips or *How it works*.
- `Hint` is only live status (a results summary, agent status, a measured scale). `Notice` is only a problem. Both collapse when empty.
- **Problems** (`Notice`, `panelProblem`) are one imperative sentence with the button's words, ending with a period: "Place the grid corners.", "Place the colorbar ends.", "Place the plot area.", "Add at least two ticks."
- **Results summaries**: one line, segments joined by " · ", no final period. Size first (`9 × 12 cells`, `120 × 80 values`, `3 regions × 12 boxes`), then `range a – b` (en dash with spaces, `formatNumber`), then extras such as `4 flagged (ΔE > 10)`. Percentages use `pct()` (`src/extract/results-summary.ts`): one decimal, `<0.1%` for tiny shares.
- **Tooltips**: one sentence without a final period; two or more sentences with periods. With a hotkey: "Description. Shortcut: {key}" (`hotkeyTitle` fills `{key}`; a tooltip that is only the shortcut is "Shortcut: {key}"). Fixed keys are written "(Delete or Backspace; ⌫ on a Mac)". Download tooltips describe the file's shape ("One row per grid row, as in the table"); Copy table's is "Copy the table to paste into a spreadsheet".
- **Icon-only labels** read "Verb the object": "Add a panel", "Remove the scale bar", "Delete the region".
- **Confirms** quote the name: `Delete panel "Fig 2f"?`. **Toasts** are full sentences: `Region deleted. Undo brings it back.`; errors pass `true` and are announced as alerts.
- **Mode bar** texts are full sentences starting with the action ("Click the outer top-left corner of the heatmap."). Esc always leaves a mode, so the text does not repeat it; never mention a button that is not on screen.
- Plain words, US spelling (color, neighboring), sentence case everywhere except the uppercase card titles (CSS does that). Tool names are capitalised: Heatmap, ROI, Map.
- Numbers: `formatNumber` for values; positions along a bar in % with one decimal; color error `ΔE 3.2`; sizes with a spaced `×` (`9 × 12`), copy counts `×12`.

## 8. Accessibility

- Every button has an accessible name: its text, or `aria-label` for icon-only buttons (`IconBtn` sets both).
- Everything clickable is focusable: buttons are `<button>`, not labels or divs. A file picker is a button that calls `input.click()`; the drop zone is `role="button" tabindex="0"` and opens the picker on Enter or Space.
- Focus is visible: the shared `:focus-visible` ring (2 px `--accent`, 1 px offset) applies to buttons, inputs, links, chips, summaries and the tool switch. Never remove an outline without that ring.
- Live regions: the mode bar is `role="status"`; toasts are `role="status"`, or `role="alert"` for errors; `Hint` and `Notice` take `aria-live` where they change while the user works (agent status, colormap match).
- Chip lists have an `aria-label`. Canvases that carry information (colorbar strip, profile plot) have `role="img"` and an `aria-label`.
- Pressed state is always `aria-pressed`; the current Settings section is `aria-current="page"`.
- Contrast: text on a filled background uses its `-contrast` token. Check new colors in both themes.

## 9. Pages and bars

- **Top bar** (both pages): brand (logo + name, linking to the landing page, with `title`), the tool switch, then page actions. On the extract page: Open file… (primary), the file name, then Undo, Redo, Export project (.zip), Settings, each with an icon.
- **View bar**: page flips, zoom − / % / +, Fit, Crosshair, Overlay; size and page count on the left. The file name is shown once, in the top bar.
- **Settings dialog**: a nav of sections (Agent, Matching, Hotkeys, Colors, Import and export), each pane a column of `Field`s with the same rules as the sidebar. Reset buttons read "Reset all X" and are danger, last. Export and Import pair up: "Export settings (.zip)" / "Import settings (.zip)".
- **Landing page**: one card per tool, titled with the tool's name as in the tool switch (Heatmap, ROI, Map), a one-line description, three bullets and an "Open the X tool →" link.

## 10. Checklist for a new or changed card

1. Copy the pattern of `src/extract/workspace/cards/panels-card.tsx`; read [react.md](react.md).
2. Build only from `src/ui/` (no raw `.btn`, `.field`, `.hint`, `.card-head` markup).
3. Follow the anatomy (section 3) and the variants (section 4); every button has an icon.
4. Badge per section 5; words from the table in section 6; no how-to text.
5. Ids `{card}-{object}-{action}` (`roi-dl-csv`, `axis-x-add`); keep existing ids, `data-hotkey` and `data-icon`, since hotkeys, the agent and tests find elements by them.
6. Apply it to every tool that shows the card.
7. Check it in the preview in light and dark (`resize_window colorScheme`), at the narrowest sidebar, and with the keyboard.
8. If you added a new pattern, add it here.
