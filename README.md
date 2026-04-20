# 🍛 Dilli Darbar — Indian Restaurant Chatbot

A **full-stack AI restaurant chatbot** themed for authentic Indian cuisine.
Built with **pure Node.js** — zero npm dependencies required.

---

## 🚀 Quick Start

### Requirements
- **Node.js 22+** (uses built-in `node:sqlite`)

### Run
```bash
./start.sh
```
or:
```bash
cd backend
node server.js         # Node 22.5+
# OR
node --experimental-sqlite server.js   # Node 22.0–22.4
```

Open **http://localhost:3001** — that's it!

---

## 🗣️ Chatbot Capabilities

| Intent | Example Messages |
|--------|-----------------|
| **Greet** | "Namaste", "Hello", "Sat Sri Akal" |
| **Full Menu** | "Poora menu dikhao", "What do you have?" |
| **By Category** | "Biryani dikhao", "Tandoor specials", "Lassi menu" |
| **Veg/Vegan** | "Pure veg options", "Vegan dishes dikhao" |
| **Gluten Free** | "Gluten free options" |
| **Spice Filter** | "Mild dishes", "Extra teekha spicy" |
| **Chef's Special** | "Chef ki special dishes", "Best popular" |
| **Reservation** | "Table book karna hai", "Reservation chahiye" |
| **Cart/Order** | "Mera order dikhao", "Confirm karo" |
| **Price** | "Budget mein kya milega", "Price range" |
| **Hours** | "Timings kya hain", "When do you open?" |
| **Location** | "Restaurant kahan hai", "Address batao" |
| **Hindi/English** | Bilingual — works in both languages |

---

## 🍽️ Menu (55+ Dishes)

| Category | Dishes | Price Range |
|----------|--------|-------------|
| Starters & Chaat | 7 dishes | ₹80–₹200 |
| Soups & Shorba | 4 dishes | ₹80–₹110 |
| Breads & Rice | 7 dishes | ₹40–₹80 |
| Dal & Sabzi | 7 dishes | ₹150–₹240 |
| Tandoor Specials | 6 dishes | ₹280–₹420 |
| Non-Veg Curries | 6 dishes | ₹340–₹440 |
| Biryanis & Pulao | 5 dishes | ₹220–₹480 |
| Sweets & Desserts | 6 dishes | ₹80–₹140 |
| Beverages & Lassi | 7 dishes | ₹40–₹100 |

All prices in **Indian Rupees (₹)**. GST 5% added on checkout.

---

## 🏗️ Architecture

```
dilli-darbar/
├── start.sh                 ← Run this!
├── backend/
│   ├── server.js            ← Pure Node.js HTTP server (port 3001)
│   ├── chatbot.js           ← NLU engine (Hindi + English intents)
│   ├── database.js          ← SQLite schema + 55 Indian dishes seeded
│   └── restaurant.db        ← Auto-generated on first run
└── frontend/
    └── public/
        └── index.html       ← Responsive SPA — saffron & maroon theme
```

**Zero dependencies** — only Node.js built-ins:
`node:sqlite` · `node:http` · `node:fs` · `node:path` · `node:crypto`

---

## 🎨 UI Features

- **Saffron & maroon** Indian colour palette
- **Playfair Display** serif + Noto Sans body fonts
- **Hindi + Devanagari** text throughout
- **Responsive tri-column** layout (desktop)
- **Slide-in sidebar** drawer on mobile
- **Green/red veg/non-veg** dietary badges (Indian standard)
- **₹ INR pricing** with 5% GST calculation
- **Animated menu cards** with Add to Cart
- **Bilingual quick hints** in the input bar
- **Live order panel** with GST breakdown
- **Works on** desktop · tablet · mobile

---

## 🔌 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session` | Create/get session |
| POST | `/api/chat` | Send message → response |
| GET  | `/api/chat/:sid/history` | Chat history |
| GET  | `/api/menu` | Full menu |
| POST | `/api/order/add` | Add item to cart |
| GET  | `/api/order/:sid` | Get current order |
| POST | `/api/order/confirm` | Place order |
| GET  | `/api/admin/stats` | Usage stats |
| POST | `/api/feedback` | Submit rating |
