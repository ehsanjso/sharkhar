# Component Design Checklist

Use this checklist before finalizing any frontend component.

## 🎨 Visual Design

### Typography
- [ ] Font choice is distinctive (NOT Inter, Roboto, Arial, system fonts)
- [ ] Font pairing works (display + body)
- [ ] Line heights and letter spacing feel right
- [ ] Heading hierarchy is clear

### Color
- [ ] Palette has clear primary/accent relationship
- [ ] Contrast ratios pass WCAG AA
- [ ] Theme uses CSS variables
- [ ] NO purple gradients on white (cliché alert)

### Layout
- [ ] Something unexpected (asymmetry, overlap, diagonal flow?)
- [ ] Whitespace is intentional, not default
- [ ] Grid system is consistent OR purposefully broken
- [ ] Mobile breakpoints considered

### Texture & Depth
- [ ] Background has atmosphere (not just solid color)
- [ ] Shadows feel custom (not default box-shadow)
- [ ] Subtle details reward close inspection

---

## ✨ Motion & Interaction

- [ ] Page load has orchestrated reveal (staggered animations)
- [ ] Hover states surprise and delight
- [ ] Transitions have appropriate easing curves
- [ ] Animation serves purpose (not just decoration)
- [ ] CSS-only where possible (or Motion library for React)

---

## 🔧 Production Quality

- [ ] Code is clean and organized
- [ ] Component is self-contained
- [ ] Responsive at all breakpoints
- [ ] Performance: no layout shifts, fast paint
- [ ] Accessibility: keyboard nav, screen reader friendly

---

## 🎯 Differentiation Test

Ask yourself:
1. Would someone remember this component tomorrow?
2. What ONE thing makes it unforgettable?
3. Does it feel designed FOR this context, or generic?

If answers are weak, go bolder.

---

## Quick Fixes for Generic Designs

| Problem | Fix |
|---------|-----|
| Looks like every other AI output | Pick extreme aesthetic direction |
| Typography feels boring | Swap to unexpected display font |
| Layout too predictable | Break the grid somewhere |
| Colors too safe | Double down on accent, reduce variety |
| Lacks texture | Add noise, gradient mesh, or depth |
