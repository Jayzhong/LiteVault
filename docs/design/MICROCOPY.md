# LiteVault Microcopy (V1.1)

This document defines the canonical UI microcopy for LiteVault Web V1.1.
Use these strings verbatim unless a deliberate product change is made.

## Style & Tone Guidelines
- Calm, minimal, supportive. Avoid overly “chatty” phrasing.
- Prefer short labels. One sentence max for helper text.
- Use sentence case for most UI text. Use ALL CAPS only for timeline group labels.
- Keep consistent verbs:
  - Capture: “Save”
  - Search: “Ask” (or “Search” for the empty state variant — see below)
  - Confirm: “Confirm & Save”
  - Destructive: “Discard”, “Delete”

## Global
- app.name: "LiteVault"
- common.loading: "Loading..."
- common.retry: "Retry"
- common.cancel: "Cancel"
- common.close: "Close"
- common.save: "Save"
- common.search: "Search"
- common.ask: "Ask →"
- common.edit: "Edit"
- common.done: "Done"

### Toasts
- toast.saved_generating: "Saved. Generating insight…"
- toast.saved_to_library: "Saved to Library."
- toast.discarded: "Discarded."
- toast.action_failed: "Something went wrong. Please try again."
- toast.network_error: "Network error. Please check your connection."

---

## Sidebar
- nav.home: "Home"
- nav.search: "Search"
- nav.library: "Library"
- nav.settings: "Settings"

---

## Home (`/`)
### Hero
- home.greeting: "Good Morning, {name}."
  - Note: allow time-of-day variants if needed later (Morning/Afternoon/Evening).
- home.subtitle: "What is growing in your mind today?"

### Capture Input
- home.capture.placeholder: "Plant a thought..."
- home.capture.action: "Save"
- home.capture.disabled_hint (optional): "Write something to save."

### Pending Review Section
- home.pending.title: "PENDING REVIEW"
- home.pending.status.enriching: "Enriching..."
- home.pending.status.ready: "Ready to confirm"
- home.pending.status.failed_title: "Couldn’t generate insight"
- home.pending.status.failed_help: "Please try again."
- home.pending.action.open: "Open"
- home.pending.action.retry: "Retry"

### Empty / Error
- home.pending.empty.title: "Nothing pending"
- home.pending.empty.copy: "Save a thought to start building your vault."
- home.pending.error.title: "Couldn’t load pending items."
- home.pending.error.action: "Retry"

---

## Insight / Review Modal (Pending Item)
- modal.insight.badge: "AI INSIGHT"
- modal.insight.title: "Insight Summary"
- modal.insight.tags.add: "+ Add Tag"
- modal.insight.action.discard: "Discard"
- modal.insight.action.confirm: "Confirm & Save"
- modal.insight.action.confirm_loading: "Saving…"

### Discard Confirm Dialog
- dialog.discard.title: "Discard this item?"
- dialog.discard.copy: "You can’t undo this action."
- dialog.discard.cancel: "Cancel"
- dialog.discard.confirm: "Discard"

### Save / Confirm Errors
- modal.insight.error.save_failed: "Couldn’t save. Please try again."
- modal.insight.error.discard_failed: "Couldn’t discard. Please try again."
- modal.insight.error.tag_failed: "Couldn’t update tags. Please try again."

---

## Search (`/search`)
### Empty State (simple hero variant)
- search.empty.greeting: "Good Morning, {name}."
- search.empty.subtitle: "What are you looking for today?"
- search.empty.placeholder: "Search your vault..."
- search.empty.action: "Search"

### Results Page
- search.title: "Search"
- search.query.placeholder: "Ask anything about your vault..."
- search.action.ask: "Ask →"

### Sections
- search.section.answer: "✨ Synthesized Answer"
- search.section.evidence: "Evidence"
- search.badge.sources: "{n} sources"

### Feedback
- search.feedback.helpful: "Helpful"
- search.feedback.not_helpful: "Not helpful"

### Loading / Empty / Error
- search.loading.answer: "Thinking…"
- search.empty_results.title: "No matches found"
- search.empty_results.copy: "Try a different question or save more notes to your vault."
- search.empty_results.action: "Go to Home"
- search.error.title: "Search failed."
- search.error.copy: "Please try again."
- search.error.action: "Retry"

---

## Evidence Cards
- evidence.type.note: "NOTE"
- evidence.type.article: "ARTICLE"

---

## Library (`/library`)
- library.title: "Library"
- library.search.placeholder: "Search your vault..."
- library.group.today: "TODAY"
- library.group.yesterday: "YESTERDAY"
- library.group.last7days: "LAST 7 DAYS"

### Empty / Error
- library.empty.title: "Your library is empty"
- library.empty.copy: "Save a thought on Home, then confirm it to see it here."
- library.empty.action: "Go to Home"
- library.error.title: "Couldn’t load your library."
- library.error.action: "Retry"

---

## Settings (`/settings`)
- settings.title: "Settings"
- settings.subtitle: "Manage your account, preferences, and data."

### Sections
- settings.section.account: "Account"
- settings.section.preferences: "Preferences"
- settings.section.tags: "Tags"

### Account Card
- settings.account.edit_profile: "Edit Profile"
- settings.account.logout: "Log out"
- settings.account.member_since: "Member since {year}"
- settings.account.delete_account: "Delete account"

### Preferences Card
- settings.preferences.default_language: "Default Language"
- settings.preferences.timezone: "Timezone"
- settings.preferences.ai_toggle.title: "AI suggested tags and summary"
- settings.preferences.ai_toggle.help: "Automatically generate tags and summaries for new items."

### Tags Card
- settings.tags.title: "Tag Management"
- settings.tags.summary: "You currently have {n} active tags in your library."
- settings.tags.manage: "Manage tags →"

### Settings Footer (optional)
- settings.footer.version: "LiteVault Version {version}"
- settings.footer.privacy: "Privacy Policy"

---

## Tag Management (`/settings/tags`)
- tags.breadcrumb: "Settings / Tag Management"
- tags.title: "Tag Management"
- tags.subtitle: "Organize your knowledge base by renaming, merging, or cleaning up unused tags."

### Actions
- tags.action.analytics: "Tag Analytics"
- tags.action.create: "+ Create New Tag"

### Controls
- tags.search.placeholder: "Search tags..."
- tags.sort.label: "Sort by Name"
- tags.toggle.unused: "Show Unused"

### Table
- tags.table.col.name: "TAG NAME"
- tags.table.col.usage: "USAGE COUNT"
- tags.table.col.last_used: "LAST USED"
- tags.table.col.actions: "ACTIONS"
- tags.row.usage_notes: "{n} notes"
- tags.row.unused_badge: "UNUSED"

### Empty / Error
- tags.empty.title: "No tags yet"
- tags.empty.copy: "Confirm an item with tags to see them here."
- tags.empty.action: "Go to Home"
- tags.empty_filtered.title: "No tags match your filters"
- tags.empty_filtered.action: "Clear filters"
- tags.error.title: "Couldn’t load tags."
- tags.error.action: "Retry"

### Create Tag Modal
- tags.create_modal.title: "Create a new tag"
- tags.create_modal.field_label: "Tag name"
- tags.create_modal.placeholder: "e.g. Design"
- tags.create_modal.cancel: "Cancel"
- tags.create_modal.confirm: "Create"

### Rename Tag Modal (if using modal)
- tags.rename_modal.title: "Rename tag"
- tags.rename_modal.field_label: "New name"
- tags.rename_modal.cancel: "Cancel"
- tags.rename_modal.confirm: "Save"

### Delete Tag Dialog
- tags.delete_dialog.title: "Delete this tag?"
- tags.delete_dialog.copy: "This will remove the tag from all items."
- tags.delete_dialog.cancel: "Cancel"
- tags.delete_dialog.confirm: "Delete"

---

## Auth
### Sign up (`/auth/signup`)
- auth.signup.title: "Start your collection"
- auth.signup.subtitle: "Your personal space for calm knowledge."
- auth.continue_google: "Continue with Google"
- auth.continue_github: "Continue with GitHub"
- auth.or_email: "Or sign up with email"
- auth.email.label: "Email address"
- auth.email.placeholder: "name@example.com"
- auth.password.label: "Password"
- auth.password.placeholder: "At least 8 characters"
- auth.signup.action: "Create free account"
- auth.terms: "Terms of Service"
- auth.privacy: "Privacy Policy"
- auth.login_link: "Already a member? Log in"

### Sign in (`/auth/login`)
- auth.login.title: "Welcome back"
- auth.login.subtitle: "Capture your thoughts, organized and safe."
- auth.or_email_login: "OR WITH EMAIL"
- auth.forgot_password: "Forgot password?"
- auth.login.action: "Sign In"
- auth.signup_link: "Don't have an account? Create an account"
- auth.contact_support: "Contact Support"

### Auth Errors
- auth.error.invalid_credentials: "Invalid email or password."
- auth.error.oauth_failed: "Authentication failed. Please try again."
- auth.error.generic: "Couldn’t sign you in. Please try again."