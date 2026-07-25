<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## UI Conventions

### Forms inside Drawers (SheetContent)

#### Layout: one field per line

Every form field inside a `SheetContent` must span the full width of its column. By default that means one field per line: never use `grid grid-cols-2` or any multi-column layout. Each label+input pair gets its own `<div className="flex flex-col gap-1">` row.

**Why**: the drawer width is already constrained (~sm:max-w-sm). Two columns make inputs too narrow and hurt usability on smaller screens.

**Exception — wide drawers with many fields**: if a form has enough fields that a single column makes the drawer unreasonably tall, the drawer's `SheetContent` may be explicitly widened (e.g. `className="sm:max-w-2xl"`, roughly double the default) and split into two columns with a `Separator` (`orientation="vertical"`, from `@/components/ui/separator`) between them — never a bare CSS border/`divide-x`, since the shared `Separator` component already exists for this. Each column is still a single-field-per-line `flex flex-col` list internally; only the outer wrapper becomes a two-column flex row. Group fields into columns by logical relatedness (e.g. core identity fields vs. secondary/optional sections), not an arbitrary alternating split. See `app/dashboard/patients/_components/PatientSheet/PatientSheet.tsx` for the reference implementation.

#### Radix portal bug: Select / Popover / Calendar inside a Sheet

Radix UI's `DismissableLayer` propagates "outside click" events up through its layer stack. When a Radix `Select`, `Popover`, or `Calendar` is open inside a `Sheet` and the user clicks elsewhere in the drawer to dismiss the portal, Radix incorrectly fires `onPointerDownOutside` on the Sheet layer too — closing the drawer unintentionally.

**This is already fixed at the `SheetContent` component level** (`components/ui/sheet.tsx`). The fix intercepts `onPointerDownOutside`, checks the real click target via `e.detail.originalEvent.target`, and only closes the Sheet if the click was genuinely outside the drawer.

**You do NOT need to add any special handler in individual Sheet usages.** The fix is global.

**However**, keep this in mind when:

- Using any Radix portal-based component (`Select`, `Popover`, `Combobox`, `DropdownMenu`, `Tooltip`) inside a `SheetContent`
- Using `Dialog` inside a `Dialog` or `Sheet` inside a `Dialog` — the same layering issue can reappear and would need a similar `onPointerDownOutside` guard on the inner content
- Upgrading `radix-ui` — verify the fix still works after major version bumps since the DismissableLayer internals may change
