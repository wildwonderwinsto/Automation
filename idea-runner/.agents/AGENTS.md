# UX Interaction Standards

Every interactive element in this project must follow these standards.

## Interaction Feel
- All buttons: `transition: all 0.15s cubic-bezier(0.22, 1, 0.36, 1)` — snappy, not floaty.
- Press state: `scale(0.97)` on `:active` — physical click feedback.
- Primary buttons: `hover:shadow-md` — slight lift on hover.
- Secondary/ghost buttons: `hover:border-muted` — border darkens on hover.

## UI Feel
- Cards use `card-interactive` class: `translateY(-1px)` + subtle shadow on hover.
- Focus rings use `/30` opacity (e.g. `ring-accent/30`) — never full-opacity rings.
- State transitions (idle → loading → ready) animate with `animate-fade-slide-up`.

## Microinteractions
- Loading states use `animate-shimmer` skeleton bars, not just text.
- New content appearing uses `animate-fade-slide-up` (0.35s ease-out).
- Success indicators use `animate-pop-in` + `animate-check-pulse`.
- Note cards use `note-card` class for entrance animation.
- Delete buttons start at `opacity: 0.5`, reveal on parent hover.

## Interaction Quality
- Disabled states: `opacity-50 cursor-not-allowed`, no hover effects.
- All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` — the project easing curve.
- Hover effects must not shift layout (use transform, shadow, opacity only).

## Haptics (Visual Feedback)
- Button press: `scale(0.97)` — feels like a physical click.
- Delete icon hover: `scale(1.2)`, active: `scale(0.9)` — rubber-band feel.
- Approve badge: pops in with overshoot (`scale(1.02)` → `scale(1)`).
- Stage rail pills: `translateY(-1px)` on hover — subtle float.
