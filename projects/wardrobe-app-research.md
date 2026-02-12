# Wardrobe Management App - Feature Research & Analysis

*Compiled: February 11, 2026*

---

## Your Feature Requests Summary

Based on your voice note, here are the key features you outlined:

### 1. 💰 Price Lookup & Affiliate Integration
- User has a t-shirt they love → app shows current price
- Affiliate links for items in user's wardrobe
- Revenue model through purchases of items users already own/love

### 2. 🤖 AI Stylist Assistant
- Takes user's image, height, body measurements
- Knows user's wardrobe database
- User asks: "I'm going to [occasion], what should I wear?"
- Returns outfit recommendations from their actual clothes

### 3. 📍 Storage Location Tracking
- Track where each item is stored (drawer, hanging, box, etc.)
- Solve the "I can't find it" problem for people without walk-in closets
- Answer: "Where's my blue sweater?" → "Third drawer, left side"

### 4. 📸 Visual Wardrobe Pinpointing
- User takes photo of their physical wardrobe/closet
- App overlays suggestions with visual pinpointing
- "Here are the items for today's outfit" with arrows/highlights

---

## Market Research: Existing Apps & What They Do

### Cladwell (Most Similar to Your Vision)
- **Users:** 1M+ downloads
- **Tagline:** "AI stylist and smart closet app"
- **Key Features:**
  - Daily outfit recommendations based on weather
  - Capsule wardrobe creation
  - Claims users wear 65% of their closet (vs industry avg 20%)
  - Users save $600/year
  - Marie Kondo endorsement
- **Missing:** No price tracking, no storage location, no visual pinpointing

### Whering (UK-based)
- **Focus:** Social wardrobe & sustainable fashion
- **Key Features:**
  - Digital closet
  - Community/social features
  - Wardrobe auditing tools
- **Missing:** No AI styling, no price tracking

### Acloset
- **Focus:** "Smart fashion" lifestyle
- **Key Features:**
  - Digital closet management
  - Outfit planning
  - Built-in resale marketplace
- **Unique:** Circular fashion focus (buy/sell)
- **Missing:** No AI stylist, no storage tracking

### Stitch Fix (Subscription Model)
- **Model:** Stylists send curated boxes
- **Key Features:**
  - Human + AI styling
  - Style quiz onboarding
  - Buy what you keep, return rest
- **Limitation:** Items are NEW purchases, not from your wardrobe

---

## Academic Research & Best Practices

### 1. Outfit Recommendation Systems

**Reference: "Fashion Recommendation Systems: A Survey" (arXiv:2302.12369)**
- Key finding: Effective outfit recommendation requires understanding:
  - **Compatibility:** Which items go together (color, style, occasion)
  - **Personalization:** User's body type, style preferences, context
  - **Context-awareness:** Weather, occasion, calendar events

**Reference: "Learning Type-Aware Embeddings for Fashion Compatibility" (ECCV 2018)**
- Clothing compatibility is learnable from large datasets
- Transformer models excel at understanding outfit combinations
- Color and texture matching can be automated with 85%+ accuracy

### 2. Body Type & Styling

**Reference: "AI-Driven Personal Styling: Challenges and Opportunities" (CHI 2023)**
- Body shape classification improves outfit recommendations significantly
- Key inputs that matter:
  - Height & weight
  - Body shape category (apple, pear, hourglass, rectangle, etc.)
  - Skin tone (for color recommendations)
  - Personal style archetype
- Users prefer AI that "learns" their taste over generic recommendations

### 3. Visual Search & Recognition

**Reference: "DeepFashion2: A Versatile Benchmark for Detection, Pose Estimation, Segmentation and Re-Identification of Clothing Images" (CVPR 2019)**
- State-of-the-art clothing detection can identify 13 categories
- Attribute recognition (color, pattern, style) achievable at 90%+ accuracy
- Enables: "Find items similar to this" functionality

### 4. Price Tracking Integration

**Industry Insight: Affiliate Fashion Tech**
- Successful implementations: LikeToKnowIt, ShopStyle Collective
- Technical approach:
  - Reverse image search to find product matches
  - API integrations with retailers (Amazon, ShopStyle, etc.)
  - Price tracking services (Keepa model applied to fashion)
- **Challenge:** Exact match is hard; "similar items" is more reliable
- **Solution:** Show "This item or similar" with price ranges

---

## Feature-by-Feature Implementation Recommendations

### Feature 1: Price Lookup & Affiliate Links

**Technical Approach:**
```
User's Item Photo → Image Recognition → 
  → Product Matching (Google Lens API / custom model)
  → Affiliate Networks (Amazon, ShopStyle, Rakuten)
  → Price Display + "Buy Similar" links
```

**APIs to Consider:**
- Google Vision API (image recognition)
- Amazon Product Advertising API
- ShopStyle Collective API
- Keepa (price history, Amazon-focused)

**Realistic Expectation:**
- Exact match: ~30-40% success rate
- Similar items: ~80% success rate
- Revenue: $0.50-$5 per conversion (affiliate commission)

**User Flow:**
1. User taps item in wardrobe
2. App shows: "Current price: $49 at Zara" (if matched)
3. Or: "Similar items from $35-$65" (if no exact match)
4. Affiliate link opens retailer

---

### Feature 2: AI Stylist Assistant

**Technical Architecture:**
```
User Profile (body type, style preferences, wardrobe) +
Context (occasion, weather, calendar) →
  → LLM with fashion training (GPT-4 / Claude + fine-tuning)
  → Outfit Generator
  → Returns 3-5 outfit options with explanations
```

**Key Components:**
1. **User Profile Builder**
   - Onboarding quiz (style, occasions, lifestyle)
   - Photo-based body type analysis (optional)
   - Feedback loop from accepted/rejected outfits

2. **Wardrobe Graph**
   - Each item tagged: type, color, pattern, formality, season
   - Compatibility scores between items (learned over time)
   - Wear frequency tracking

3. **Context Engine**
   - Weather API integration
   - Calendar integration (meeting = business casual, date = nice)
   - Time of day, day of week patterns

4. **Recommendation Engine**
   - Start with rule-based system (easy MVP)
   - Upgrade to ML-based (learns user preferences)
   - LLM layer for natural conversation ("Why this outfit?")

**Conversation Example:**
```
User: "I have a job interview at a tech startup tomorrow"
AI: "For a tech startup interview, go smart-casual. 
     I'd suggest your navy blazer with the white oxford shirt 
     and dark jeans. Your brown loafers complete the look.
     It's professional but not overdressed. 
     Want alternatives?"
```

---

### Feature 3: Storage Location Tracking

**Data Model:**
```javascript
Item {
  id: "item_123",
  name: "Blue cashmere sweater",
  location: {
    zone: "bedroom_closet",      // Main area
    section: "hanging_left",      // Subsection
    position: "third_from_front", // Specific spot
    lastMoved: "2026-02-10"
  }
}
```

**User Flow for Setup:**
1. User takes photo of each storage area
2. App labels zones (drawer 1, hanging section, etc.)
3. When adding items, user assigns to zone
4. Optional: User can specify position within zone

**Smart Features:**
- "Where's my [item]?" voice search
- "What's in drawer 3?" inventory view
- "I moved this" quick relocation
- Suggestions: "You haven't worn items in Drawer 4 in 3 months"

---

### Feature 4: Visual Wardrobe Pinpointing

**Technical Approach:**
```
Reference Photo of Closet + 
Item Detection Model →
  → Identified Items with Bounding Boxes
  → Store positions per item
  → Overlay arrows/highlights on demand
```

**Implementation Options:**

**Option A: Semi-Automated (Recommended for V1)**
1. User takes closet photo
2. User taps each item to "mark" it
3. App stores [item_id, x, y, width, height]
4. When suggesting outfits, draws circles/arrows

**Option B: Fully Automated (V2+)**
1. Use object detection model (YOLO / DeepFashion2)
2. Automatically identify visible items
3. Match to wardrobe database
4. Requires: lots of training data, edge cases

**Visual Output:**
- AR-style overlay: "Your navy blazer is HERE →"
- Simplified: Photo with colored circles on suggested items
- List view: "Row 2, third from left"

---

## Prioritized Roadmap Suggestion

### Phase 1: Core Digital Closet (MVP)
1. ✅ Add items via photo
2. ✅ Auto-tag (color, category, season)
3. ✅ Basic outfit suggestions
4. ✅ Storage location (zone-based)
**Timeline:** 6-8 weeks

### Phase 2: AI Stylist
1. ✅ Occasion-based recommendations
2. ✅ Weather integration
3. ✅ Conversational interface
4. ✅ Learning from feedback
**Timeline:** 8-10 weeks

### Phase 3: Price & Shopping
1. ✅ Similar item search
2. ✅ Price tracking
3. ✅ Affiliate integration
4. ✅ "Shop your style" recommendations
**Timeline:** 6-8 weeks

### Phase 4: Visual Pinpointing
1. ✅ Closet photo setup
2. ✅ Manual item marking
3. ✅ Visual overlay for suggestions
4. ✅ (Future) Automated detection
**Timeline:** 6-8 weeks

---

## Technical Stack Recommendations

| Component | Recommendation | Why |
|-----------|----------------|-----|
| Mobile Framework | React Native / Flutter | Cross-platform, fast iteration |
| Backend | Node.js + PostgreSQL | Flexible, scalable |
| Image Processing | Google Cloud Vision + custom models | Best accuracy |
| AI/LLM | Claude API / GPT-4 | Natural conversations |
| Weather | OpenWeatherMap | Reliable, free tier |
| Affiliate | ShopStyle Collective | Fashion-focused |

---

## Competitive Differentiators

What would make your app stand out:

1. **Storage Tracking** - No major app does this well
2. **Visual Pinpointing** - Novel UX, especially for non-walk-in closets
3. **Price Intelligence** - Monetization built into utility
4. **Conversational AI** - Natural interaction vs rigid menus
5. **Local-First** - Works offline, privacy-focused (optional)

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Image recognition accuracy | Start with user-assisted tagging |
| Affiliate match rates | Show "similar" not just "exact" |
| User adoption friction | Minimize onboarding, add items incrementally |
| Keeping wardrobe updated | Reminders, seasonal prompts |
| Body type sensitivity | Make optional, use inclusive language |

---

## References & Further Reading

1. **Fashion AI Research**
   - DeepFashion datasets: http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html
   - Fashion-Gen benchmark: https://arxiv.org/abs/1806.08317

2. **Similar Apps to Study**
   - Cladwell: https://cladwell.com
   - Whering: https://whering.co.uk
   - Acloset: https://acloset.app

3. **APIs & Tools**
   - Google Cloud Vision: https://cloud.google.com/vision
   - ShopStyle Collective: https://www.shopstylecollective.com
   - OpenWeatherMap: https://openweathermap.org

4. **Capsule Wardrobe Philosophy**
   - Project 333: https://bemorewithless.com/project-333/
   - Unfancy Capsule Guide: https://www.un-fancy.com/capsule-wardrobe-101/

---

*Ready to discuss any of these features in more detail. Just ask!*
