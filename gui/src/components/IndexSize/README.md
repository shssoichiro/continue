# IndexSize Components

A collection of React components for displaying index storage metrics in a clean, unobtrusive way.

## Components

### IndexSizeDisplay

Main component for displaying size and count information.

```tsx
import { IndexSizeDisplay } from "./IndexSizeDisplay";
import type { SizeInfo } from "./SizeFormatter";

const sizeInfo: SizeInfo = { size: 1048576, count: 42 };

<IndexSizeDisplay sizeInfo={sizeInfo} type="files" isLoading={false} />;
// Renders: "1.0 MB, 42 files"
```

### Specialized Components

```tsx
import { DocsIndexSizeDisplay, CodebaseIndexSizeDisplay } from "./IndexSizeDisplay";

// For docs (shows "pages")
<DocsIndexSizeDisplay sizeInfo={sizeInfo} />

// For codebase (shows "files")
<CodebaseIndexSizeDisplay sizeInfo={sizeInfo} />
```

### Loading States

```tsx
// Shows skeleton loader
<IndexSizeDisplay type="files" isLoading={true} />

// Compact skeleton
<IndexSizeDisplay type="files" isLoading={true} compact={true} />
```

### Formatting Utilities

```tsx
import {
  formatSize,
  formatSizeAndCount,
  safeFormatSizeAndCount,
} from "./SizeFormatter";

formatSize(1048576); // "1.0 MB"
formatSizeAndCount({ size: 1024, count: 5 }, "files"); // "1.0 KB, 5 files"
safeFormatSizeAndCount(undefined, "files"); // "Size unavailable"
```

## Styling

Components use Continue's theme system with:

- `description-muted` color for subtle appearance
- 10px font size for compactness
- Non-selectable text
- Proper spacing with `mt-1` margin

## Accessibility

- `role="status"` for screen readers
- Descriptive `aria-label` attributes
- Loading state indicators
- Keyboard navigation support
