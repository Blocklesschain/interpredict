# InterPredict V2 — Internationalization

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Principle

All user-visible strings are centralized in locale files. **No hard-coded English** scattered across components. When the language changes, the entire interface changes consistently.

---

## 2. Locales

Initially preserved from legacy: `en`, `zh`, `es`, `fr`.

Architecture is extensible for additional languages (e.g. Vietnamese).

---

## 3. File Structure

```
i18n/
  en.json
  zh.json
  es.json
  fr.json
  index.ts        # locale loader, fallback, type definitions
```

---

## 4. Fallback Behavior

Deterministic fallback chain:

```
requested locale → en (base) → key (raw)
```

If a key is missing in the requested locale, fall back to `en`; if missing in `en`, return the key itself (never crash).

---

## 5. Persistence

- Preference stored in `localStorage` (`interpredict_lang`).
- Restored on app load.
- Language switch updates the entire UI immediately.

---

## 6. Type Safety

Locale keys are typed (a `LocaleKey` union derived from the `en` locale), so missing translations are caught at compile time.

---

## 7. Number / Date Formatting

- Use `Intl.NumberFormat` / `Intl.DateTimeFormat` with the active locale.
- Timestamps displayed in local time + UTC equivalent (see UI_UX_SPEC §7).

---

## 8. Beta Defect Addressed

Legacy had mixed-language UI due to hard-coded English strings outside the `t()` helper. V2 enforces centralization via typed locale files and a lint rule that flags raw string literals in JSX.