const db = require('./database');

const intents = {
  greeting:    /\b(hi|hello|hey|namaste|namaskar|good (morning|evening|afternoon)|howdy|kem cho|sat sri akal)\b/i,
  menu:        /\b(menu|khana|khaana|food|eat|dish(es)?|meal|what do you (have|serve|offer)|show me|available|specials?|items?)\b/i,
  category:    /\b(starter|chaat|soup|shorba|bread|naan|roti|rice|dal|sabzi|curry|tandoor|biryani|pulao|dessert|sweet|mithai|beverage|drink|lassi|chai)\b/i,
  vegetarian:  /\b(vegetarian|veg\b|shudh veg|pure veg|vegan|plant.based|no meat|without meat|jain)\b/i,
  glutenFree:  /\b(gluten.?free|celiac|no gluten|without gluten)\b/i,
  spicy:       /\b(spicy|teekha|hot|mild|non.spicy|less spicy|medium)\b/i,
  reservation: /\b(reserv|book|table|booking|seat|jagah|make a (booking|reservation))\b/i,
  hours:       /\b(hours?|open|close|timings?|samay|kab|waqt|when|schedule)\b/i,
  location:    /\b(location|address|kahan|where|directions?|find you|jagah)\b/i,
  price:       /\b(price|cost|kitna|how much|dam|expensive|cheap|affordable|budget|rate)\b/i,
  recommend:   /\b(recommend|suggest|popular|best|favourite|must.?try|signature|chef|special|famous)\b/i,
  cart:        /\b(cart|my order|mera order|order dikhao|what i ordered|summary|checkout|bill|total|kitna hua)\b/i,
  help:        /\b(help|support|assist|what can you do|capabilities|kya kar sakte)\b/i,
  thanks:      /\b(thank|thanks|thank you|shukriya|dhanyawad|shukriya|appreciate|great|awesome|perfect|bahut accha)\b/i,
  bye:         /\b(bye|goodbye|alvida|see you|later|phir milenge|farewell)\b/i,
};

function detect(msg) {
  return Object.entries(intents).filter(([,re]) => re.test(msg)).map(([k]) => k);
}

function q(sql, ...p) { return db.prepare(sql).all(...p); }
function get(sql, ...p) { return db.prepare(sql).get(...p); }
function run(sql, ...p) { return db.prepare(sql).run(...p); }

function fmt(item) {
  const badges = [];
  if (item.is_vegan) badges.push('🌱 Vegan');
  else if (item.is_vegetarian) badges.push('🟢 Veg');
  else badges.push('🔴 Non-Veg');
  if (item.is_gluten_free) badges.push('🌾 GF');
  if (item.spice_level >= 3) badges.push('🌶️🌶️🌶️');
  else if (item.spice_level === 2) badges.push('🌶️🌶️');
  else if (item.spice_level === 1) badges.push('🌶️');
  return { id:item.id, name:item.name, description:item.description,
    price:item.price, emoji:item.image_emoji, badges,
    prepTime:item.prep_time, category:item.category_name };
}

const CAT_MAP = {
  starter:'Starters & Chaat', chaat:'Starters & Chaat', appetizer:'Starters & Chaat',
  soup:'Soups & Shorba', shorba:'Soups & Shorba',
  bread:'Breads & Rice', naan:'Breads & Rice', roti:'Breads & Rice', rice:'Breads & Rice',
  dal:'Dal & Sabzi', sabzi:'Dal & Sabzi', curry:'Dal & Sabzi', veg:'Dal & Sabzi',
  tandoor:'Tandoor Specials',
  'non-veg':'Non-Veg Curries', chicken:'Non-Veg Curries', mutton:'Non-Veg Curries', fish:'Non-Veg Curries',
  biryani:'Biryanis & Pulao', pulao:'Biryanis & Pulao',
  dessert:'Sweets & Desserts', sweet:'Sweets & Desserts', mithai:'Sweets & Desserts',
  beverage:'Beverages & Lassi', drink:'Beverages & Lassi', lassi:'Beverages & Lassi', chai:'Beverages & Lassi'
};

function saveMsg(sid, role, content) {
  run('INSERT INTO chat_messages (session_id,role,content) VALUES (?,?,?)', sid, role, content);
  run('UPDATE chat_sessions SET last_activity=CURRENT_TIMESTAMP WHERE id=?', sid);
}

function ensureSession(sid) {
  let s = get('SELECT * FROM chat_sessions WHERE id=?', sid);
  if (!s) { run('INSERT INTO chat_sessions (id,context) VALUES (?,?)', sid, '{}'); s = get('SELECT * FROM chat_sessions WHERE id=?', sid); }
  return s;
}

function handleReservation(sid, msg, ctx) {
  let text = '', type = 'text', actions = [];
  switch (ctx.awaitingReservation) {
    case 'name':
      ctx.rd = { name: msg.trim() };
      ctx.awaitingReservation = 'size';
      text = `Swagat hai, **${msg.trim()}** ji! 🙏\n\nAapke saath kitne log aayenge? (How many guests?)`;
      break;
    case 'size': {
      const n = parseInt(msg);
      if (isNaN(n) || n < 1 || n > 30) { text = 'Kripaya 1 aur 30 ke beech mein number daalen. (Please enter between 1 and 30)'; break; }
      ctx.rd.size = n;
      ctx.awaitingReservation = 'date';
      text = `**${n}** logo ke liye table! 🎉\n\nKaunsi date chahiye? *(e.g. "15 August" ya "2025-08-15")*`;
      break;
    }
    case 'date':
      ctx.rd.date = msg.trim();
      ctx.awaitingReservation = 'time';
      text = `**${msg.trim()}** — bilkul theek! 📅\n\nKaunsa waqt chahiye?\n⏰ Slots: 12PM · 1PM · 7PM · 7:30PM · 8PM · 8:30PM · 9PM`;
      break;
    case 'time':
      ctx.rd.time = msg.trim();
      ctx.awaitingReservation = 'special';
      text = `**${msg.trim()}** note kar liya! ✅\n\nKoi special request? *(allergies, anniversary, high chair — ya "nahi" type karein)*`;
      break;
    case 'special': {
      ctx.rd.special = /nahi|none|no/i.test(msg) ? '' : msg.trim();
      ctx.awaitingReservation = 'confirm';
      const r = ctx.rd;
      text = `🪔 **Booking Summary**\n\n👤 Naam: **${r.name}**\n👥 Guests: **${r.size}**\n📅 Date: **${r.date}**\n🕐 Time: **${r.time}**${r.special ? '\n💬 ' + r.special : ''}\n\nKya confirm karein?`;
      actions = ['✅ Haan, confirm karo!', '✏️ Edit karo'];
      break;
    }
    case 'confirm': {
      const yes = /yes|confirm|haan|✅/i.test(msg);
      if (yes) {
        const r = ctx.rd;
        const res = run('INSERT INTO reservations (session_id,customer_name,party_size,reservation_date,reservation_time,special_requests) VALUES (?,?,?,?,?,?)',
          sid, r.name, r.size, r.date, r.time, r.special || '');
        const num = `RSV-${String(res.lastInsertRowid).padStart(5,'0')}`;
        ctx.awaitingReservation = null; ctx.customerName = r.name;
        text = `🎊 **Booking Confirmed! Bahut Shukriya!**\n\nYour confirmation: **${num}**\n\n✅ ${r.name} · ${r.size} guests\n✅ ${r.date} at ${r.time}\n\nHum aapka intezaar karenge **Dilli Darbar** mein! 🙏\nChanges ke liye call karein: *(011) 4567-8900*\n\nAur kuch chahiye?`;
        actions = ['Menu Dekho', 'Order Karein'];
      } else {
        ctx.awaitingReservation = 'name'; ctx.rd = {};
        text = 'Koi baat nahi! Dobara shuru karte hain. Aapka naam kya hai?';
      }
      break;
    }
    default: ctx.awaitingReservation = null; text = 'Kaise help karun?';
  }
  return { response: { text, type, actions }, ctx };
}

function process(sid, userMsg) {
  const session = ensureSession(sid);
  let ctx = {};
  try { ctx = JSON.parse(session.context || '{}'); } catch(e) {}
  saveMsg(sid, 'user', userMsg);

  if (ctx.awaitingReservation) {
    const result = handleReservation(sid, userMsg, ctx);
    run('UPDATE chat_sessions SET context=? WHERE id=?', JSON.stringify(result.ctx), sid);
    saveMsg(sid, 'assistant', result.response.text);
    return result.response;
  }

  const found = detect(userMsg);
  const msg = userMsg.toLowerCase();
  let resp = { text: '', items: [], type: 'text', actions: [] };

  // Prioritise recommend/chef special before generic menu
  if (found.includes('recommend') && !found.includes('category')) {
    const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.available=1 AND m.id IN (5,17,22,28,33,38,46)`);
    resp.text = `⭐ **Chef's Special & Most Popular Dishes** — hamare guests ki favourite!\n\nYeh dishes zaroor try karein:`;
    resp.type = 'menu_items'; resp.items = items.map(fmt);
    resp.actions = ['Poora Menu', 'Table Book Karo'];
  }
  else if (found.includes('greeting') && !found.includes('menu')) {
    const nm = ctx.customerName ? `, ${ctx.customerName} ji` : '';
    resp.text = `🙏 Namaste${nm}! **Dilli Darbar** mein aapka swagat hai!\n\nMain aapka personal dining assistant hoon. Main help kar sakta hoon:\n• 🍛 Poora menu dikhana\n• 📅 Table booking\n• 🛒 Order lena\n• ℹ️ Koi bhi sawaal\n\nAaj kya khaayenge?`;
    resp.actions = ['Poora Menu Dekho', 'Table Book Karo', "Chef's Special"];
  }
  else if (found.includes('menu') && !found.includes('category')) {
    const cats = q('SELECT * FROM menu_categories');
    resp.text = `🍛 **Dilli Darbar ka Menu** — ${cats.length} lajawab categories!\n\nKis category mein khaana pasand karenge?`;
    resp.type = 'categories'; resp.items = cats;
    resp.actions = ['Starters & Chaat', 'Biryani', 'Tandoor', 'Sweets'];
  }
  else if (found.includes('category')) {
    let targetCat = null;
    for (const [k, v] of Object.entries(CAT_MAP)) { if (msg.includes(k)) { targetCat = v; break; } }
    if (targetCat) {
      const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE c.name=? AND m.available=1`, targetCat);
      resp.text = `🍽️ **${targetCat}** — ${items.length} lajawab dishes:\n\nSab fresh aur ghar jaisi recipe!`;
      resp.type = 'menu_items'; resp.items = items.map(fmt);
    }
  }
  else if (found.includes('vegetarian')) {
    if (/vegan|jain/.test(msg)) {
      const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.is_vegan=1 AND m.available=1`);
      resp.text = `🌱 **${items.length} Pure Vegan Dishes** — bilkul saatvik!\n\nHar dish 100% plant-based:`;
      resp.type = 'menu_items'; resp.items = items.map(fmt);
    } else {
      const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.is_vegetarian=1 AND m.available=1`);
      resp.text = `🟢 **${items.length} Vegetarian Options** — sab shudh veg! 🙏\n\nFresh ingredients, authentic flavors:`;
      resp.type = 'menu_items'; resp.items = items.map(fmt);
    }
  }
  else if (found.includes('glutenFree')) {
    const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.is_gluten_free=1 AND m.available=1`);
    resp.text = `🌾 **${items.length} Gluten-Free Options** available!\n\nSpecially prepared with separate cookware:`;
    resp.type = 'menu_items'; resp.items = items.map(fmt);
  }
  else if (found.includes('spicy')) {
    if (/mild|less|kam|non.spicy/.test(msg)) {
      const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.spice_level<=1 AND m.available=1 LIMIT 8`);
      resp.text = `😌 **Mild & Non-Spicy Dishes** — bilkul perfect for you:\n\nKam masala, zyada maza!`;
      resp.type = 'menu_items'; resp.items = items.map(fmt);
    } else {
      const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.spice_level>=3 AND m.available=1`);
      resp.text = `🌶️ **Extra Spicy Dishes** — pakka teekha!\n\nSirf brave log order karte hain 😄:`;
      resp.type = 'menu_items'; resp.items = items.map(fmt);
    }
  }

  else if (found.includes('reservation')) {
    ctx.awaitingReservation = 'name';
    run('UPDATE chat_sessions SET context=? WHERE id=?', JSON.stringify(ctx), sid);
    resp.text = `📅 **Dilli Darbar** mein table book karne ke liye khushi hui!\n\nShuru karte hain — aapka **naam** kya hai?`;
  }
  else if (found.includes('hours')) {
    resp.text = `🕐 **Hamare Timings**\n\n**Somvar – Shanivaar (Mon–Sat):**\n🌅 Lunch: 12:00 PM – 4:00 PM\n🌙 Dinner: 7:00 PM – 11:30 PM\n\n**Ravivar (Sunday):**\n🍳 Brunch: 11:00 AM – 4:00 PM\n🌙 Dinner: 7:00 PM – 10:30 PM\n\n🎉 *Happy Hours: Mon–Fri, 4–7 PM — Beverages pe 20% off!*`;
    resp.actions = ['Table Book Karo', 'Menu Dekho'];
  }
  else if (found.includes('location')) {
    resp.text = `📍 **Hamare Paas Aaiye!**\n\n**Dilli Darbar Restaurant**\n42, Connaught Place, Block C\nNew Delhi – 110001\n\n🚇 Metro: Rajiv Chowk Station *(2 min walk)*\n🚌 Bus: CP Inner Circle stop\n🅿️ Parking: Palika Bazaar basement\n📞 *(011) 4567-8900*`;
    resp.actions = ['Table Book Karo', 'Menu Dekho'];
  }
  else if (found.includes('price')) {
    if (/cheap|budget|affordable|kam|sasta/.test(msg)) {
      const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.price BETWEEN 40 AND 120 AND m.available=1 ORDER BY m.price LIMIT 8`);
      resp.text = `💰 **Budget-Friendly Options** (₹40–₹120):\n\nSwad mein koi compromise nahi!`;
      resp.type = 'menu_items'; resp.items = items.map(fmt);
    } else {
      resp.text = `💰 **Price Ranges**\n\n• Starters & Chaat: ₹80 – ₹200\n• Soups & Shorba: ₹80 – ₹110\n• Breads & Rice: ₹40 – ₹80\n• Dal & Sabzi: ₹150 – ₹240\n• Tandoor Specials: ₹280 – ₹420\n• Non-Veg Curries: ₹340 – ₹440\n• Biryanis & Pulao: ₹220 – ₹480\n• Sweets & Desserts: ₹80 – ₹140\n• Beverages & Lassi: ₹40 – ₹100`;
      resp.actions = ['Starters', 'Biryani', 'Tandoor', 'Desserts'];
    }
  }
  else if (found.includes('cart')) {
    const order = get('SELECT * FROM orders WHERE session_id=? AND status=?', sid, 'pending');
    if (order) {
      const ois = q(`SELECT oi.*,m.name,m.image_emoji FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id WHERE oi.order_id=?`, order.id);
      if (ois.length) {
        const total = ois.reduce((s,i) => s + i.item_price * i.quantity, 0);
        resp.text = `🛒 **Aapka Order:**\n\n${ois.map(i => `${i.image_emoji} ${i.name} ×${i.quantity} — ₹${(i.item_price*i.quantity).toFixed(0)}`).join('\n')}\n\n**Total: ₹${total.toFixed(0)}** + GST\n\nKya confirm karein?`;
        resp.actions = ['Order Confirm Karo', 'Aur Items Add Karo'];
      } else { resp.text = `Cart khali hai! 🛒\nMenu se kuch items add karein.`; resp.actions = ['Menu Dekho']; }
    } else { resp.text = `Cart abhi khali hai! 🛒\nChalo menu dekhte hain!`; resp.actions = ['Menu Dekho', "Chef's Special"]; }
  }
  else if (found.includes('thanks')) {
    resp.text = `🙏 Bahut shukriya! Hamein khushi hui help karke.\n\nAur kuch chahiye?`;
    resp.actions = ['Menu Dekho', 'Table Book Karo'];
  }
  else if (found.includes('bye')) {
    resp.text = `🙏 Khuda Hafiz! Milte hain phir!\n\n**Dilli Darbar** mein aapka swagat rahega hamesha. Dobara zaroor aaiye! 😊`;
  }
  else if (found.includes('help')) {
    resp.text = `Main yeh sab kar sakta hoon:\n\n🍛 **Menu** — Sab categories aur dishes\n🟢 **Veg/Non-Veg** — Filter karo apni pasand se\n🌶️ **Spice Level** — Mild ya extra teekha\n⭐ **Recommendations** — Chef ki pasandida dishes\n📅 **Table Booking** — Step-by-step reservation\n💰 **Prices** — Budget check karo\n📍 **Location & Timing** — Kahan aur kab\n🛒 **Order** — Items add aur place karo`;
    resp.actions = ['Menu Dekho', 'Table Book', 'Chef Special'];
  }
  else {
    const term = `%${userMsg.replace(/[^\w\s]/g,'').slice(0,30)}%`;
    const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE (m.name LIKE ? OR m.description LIKE ?) AND m.available=1 LIMIT 6`, term, term);
    if (items.length) {
      resp.text = `Yeh mila aapke liye! 🍽️`; resp.type = 'menu_items'; resp.items = items.map(fmt);
    } else {
      resp.text = `🤔 Samajh nahi aaya! Aap yeh puch sakte hain:\n\n• Menu categories\n• Veg/Non-veg options\n• Table book karna\n• Chef's special dishes\n• Timing aur location\n\nKya chahiye aapko?`;
      resp.actions = ['Menu Dekho', 'Table Book Karo', "Chef's Special"];
    }
  }

  saveMsg(sid, 'assistant', resp.text);
  return resp;
}

function addToOrder(sid, itemId, qty = 1) {
  const item = get('SELECT * FROM menu_items WHERE id=?', itemId);
  if (!item) return { success: false };
  let order = get('SELECT * FROM orders WHERE session_id=? AND status=?', sid, 'pending');
  if (!order) { const r = run('INSERT INTO orders (session_id) VALUES (?)', sid); order = get('SELECT * FROM orders WHERE id=?', r.lastInsertRowid); }
  const ex = get('SELECT * FROM order_items WHERE order_id=? AND menu_item_id=?', order.id, itemId);
  if (ex) run('UPDATE order_items SET quantity=quantity+? WHERE id=?', qty, ex.id);
  else run('INSERT INTO order_items (order_id,menu_item_id,quantity,item_price) VALUES (?,?,?,?)', order.id, itemId, qty, item.price);
  return { success: true, item };
}

function getHistory(sid) { return q('SELECT * FROM chat_messages WHERE session_id=? ORDER BY timestamp', sid); }

function getStats() {
  return {
    sessions:     get('SELECT COUNT(*) as c FROM chat_sessions').c,
    messages:     get('SELECT COUNT(*) as c FROM chat_messages').c,
    reservations: get('SELECT COUNT(*) as c FROM reservations').c,
    orders:       get('SELECT COUNT(*) as c FROM orders WHERE status=?','confirmed').c
  };
}

function getOrder(sid) {
  const order = get('SELECT * FROM orders WHERE session_id=? AND status=?', sid, 'pending');
  if (!order) return { order: null, items: [], total: 0 };
  const items = q(`SELECT oi.*,m.name,m.image_emoji,m.description FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id WHERE oi.order_id=?`, order.id);
  const total = items.reduce((s, i) => s + i.item_price * i.quantity, 0);
  return { order, items, total: total.toFixed(0) };
}

function confirmOrder(sid) {
  const order = get('SELECT * FROM orders WHERE session_id=? AND status=?', sid, 'pending');
  if (!order) return null;
  const items = q('SELECT * FROM order_items WHERE order_id=?', order.id);
  const total = items.reduce((s,i) => s + i.item_price * i.quantity, 0);
  run('UPDATE orders SET status=?,total_amount=? WHERE id=?', 'confirmed', total, order.id);
  return { orderNumber: `ORD-${String(order.id).padStart(5,'0')}`, total: total.toFixed(0) };
}

function getMenu() {
  const cats = q('SELECT * FROM menu_categories');
  const items = q(`SELECT m.*,c.name as category_name FROM menu_items m JOIN menu_categories c ON m.category_id=c.id WHERE m.available=1 ORDER BY c.id,m.price`);
  return cats.map(c => ({ ...c, items: items.filter(i => i.category_id === c.id) }));
}

module.exports = { process, addToOrder, getHistory, getStats, getOrder, confirmOrder, getMenu };
