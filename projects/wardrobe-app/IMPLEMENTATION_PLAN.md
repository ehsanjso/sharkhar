# Wardrobe App - Implementation Plan

*Project Start: February 2026*

---

## 🎯 Recommended Feature Priority

Based on research, here's the **impact vs effort matrix**:

| Feature | User Value | Market Gap | Effort | Priority |
|---------|------------|------------|--------|----------|
| Digital Closet (core) | ⭐⭐⭐⭐⭐ | Low (table stakes) | Medium | **P0** |
| AI Stylist | ⭐⭐⭐⭐⭐ | Medium | High | **P1** |
| Storage Location | ⭐⭐⭐⭐ | **HIGH** (unique!) | Low | **P1** |
| Visual Pinpointing | ⭐⭐⭐⭐ | **HIGH** (unique!) | High | **P2** |
| Price/Affiliate | ⭐⭐⭐ | Medium | Medium | **P2** |

**Recommended Order:** Build the unique stuff (storage tracking) early - it's low effort and differentiates you immediately.

---

## 📱 App Name Suggestions

- **Closetly** - Simple, memorable
- **WardrobeAI** - Clear value prop
- **Outfit.ai** - Modern, AI-forward
- **Stashd** - Trendy, implies organization
- **MyCloset** - Straightforward

*(Pick one or brainstorm more)*

---

## 🏗️ Technical Stack (Recommended)

```
Frontend:     React Native (Expo) - iOS + Android from one codebase
Backend:      Supabase (PostgreSQL + Auth + Storage + Realtime)
AI/LLM:       Claude API (outfit recommendations, chat)
Image AI:     Google Cloud Vision (auto-tagging clothes)
Weather:      OpenWeatherMap API (free tier)
Affiliate:    ShopStyle Collective API (future)
```

**Why this stack:**
- Expo = fastest path to App Store
- Supabase = backend in a box, generous free tier
- Claude = best for natural conversation, you know it well
- No need to manage servers initially

---

## 🚀 Phase 1: MVP Digital Closet (3-4 weeks)

### Goal
User can photograph clothes, auto-tag them, and browse their wardrobe.

### Features
- [ ] **1.1 Auth & Onboarding**
  - Sign up / Sign in (Supabase Auth)
  - Basic profile (name, style quiz later)
  
- [ ] **1.2 Add Item Flow**
  - Camera / Photo library picker
  - Auto background removal (remove.bg API or local)
  - Auto-tagging via Vision API:
    - Category (shirt, pants, jacket, etc.)
    - Color (primary, secondary)
    - Pattern (solid, striped, floral)
    - Season (summer, winter, all-season)
  - Manual edit/override tags
  
- [ ] **1.3 Wardrobe Grid View**
  - Gallery of all items
  - Filter by: category, color, season
  - Search
  
- [ ] **1.4 Item Detail View**
  - Full image
  - All tags/attributes
  - Edit capability
  - Delete (with confirmation)

- [ ] **1.5 Storage Location (Unique Feature!)**
  - When adding item: "Where do you keep this?"
  - Predefined zones: Closet hanging, Drawer 1-5, Shelf, Box, etc.
  - Custom zones allowed
  - "Where's my [item]?" search returns location

### Database Schema (Phase 1)

```sql
-- Users
users (
  id uuid primary key,
  email text,
  name text,
  created_at timestamp
)

-- Wardrobe Items
items (
  id uuid primary key,
  user_id uuid references users,
  image_url text,
  thumbnail_url text,
  
  -- Auto-tagged
  category text,        -- shirt, pants, jacket, dress, etc.
  color_primary text,
  color_secondary text,
  pattern text,         -- solid, striped, plaid, floral
  season text[],        -- ['summer', 'spring']
  formality text,       -- casual, smart-casual, formal
  
  -- User-edited
  name text,            -- "My favorite blue shirt"
  brand text,
  
  -- Storage (unique feature!)
  storage_zone text,    -- "closet_hanging", "drawer_3"
  storage_notes text,   -- "Left side, behind jackets"
  
  -- Metadata
  times_worn int default 0,
  last_worn_at timestamp,
  created_at timestamp
)

-- Storage Zones (user-defined)
storage_zones (
  id uuid primary key,
  user_id uuid references users,
  name text,            -- "Drawer 3"
  location text,        -- "Bedroom dresser"
  icon text             -- emoji
)
```

### Deliverable
Working app where user can:
1. Take photo of shirt
2. See it auto-tagged as "Blue, Cotton, Casual, Summer"
3. Assign to "Drawer 2"
4. Find it later by searching or filtering

---

## 🤖 Phase 2: AI Stylist (3-4 weeks)

### Goal
User asks "What should I wear to X?" and gets outfit from THEIR closet.

### Features
- [ ] **2.1 Chat Interface**
  - Simple chat UI (message bubbles)
  - Text input + send button
  - Conversation history (session-based)

- [ ] **2.2 Context Gathering**
  - Weather API integration (auto-detect location)
  - Manual occasion input: "job interview", "date night", "casual friday"
  - Time of day awareness

- [ ] **2.3 Outfit Recommendation Engine**
  - Query user's wardrobe
  - Send to Claude with context:
    ```
    User's wardrobe: [list of items with attributes]
    Weather: 45°F, cloudy
    Occasion: Job interview at tech startup
    
    Recommend 2-3 complete outfits using ONLY items from their wardrobe.
    Explain why each works.
    ```
  - Return outfit cards with images

- [ ] **2.4 Outfit Display**
  - Show recommended items as a "look"
  - Side-by-side or stacked view
  - "Wear this" button → marks items as worn today
  - "Try another" → regenerate

- [ ] **2.5 Feedback Loop**
  - 👍👎 on recommendations
  - "I wore this" confirmation
  - Learns preferences over time

### Prompt Engineering

```markdown
You are a personal stylist with access to the user's complete wardrobe.

USER PROFILE:
- Style preference: [casual/smart-casual/formal]
- Body type: [if provided]
- Color preferences: [if any]

WARDROBE ITEMS:
[JSON array of items with: id, name, category, color, pattern, formality, image_url]

CONTEXT:
- Weather: {weather}
- Occasion: {occasion}
- Time: {time_of_day}

TASK:
Suggest 2-3 complete outfits using ONLY items from the wardrobe above.
For each outfit:
1. List the specific items (reference by name/id)
2. Explain why this combination works for the occasion
3. Note any accessories that would complete the look (even if not in wardrobe)

Be conversational and encouraging. If the wardrobe is limited, be creative.
```

### Deliverable
User opens app, asks "What should I wear to brunch?", gets:
> "For a relaxed brunch vibe, try your **cream linen shirt** with **dark blue jeans**. 
> The weather's nice (65°F) so you won't need a jacket. Your **white sneakers** 
> keep it casual but put-together. Want something dressier?"

---

## 📍 Phase 3: Visual Closet & Pinpointing (3-4 weeks)

### Goal
User photographs their actual closet, app highlights where items are.

### Features
- [ ] **3.1 Closet Photo Setup**
  - "Map your closet" onboarding
  - Take photos of each storage area
  - Label: "Bedroom closet - left side"

- [ ] **3.2 Item Position Marking**
  - When viewing closet photo, tap to mark item positions
  - Drag handles to adjust bounding box
  - Link to item in database

- [ ] **3.3 Visual Pinpointing**
  - When AI recommends outfit:
    - Show closet photo
    - Overlay colored circles/arrows on each item
    - "Your navy blazer is HERE" with visual indicator
  - Tap circle → shows item detail

- [ ] **3.4 Quick Find**
  - "Where's my [item]?" voice/text search
  - Shows: zone name + closet photo with highlight
  - "Third from the left, hanging section"

### Technical Approach
```javascript
// Item position stored as percentage (responsive to different screens)
item_positions (
  item_id uuid,
  closet_photo_id uuid,
  x_percent float,      // 0.35 = 35% from left
  y_percent float,      // 0.60 = 60% from top
  width_percent float,
  height_percent float
)
```

### Deliverable
User says "Where's my blue sweater?", app shows:
- Photo of their actual closet
- Red circle around the blue sweater
- Label: "Drawer 3, left side"

---

## 💰 Phase 4: Price & Affiliate (2-3 weeks)

### Goal
Show current prices for similar items, monetize via affiliate.

### Features
- [ ] **4.1 Similar Item Search**
  - "Find similar" button on item detail
  - Uses Google Vision / custom model to find matches
  - Returns: retailer, price, link

- [ ] **4.2 Price Display**
  - "Your item" vs "Buy similar"
  - Price range: "$45 - $89"
  - Multiple retailer options

- [ ] **4.3 Affiliate Integration**
  - ShopStyle Collective for fashion affiliate
  - Track clicks/conversions
  - Cookie-based attribution

- [ ] **4.4 "Complete the Look" Suggestions**
  - When showing outfit, suggest:
    - "Add a brown belt? Here are options: [affiliate links]"
  - Non-intrusive, helpful

### Deliverable
User views their favorite t-shirt, sees:
> "Similar items available:"
> - Uniqlo Supima Tee - $19.90
> - Everlane Essential Tee - $30
> - COS Brushed Cotton Tee - $45

---

## 📅 Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| **Phase 1** | Weeks 1-4 | MVP: Digital closet + storage tracking |
| **Phase 2** | Weeks 5-8 | AI Stylist chat |
| **Phase 3** | Weeks 9-12 | Visual pinpointing |
| **Phase 4** | Weeks 13-15 | Price/affiliate |
| **Polish** | Weeks 16-18 | Beta testing, App Store prep |

**Target:** App Store ready in ~4.5 months

---

## 🚦 Let's Start: Phase 1 Tasks

### Week 1: Setup & Foundation

**Day 1-2: Project Setup**
- [ ] Create Expo project
- [ ] Setup Supabase project
- [ ] Configure auth (email + Apple/Google)
- [ ] Basic navigation structure

**Day 3-4: Database & Storage**
- [ ] Create database schema (items, zones)
- [ ] Setup Supabase Storage bucket for images
- [ ] Image upload helper functions

**Day 5-7: Camera & Upload**
- [ ] Camera component (expo-camera)
- [ ] Photo library picker
- [ ] Image compression
- [ ] Upload to Supabase Storage

### Week 2: Auto-Tagging

**Day 1-3: Vision API Integration**
- [ ] Google Cloud Vision setup
- [ ] Analyze image → get labels
- [ ] Map labels to our categories

**Day 4-5: Background Removal**
- [ ] Integrate remove.bg API (or rembg local)
- [ ] Clean product-style images

**Day 6-7: Add Item Flow**
- [ ] Complete "Add Item" screen
- [ ] Show auto-tags, allow edit
- [ ] Save to database

### Week 3: Browse & Search

**Day 1-3: Wardrobe Grid**
- [ ] Grid view of all items
- [ ] Pull to refresh
- [ ] Filter chips (category, color)

**Day 4-5: Item Detail**
- [ ] Full detail view
- [ ] Edit mode
- [ ] Delete with confirmation

**Day 6-7: Storage Zones**
- [ ] Zone management screen
- [ ] Assign items to zones
- [ ] "Where is [item]?" search

### Week 4: Polish & Test

- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Basic onboarding
- [ ] Test on real device
- [ ] Fix bugs

---

## 📁 Project Structure

```
wardrobe-app/
├── app/                    # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── wardrobe.tsx    # Main grid view
│   │   ├── outfits.tsx     # AI stylist (Phase 2)
│   │   └── profile.tsx
│   ├── item/
│   │   ├── [id].tsx        # Item detail
│   │   └── add.tsx         # Add new item
│   └── _layout.tsx
├── components/
│   ├── ItemCard.tsx
│   ├── FilterChips.tsx
│   ├── CameraCapture.tsx
│   └── StorageZonePicker.tsx
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── vision.ts           # Google Vision helpers
│   ├── storage.ts          # Image upload
│   └── claude.ts           # AI integration (Phase 2)
├── hooks/
│   ├── useWardrobe.ts
│   ├── useItem.ts
│   └── useAuth.ts
├── types/
│   └── index.ts
└── package.json
```

---

## ✅ Ready to Start?

**First task:** Create the Expo + Supabase project structure.

Want me to:
1. **Generate the initial codebase** (project setup, navigation, Supabase config)?
2. **Start with database schema** (create SQL for Supabase)?
3. **Build a specific component first** (camera, wardrobe grid)?

Let's go! 🚀
