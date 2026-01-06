# UI Uploads Specification V1

> Design specification for file upload UI in LiteVault Web
> Status: DRAFT - Pending implementation

---

## 1. Overview

This document specifies the UI components and user flows for file/image uploads in LiteVault.

### V1 Scope
- Upload files and images via paperclip button
- Show upload progress and attachment previews
- **NO AI enrichment from uploads** (button hidden/disabled)
- Attachments belong to items but don't affect AI processing

---

## 2. UI Locations

### 2.1 Home Page - Capture Area

**Location:** Below the main text input area

**Component:** `AttachButton`

```
┌─────────────────────────────────────────────────────────────┐
│  Capture your thought...                                     │
│                                                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────────│
│  │                                                          │
│  │                                                          │
│  └──────────────────────────────────────────────────────────│
│                                                              │
│  📎 Attach    [AI suggestions: ON]              [Save]       │
│                                                              │
│  ┌────────────┐ ┌────────────┐                              │
│  │ image.jpg  │ │ doc.pdf    │  ← Attachment previews       │
│  │ ⠿ (thumb)  │ │ 📄 1.2 MB  │                              │
│  │     ✕      │ │     ✕      │                              │
│  └────────────┘ └────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking 📎 opens file picker (accept images + files)
- Multi-select allowed (up to 5 files per upload session)
- Attachments shown as preview chips below input
- When "Save" clicked:
  1. Create item with text (if any)
  2. Upload each attachment
  3. Associate attachments with created item
- If text is empty but attachments exist → require text (V1)

### 2.2 Library Item Detail Modal

**Location:** Within item detail view

**Component:** `AttachmentsList`

```
┌─────────────────────────────────────────────────────────────┐
│  My Knowledge Item                                    [✕]    │
├─────────────────────────────────────────────────────────────┤
│  Summary:                                                    │
│  This is the AI-generated summary of the content...          │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  Attachments (2)                                   [+ Add]   │
│  ┌─────────────┐ ┌─────────────┐                             │
│  │ 🖼 photo.jpg │ │ 📄 doc.pdf  │                             │
│  │   128 KB    │ │   1.2 MB    │                             │
│  │  [🔗] [🗑]  │ │  [🔗] [🗑]  │                             │
│  └─────────────┘ └─────────────┘                             │
│                                                              │
│  Tags: #productivity #notes                                  │
└─────────────────────────────────────────────────────────────┘
```

**Actions per attachment:**
- 🔗 Download (generates presigned GET URL)
- 🗑 Delete (soft delete with confirmation)
- Thumbnail click → full preview (images) or download (files)

### 2.3 Pending Review Modal (Insight Modal)

**Location:** When reviewing enriched item

**Behavior:**
- Show existing attachments (if any)
- Allow adding attachments before confirm
- **AI suggestions NOT affected by attachments** (V1 enforcement)

---

## 3. Component States

### 3.1 Upload Progress

**States:**

| State | UI |
|-------|-----|
| Selecting | File picker open |
| Preparing | Spinner, "Preparing upload..." |
| Uploading | Progress bar with percentage |
| Completing | Spinner, "Finalizing..." |
| Success | ✓ Checkmark, add to preview list |
| Error | ❌ Error message with retry option |

**Progress Indicator:**
```
┌─────────────────────────────────────────┐
│ photo.jpg                               │
│ ████████████░░░░░░░░░░░░░░░░░  45%      │
│                             [Cancel]    │
└─────────────────────────────────────────┘
```

### 3.2 Error States

| Error | Message | Action |
|-------|---------|--------|
| File too large | "File exceeds 10 MB limit" | Dismiss |
| Invalid type | "File type not supported" | Dismiss |
| Network error | "Upload failed. Check connection." | Retry |
| URL expired | "Upload timed out. Please try again." | Retry (re-initiate) |
| Auth error | "Please sign in to upload" | Redirect to login |

### 3.3 Empty State

**When item has no attachments:**
```
┌─────────────────────────────────────────┐
│  Attachments                   [+ Add]  │
│                                         │
│  📎 No attachments yet                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. Frontend Enforcement (V1)

### 4.1 Hidden/Disabled Elements

> AI enrichment for attachments is NOT available in V1.

**Hidden elements:**
- "Enrich from attachment" button
- "Extract text from image" option
- Any AI-related actions on attachments

**Implementation:**
```typescript
// Feature flag check
const ENABLE_ATTACHMENT_ENRICHMENT = false;

// In component
{ENABLE_ATTACHMENT_ENRICHMENT && (
  <Button onClick={handleEnrichFromAttachment}>
    Extract with AI
  </Button>
)}
```

### 4.2 AI Toggle Behavior

- AI toggle affects **text enrichment only**
- Attachments upload and save regardless of AI toggle state
- No hidden AI processing of attachments

---

## 5. Allowed File Types

### Images
| Extension | MIME Type | Max Size |
|-----------|-----------|----------|
| .jpg, .jpeg | image/jpeg | 10 MB |
| .png | image/png | 10 MB |
| .gif | image/gif | 10 MB |
| .webp | image/webp | 10 MB |

### Files
| Extension | MIME Type | Max Size |
|-----------|-----------|----------|
| .pdf | application/pdf | 10 MB |
| .txt | text/plain | 10 MB |
| .md | text/markdown | 10 MB |

**File picker accept attribute:**
```html
<input 
  type="file" 
  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown"
  multiple
/>
```

---

## 6. Thumbnail Generation

### V1: Client-Side Only

For images, generate thumbnails in browser:
```typescript
// Use canvas to resize
const thumbnail = await generateThumbnail(file, {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.8
});
```

**For files (non-images):**
- Show file type icon (📄 for PDF, 📝 for text)
- Display file size

### V2: Server-Side (Future)
- Generate thumbnails on upload completion
- Store thumbnail as separate object
- Return thumbnail URL in attachment response

---

## 7. Microcopy Keys

Add to `docs/design/MICROCOPY.md`:

```markdown
## Uploads (V1)

### Attach Button
- upload.attach_button: "Attach"
- upload.attach_tooltip: "Attach files or images"

### Progress
- upload.progress.preparing: "Preparing upload..."
- upload.progress.uploading: "Uploading... {percent}%"
- upload.progress.completing: "Finalizing..."
- upload.progress.success: "Uploaded successfully"
- upload.progress.cancel: "Cancel"

### Errors
- upload.error.too_large: "File exceeds {maxSize} limit"
- upload.error.invalid_type: "File type not supported"
- upload.error.network: "Upload failed. Check your connection."
- upload.error.expired: "Upload timed out. Please try again."
- upload.error.generic: "Something went wrong. Please try again."
- upload.error.max_files: "Maximum {max} files per upload"

### Attachments List
- attachments.title: "Attachments"
- attachments.empty: "No attachments yet"
- attachments.add: "Add"
- attachments.download: "Download"
- attachments.delete: "Delete"
- attachments.delete_confirm.title: "Delete attachment?"
- attachments.delete_confirm.copy: "This file will be permanently deleted."
- attachments.delete_confirm.cancel: "Cancel"
- attachments.delete_confirm.confirm: "Delete"

### Toasts
- toast.upload_success: "File uploaded"
- toast.upload_error: "Upload failed"
- toast.attachment_deleted: "Attachment deleted"
```

---

## 8. Accessibility

- File input has proper label
- Progress indicator has aria-valuenow/aria-valuemax
- Error messages are announced via aria-live
- Thumbnail images have alt text (filename)
- Keyboard navigation for attachment actions

---

## 9. Mobile Considerations

- Paperclip button touch target: 44x44px minimum
- Camera capture option for mobile devices
- Progress visible during upload (no background uploads in V1)
- Tap attachment to open action sheet (download, delete)

---

## 10. Related Documents

- [Uploads Architecture](../architecture/uploads_object_storage_v1.md)
- [API Contract](../architecture/api_upload_contract_v1.md)
- [Microcopy](./MICROCOPY.md)
