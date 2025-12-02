# Anonymous Chat Application - Design Guidelines

## Design Approach

**Hybrid Approach**: Drawing inspiration from modern messaging platforms (Discord, Telegram, WhatsApp) combined with Material Design principles for clean, functional UI. Focus on trust-building minimalism for the landing page and distraction-free efficiency in the chat interface.

## Core Design Elements

### Typography
- **Primary Font**: Inter or DM Sans (Google Fonts)
- **Display/Headings**: 2xl to 5xl, font-semibold to font-bold
- **Body Text**: base to lg, font-normal
- **UI Labels**: sm to base, font-medium
- **System Messages**: sm, font-medium with subtle styling

### Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, 12, 16, and 24
- Component padding: p-4 to p-8
- Section spacing: py-12 to py-24
- Container max-width: max-w-6xl for landing, max-w-4xl for chat
- Gap spacing: gap-4 to gap-8 for grids

### Component Architecture

#### Landing Page Components
1. **Hero Section (60-70vh)**
   - Centered vertical layout with generous spacing (py-24)
   - Headline (text-4xl md:text-6xl, font-bold)
   - Subheadline (text-lg md:text-xl, max-w-2xl)
   - Primary CTA button (large, rounded-xl, px-8 py-4)
   - Trust indicators below CTA (small text, flex row with icons)

2. **Features Section**
   - 3-column grid (grid-cols-1 md:grid-cols-3, gap-8)
   - Each feature: icon (w-12 h-12), title (text-xl), description (text-base)
   - Centered alignment, py-16

3. **How It Works Section**
   - 3-step process with numbered badges
   - Horizontal flow on desktop, vertical stack on mobile
   - Connected with subtle dividers or arrows

4. **Footer**
   - Minimal: copyright, privacy policy link, admin login link (text-sm)
   - py-8, centered

#### Chat Interface Components
1. **Header Bar**
   - Fixed top bar (h-16, px-4, flex justify-between items-center)
   - Left: "Anonymous Chat" logo/text
   - Center: Connection status badge (rounded-full, px-4 py-1.5)
   - Right: Disconnect button (rounded-lg, px-4 py-2)

2. **Messages Container**
   - Full height minus header and input (flex-1, overflow-y-auto)
   - Messages: max-w-md for sent, max-w-md for received
   - Sent messages: ml-auto, rounded-2xl rounded-tr-sm
   - Received messages: mr-auto, rounded-2xl rounded-tl-sm
   - Message padding: px-4 py-2.5
   - Timestamp: text-xs below message
   - System messages: centered, text-sm, px-4 py-2, rounded-full, mx-auto

3. **Input Area**
   - Fixed bottom bar (h-20, px-4, flex gap-2)
   - Textarea: flex-1, rounded-xl, px-4 py-3, resize-none
   - Send button: rounded-xl, w-12 h-12, icon-only
   - Typing indicator: text-sm, absolute above input

#### Admin Dashboard Components
1. **Sidebar Navigation**
   - Fixed left sidebar (w-64, h-screen)
   - Navigation items: py-3 px-4, rounded-lg
   - Icons: w-5 h-5, inline with text

2. **Main Content Area**
   - ml-64 (offset for sidebar)
   - Header: sticky top-0, h-16, flex items-center justify-between
   - Content cards: rounded-xl, p-6, shadow-sm

3. **Active Chats Grid**
   - Grid layout: grid-cols-1 lg:grid-cols-2, gap-4
   - Each chat card: rounded-lg, p-4, border
   - User info row, message preview, timestamp

4. **Ban Management Table**
   - Full-width table with rounded corners
   - Header row: sticky, text-sm, font-semibold
   - Data rows: hover states, text-sm
   - Action buttons: small, rounded-md

### Interaction Patterns

**Buttons**:
- Primary CTA: Large (px-8 py-4), rounded-xl, font-semibold
- Secondary: Medium (px-6 py-2.5), rounded-lg, font-medium
- Icon buttons: Square (w-10 h-10), rounded-lg, centered icon

**Forms**:
- Input fields: rounded-lg, px-4 py-3, border focus states
- Labels: text-sm, font-medium, mb-2

**Cards**:
- Rounded-xl, shadow-sm on hover, border subtle
- Padding: p-6 for large cards, p-4 for compact

**Status Indicators**:
- Badges: rounded-full, px-3 py-1, text-xs font-medium
- Online/Active: pulsing animation on dot

### Animations
**Minimal Approach**:
- Fade-in for messages (opacity transition)
- Hover scale on buttons (scale-105, transition-transform)
- Slide-up for system messages
- NO complex scroll animations or parallax

### Responsive Breakpoints
- Mobile: base styles, single column, full-width
- Tablet (md): 768px, 2-column grids, adjusted padding
- Desktop (lg): 1024px, 3-column grids, sidebar layouts

## Images

**Landing Page Hero Background**:
- Abstract gradient mesh or geometric pattern overlay
- Low opacity, non-distracting
- Supports centered content without competing for attention

**Feature Section Icons**:
- Use Heroicons (outline style) from CDN
- Icons: LockClosedIcon, BoltIcon, UserGroupIcon

**No photography or literal images** - focus on clean iconography and geometric visuals to maintain anonymity theme.

## Accessibility
- Consistent focus states: ring-2 ring-offset-2 on all interactive elements
- ARIA labels for icon-only buttons
- Sufficient contrast ratios throughout
- Keyboard navigation support for all features