# LiteVault Web UI Interaction Spec (V1)
> Source of truth for page structure, components, states, microcopy, and error handling.
> Aligned with Stitch prototypes (Home/Search/Library/Settings/Tag Management/Auth).

## 0. Global Layout (App Shell)
### Structure
- Left Sidebar (fixed)
  - Brand (logo + LiteVault)
  - Nav items: Home / Search / Library / Settings
  - User card (bottom): avatar + name + plan/account label
- Main Content (scroll)
- Global UI utilities
  - Toast/Notification
  - Modal layer
  - Skeleton/loading placeholders

### Sidebar behaviors
- Active route highlighted with soft green pill background.
- Icons + labels (consistent spacing).
- User card is clickable (optional) but not required in V1.

### Responsive Behavior

#### Breakpoints
| Breakpoint | Width | Navigation |
|------------|-------|------------|
| Mobile | < 768px | Top bar + hamburger drawer |
| Desktop | ≥ 768px (md) | Left sidebar |

#### Mobile Navigation (< md)
- **Top bar**: Logo + page title + hamburger button (right)
- **Drawer**: Sheet sliding from right with nav items + UserCard at bottom
- Sidebar is hidden on mobile

#### Layout Adaptations
- Main content padding: `px-4 py-6` on mobile, `p-8` on desktop
- Modals: `max-h-[85vh] overflow-y-auto` for viewport safety
- Tags table: Card layout on mobile, table on desktop
- InputBar: Stacks vertically on mobile (search mode)
- Tags page controls: Stack filters on mobile

---

## 1. Data Model (UI-facing)
### Item
- id: string
- rawText: string
- title: string | null
- summary: string | null
- tags: string[]
- status: "ENRICHING" | "READY_TO_CONFIRM" | "ARCHIVED" | "DISCARDED" | "FAILED"
- sourceType: "NOTE" | "ARTICLE" (optional, for Evidence UI)
- createdAt: timestamp
- updatedAt: timestamp
- confirmedAt: timestamp | null

### SearchResult
- answer: string
- evidence: EvidenceItem[]
- totalSources: number

### EvidenceItem
- itemId: string
- snippet: string
- score: number (optional)
- type: "NOTE" | "ARTICLE"
- tags: string[]

---

## 2. Home Page (`/`)
### Layout (matches prototype)
- Hero
  - Greeting: "Good Morning, Alex."
  - Subtitle: "What is growing in your mind today?"
- Capture Section (two-row layout)
  - Row 1: Textarea + # Tag Button (aligned horizontally)
  - Row 2: AI Toggle (left) + Save Button (right)
- Section: PENDING REVIEW
  - Card list (vertical)

### Components
- <GreetingHero />
- Capture Section:
  - <Textarea /> for content input
  - <TagPicker /> triggered by # button (reused component)
  - <Switch /> for AI suggestions toggle
  - <Button /> for Save action
- <PendingReviewSection>
  - <PendingCard variant="skeleton/enriching/ready/failed" />

### Tag Picker (# button)
- Opens TagPicker popover on click
- Search input with debounced backend search (250-350ms)
- Shows loading/empty/error states
- Create new tag option when no exact match
- Selected tags shown as removable chips in TagPicker
- Auth gating: redirects to login if not signed in

### States
1) Idle (empty input)
- Save disabled
- Pending Review may be empty or show items

2) Saving (after clicking Save)
- Immediately append a new PendingCard in ENRICHING state
- Clear input field (recommended)
- Toast: "Saved. Generating insight…"

3) Enriching
- Show skeleton lines + status text "Enriching…"
- Right-side subtle spinner/check placeholder (as in prototype)

4) Ready to confirm
- Card shows title + short summary
- Status pill: "Ready to confirm"
- Timestamp: "2m ago" / "Yesterday" style

5) Failed
- Card shows "Couldn’t generate insight"
- Actions: "Retry" (primary) + "Open" (secondary)

### Empty states
- Pending Review empty:
  - Title: "Nothing pending"
  - Copy: "Save a thought to start building your vault."

### Error states
- Save failed (network/4xx/5xx)
  - Toast: "Save failed. Please try again."
  - Do not create a pending card, OR create one in FAILED state (choose one and keep consistent; V1 recommend FAILED card so user can retry)

---

## 3. Pending Item Modal (Review) (invoked from Home pending card)
### Layout (matches prototype)
- Modal title: "Insight Summary"
- Optional badge: "AI INSIGHT" + model label (e.g. "Gemini 3.0")
- Body: summary text (editable in edit mode if you support)
- **Suggested by AI section** (for READY_TO_CONFIRM items)
  - Show AI-suggested tags as selectable chips
  - Chip states: default (unselected) → accepted (green check) / rejected (red X)
  - Default state: all suggestions selected for acceptance
- **Your tags section**
  - TagPicker to add existing tags from library
  - Shows selected tags as removable chips
- Footer actions
  - Left: "Discard" (text button)
  - Right: "Confirm & Save" (primary)

### States
- View mode (default)
- Edit mode (optional in V1; recommended)
  - Title editable? (Your prototype modal shows only summary; if you want to keep it minimal, skip title editing here)
  - Tags editable

### Confirm flow
- On click "Confirm & Save"
  - Button shows loading: "Saving…" and disabled
  - Payload includes:
    - `acceptedSuggestionIds`: selected AI suggestions
    - `rejectedSuggestionIds`: deselected AI suggestions
    - `addedTagIds`: tags added from TagPicker
  - Success: close modal + remove from Pending list + appears in Library
  - Toast: "Saved to Library"

### Discard flow
- Click "Discard"
  - Confirm dialog (recommended):
    - Title: "Discard this item?"
    - Copy: "You can't undo this action."
    - Actions: Cancel / Discard
  - Success: close modal + remove pending card
  - Toast: "Discarded"

### Error handling
- Confirm failed → keep modal open, show inline error under footer:
  - "Couldn't save. Please try again."
- Tag update failed → revert optimistic change, show toast

---

## 4. Search Page (`/search`)

### Search Mode Behavior (V1)
Search V1 supports two query modes:
- **Tag-only mode**: Query starts with `#` → matches tags only.
- **Combined mode**: All other queries → matches text (title/summary/rawText) OR tags.

### Layout (V1)
- Header: "Search"
- Query bar (top)
  - Placeholder: "Search your vault..."
  - **Tag Helper Chip**: "# Tag" button inside input (right). Clicking inserts `#` to start tag mode.
  - Button: "Search" (Primary Mint)
- **Tag Suggestions**:
  - Typing `#` opens a popover with suggested tags from the backend.
  - Selecting a tag inserts it into the query.
- Results
  - Mode indicator (optional): "Showing tag matches" or "Showing all matches"
  - Simple item cards list (same as Library cards)
  - Pagination (load more)

> **V2 Deferred**: The "Synthesized Answer" and "Evidence" sections are reserved for Search V2.

### Components
- `<SearchBar>` with `endAdornment` for Tag Chip.
- `<TagSearchPopover>` (inline, triggers on `#`).
- `<SearchResultsList>` (simple item cards).

### States
1) **Empty** (no query submitted)
- Use greeting hero:
  - "Good Morning, Alex."
  - "What are you looking for today?"
  - Placeholder: "Search your vault..."
  - Button: "Search"

2) **Searching**
- Disable Search button
- Show skeleton list placeholders

3) **Results**
- Show search mode indicator if query was tag-only
- Display item cards with:
  - Title, summary snippet, tags badges
  - Click opens Item Detail Modal (read-only)

4) **No results**
- Title: "No matches found"
- Copy (tag-only): "No items have matching tags."
- Copy (combined): "Try a different search or save more notes to your vault."
- Action: "Clear search" or "Go to Home"

5) **Error**
- Inline banner in results area:
  - "Search failed. Please try again."
  - Action: Retry

### Item card click
- Opens Item Detail Modal (read-only).

---

## 5. Library Page (`/library`)
### Layout (matches prototype)
- Header: "Library"
- Top right utilities:
  - Search input: "Search your vault…"
  - View toggle: list/grid icons (prototype shows)
- Timeline groups:
  - TODAY / YESTERDAY / LAST 7 DAYS (uppercase label)
  - Each group contains item cards

### Components
- <LibraryHeader />
- <LibrarySearchInput />
- <ViewToggle />
- <TimelineGroup label="TODAY|YESTERDAY|LAST 7 DAYS">
  - <LibraryItemCard />

### States
- Loading: skeleton list
- Empty:
  - Title: "Your library is empty"
  - Copy: "Save a thought on Home, then confirm it to see it here."
  - Action: "Go to Home"
- Error:
  - "Couldn’t load your library." + Retry

### Item card interactions
- Click opens Item Detail Modal
- Optional affordances (present in prototype):
  - Pin icon (if you keep it, define behavior; if not implemented in V1, remove from UI)

### Item Detail Modal (Library/Search)
Shows full item details for ARCHIVED items.

#### Layout
- Modal title: Item title (editable)
- Body sections:
  - **Summary**: AI-generated summary (read-only display)
  - **Original Text**: User's original captured text
    - Read-only by default
    - "Edit" button reveals textarea with Cancel/Save
  - **Tags**: Tag chips with ability to add/remove
- Footer: "Discard" (danger) + "Close"

#### Edit Original Text Flow
1. User clicks "Edit" next to Original Text
2. Text becomes editable textarea
3. Cancel: Reverts to original, returns to read-only
4. Save:
   - Button shows spinner: "Saving..."
   - Calls PATCH /items/:id with `originalText`
   - Success: Toast "Original text updated.", return to read-only
   - Error: Toast "Couldn't save changes.", keep editable
5. Note: Editing does NOT regenerate AI fields (by design)

---

## 6. Settings Page (`/settings`)
### Layout (matches prototype)
- Title: "Settings"
- Subtitle: "Manage your account, preferences, and data."
- Sections (stacked cards):
  - Account
  - Preferences
  - Tags (entry to Tag Management)

### Components
- <AccountCard />
- <PreferencesCard />
- <TagsCard />

### AccountCard behaviors
- Displays avatar, name, email
- "Edit Profile" link (V1 can be placeholder)
- "Log out" button
- "Delete account" (danger link) – V1 can be gated/placeholder

### PreferencesCard
- Default Language (dropdown)
- Timezone (dropdown)
- Toggle: "AI suggested tags and summary"
  - Copy: "Automatically generate tags and summaries for new items."

### TagsCard
- Text: "You currently have 24 active tags in your library."
- Button: "Manage tags" leads to `/settings/tags`

### States
- Loading: skeleton cards
- Error: inline banner + Retry

---

## 7. Tag Management Page (`/settings/tags`)
### Layout (matches prototype)
- Breadcrumb: "Settings / Tag Management"
- Title: "Tag Management"
- Subtitle: "Organize your knowledge base by renaming, merging, or cleaning up unused tags."
- Primary actions:
  - "Tag Analytics" (secondary)
  - "Create New Tag" (primary)
- Controls row:
  - Search input "Search tags…"
  - Sort dropdown "Sort by Name"
  - Toggle "Show Unused"
- Table
  - Columns: Tag Name / Usage Count / Last Used / Actions
  - Pagination footer

### States
- Loading: table skeleton
- Empty (no tags):
  - "No tags yet"
  - "Confirm an item with tags to see them here."
  - Action: "Go to Home"
- Empty (filtered):
  - "No tags match your filters"
  - Action: "Clear filters"
- Error:
  - "Couldn’t load tags." + Retry

### Interactions
- Create New Tag
  - Opens modal:
    - Title: "Create a new tag"
    - Field: Tag name
    - Actions: Cancel / Create
- Rename Tag (row action)
  - Inline edit OR modal (V1 recommend modal)
- Merge Tags (row action or multi-select)
  - V1 simplest: action on a row "Merge into…" opens tag picker
- Delete Tag
  - Confirm dialog:
    - Copy clarifies whether it removes tag from items or deletes tag entity only

---

## 8. Auth Pages (`/auth/signup`, `/auth/login`)
### Sign up (matches prototype)
- Title: "Start your collection"
- Subtitle: "Your personal space for calm knowledge."
- OAuth: Continue with Google / GitHub
- Email + Password fields
- Primary button: "Create free account"
- Footer: Terms of Service + Privacy Policy

### Sign in (matches prototype)
- Title: "Welcome back"
- Subtitle: "Capture your thoughts, organized and safe."
- OAuth + Email/Password
- Link: "Forgot password?"
- Primary button: "Sign In"
- Footer: "Create an account"

### Auth states
- Submitting: disable buttons, show spinner
- Error:
  - Inline under form: "Invalid email or password."
  - For OAuth: toast "OAuth failed. Please try again."