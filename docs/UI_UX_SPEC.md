# InterPredict V2 — UI/UX Specification

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Design System Primitives

Reusable components in `components/ui/`:

```
Button, Input, Select, Card, Modal, Toast, Badge, Tabs, Tooltip,
Skeleton, EmptyState, ErrorState, TransactionStatus
```

Consistent tokens for: spacing, typography, radius, shadows, borders, hover, focus, disabled, loading, success, warning, error.

---

## 2. Button Design

Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.

Async states: `idle`, `loading`, `success`, `disabled`.

- Accessible touch targets (≥44px).
- Prevent accidental duplicate submissions (disable while loading).

---

## 3. Navigation

Primary destinations immediately discoverable:

```
Home, Marketplace, Market Proposals, My Activity, Create, DEC, History, Help
```

- Not buried in a dropdown.
- Home action available in responsive nav without breaking Back.
- Normal browser/router history semantics (Back returns to previous page, not forced Home).

---

## 4. Marketplace

- Responsive market cards.
- States: Active, Upcoming/proposed, Closed, Resolved.
- Filters (state, category).
- Data-driven categories (not hard-coded).
- Featured sections: responsive grids or horizontally scrollable; carousel only where genuinely useful and accessible (keyboard, touch, reduced motion).

---

## 5. Market Detail Page

Present clearly:
- question, description, category, status, outcomes, creator, timestamps, resolution criteria, activity, appropriate actions.

Resolution criteria visible **before** participation.

---

## 6. Market Creation UX

Guided form:
- clear fields, validation, category selection, outcome configuration (2–4), thumbnail preview, resolution criteria, timezone explanation, final review screen.

Confirmation dialog summarizing what will be submitted.

---

## 7. Time Display

- Internally canonical timestamp (unix seconds).
- UI shows **local time + UTC equivalent** before submission.
- Consistent storage/comparison; DST/timezone edge cases tested.

---

## 8. Dynamic Action Engine

Centralized action availability:

```
getAvailableActions(marketState, userContext)
  → [{ visible, enabled, label, reasonDisabled }]
```

No duplicated state logic across components.

---

## 9. Loading UX

- Skeletons, local spinners, transaction pending states, sync indicators.
- No full-page blocking loaders for small operations.

---

## 10. Empty / Error States (distinct)

1. No records exist.
2. Data failed to load.
3. Indexer temporarily behind.
4. Wallet has no activity.

These are NOT the same state — each has a distinct component.

---

## 11. Error Normalization

Users never see raw errors (`SERVER_ERROR`, `CALL_EXCEPTION`, `eth_sendTransaction`). Central normalization maps to friendly codes and messages. Transient errors clear on navigation, retry, new transaction, timeout, or teardown.

---

## 12. Wallet UX

Handle: connection, disconnection, account switching, network switching, rejection, pending, confirmed, reverted. Wallet cancellation is not a protocol failure.

---

## 13. Mobile Session Restoration

Preserve navigation/session state across wallet app switch, phone lock, minimization, tab suspension. Revalidate stale data on return. Never persist wallet secrets.

---

## 14. Thumbnails

Media spec: recommended aspect ratio, max upload size, supported MIME types, fallback image. Use `object-fit` + `aspect-ratio`; never stretch.

---

## 15. Themes

Dark, light, system. Persist preference. Avoid flash of incorrect theme. Test contrast in both.

---

## 16. Accessibility

Semantic HTML, labels, focus states, keyboard navigation, ARIA only where necessary, sufficient contrast, accessible dialogs, reduced-motion support.

---

## 17. Responsive Breakpoints

Verify at: 320px, 375px, 390px, 430px, 768px, 1024px, 1440px+.

Check overflow, navigation, cards, dialogs, forms, wallet controls, buttons, thumbnails, localization.