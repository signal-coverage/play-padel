# Modern Top-Down Padel Court SVG Design Prompt

## Objective

Design a modern, minimalist top-down padel court SVG to be used as a dashboard component inside a player profile. This is **not** intended to be a realistic court illustration, but rather a clean UI element that communicates the player's preferred playing side.

## Layout

- Display the padel court in a **top-down view**.
- Use a **2:1 aspect ratio** (approximately `400×200` viewBox).
- Include:
  - Outer court boundary with rounded corners.
  - Service boxes.
  - Center service line.
  - Net across the middle.
  - Clean white court markings.
- Keep the illustration simple and geometric, without unnecessary details.

## Visual Style

- Modern SaaS dashboard aesthetic inspired by **Linear**, **Stripe**, and **Vercel**.
- Rounded corners throughout.
- Dark court surface (`#1E293B` or similar).
- Slightly darker page/background.
- Thin white court lines with ~70% opacity.
- Soft shadows and subtle gradients.
- Premium, minimal appearance.

## Preferred Side Highlight

The player is **always positioned on the bottom side of the court**.

Highlight **only one** of the two bottom service boxes:

- **Bottom-left** = Backhand
- **Bottom-right** = Forehand

The highlighted area should:

- Use the application's primary accent color.
- Be filled with a semi-transparent overlay (15–25% opacity).
- Include a soft glow or subtle gradient.
- Avoid harsh solid colors.

## Player Indicator

Place a small circular player marker inside the highlighted section.

The marker should:

- Match the application's accent color.
- Have a subtle shadow.
- Be centered within the highlighted service box.
- Feel like a premium dashboard indicator rather than a sports icon.

## Labels

Add subtle labels beneath the bottom half:

- **BH** on the left.
- **FH** on the right.

Use small, muted typography that doesn't distract from the illustration.

## Responsiveness

- Build the SVG so every element scales proportionally.
- Use a `viewBox` and relative positioning.
- Avoid fixed pixel dimensions.

## Interactivity

Structure the SVG so the highlighted side can be toggled programmatically by changing a single class or prop (`forehand` / `backhand`), without modifying the SVG structure.

## Goal

The final component should feel like a polished analytics widget rather than a sports diagram—clean, modern, and immediately understandable within a professional player profile dashboard.
