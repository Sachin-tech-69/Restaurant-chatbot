const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'restaurant.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, description TEXT, emoji TEXT
  );
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER, name TEXT NOT NULL, description TEXT,
    price REAL NOT NULL, is_vegetarian INTEGER DEFAULT 0,
    is_vegan INTEGER DEFAULT 0, is_gluten_free INTEGER DEFAULT 0,
    spice_level INTEGER DEFAULT 0, prep_time INTEGER DEFAULT 15,
    available INTEGER DEFAULT 1, image_emoji TEXT
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL, customer_name TEXT NOT NULL,
    party_size INTEGER NOT NULL, reservation_date TEXT NOT NULL,
    reservation_time TEXT NOT NULL, special_requests TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL, order_type TEXT DEFAULT 'dine-in',
    total_amount REAL DEFAULT 0, status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER, menu_item_id INTEGER,
    quantity INTEGER DEFAULT 1, item_price REAL
  );
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY, customer_name TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    context TEXT DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL, role TEXT NOT NULL,
    content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT, rating INTEGER, comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const catCount = db.prepare('SELECT COUNT(*) as c FROM menu_categories').get().c;

if (catCount === 0) {
  const ic = db.prepare('INSERT INTO menu_categories (name,description,emoji) VALUES (?,?,?)');
  ic.run('Starters & Chaat','Street-style bites and classic Indian starters','🥙');
  ic.run('Soups & Shorba','Warm broths and traditional Indian soups','🍲');
  ic.run('Breads & Rice','Freshly baked breads and fragrant rice dishes','🫓');
  ic.run('Dal & Sabzi','Lentils, curries and vegetable delights','🍛');
  ic.run('Tandoor Specials','Clay oven grills marinated in Indian spices','🔥');
  ic.run('Non-Veg Curries','Rich meat and seafood curries','🍗');
  ic.run('Biryanis & Pulao','Slow-cooked aromatic rice preparations','🍚');
  ic.run('Sweets & Desserts','Traditional Indian mithai and modern desserts','🍮');
  ic.run('Beverages & Lassi','Refreshing Indian drinks and shakes','🥛');

  const ii = db.prepare(`INSERT INTO menu_items
    (category_id,name,description,price,is_vegetarian,is_vegan,is_gluten_free,spice_level,prep_time,image_emoji)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);

  // Starters & Chaat (1) — prices in INR
  ii.run(1,'Samosa (2 pcs)','Crispy pastry stuffed with spiced potato and peas, served with mint chutney',80,1,1,0,1,10,'🥟');
  ii.run(1,'Pani Puri','6 crispy puris filled with spiced water, chickpeas and tamarind',90,1,1,0,2,5,'🫙');
  ii.run(1,'Dahi Bhalla','Lentil dumplings topped with yogurt, chutneys and chaat masala',110,1,0,1,1,10,'🥣');
  ii.run(1,'Aloo Tikki Chaat','Crispy potato patties topped with chickpeas, yogurt and chutneys',100,1,0,0,2,12,'🥔');
  ii.run(1,'Hara Bhara Kebab','Grilled green spinach and pea patties with mint chutney',120,1,1,1,1,15,'🌿');
  ii.run(1,'Paneer Tikka Starter','Marinated cottage cheese cubes grilled in tandoor',180,1,0,1,2,20,'🧀');
  ii.run(1,'Fish Amritsari','Crispy battered fish with ajwain and chaat masala',200,0,0,0,2,15,'🐟');

  // Soups (2)
  ii.run(2,'Tomato Shorba','Spiced tomato broth with fresh herbs and cream',80,1,0,1,1,10,'🍅');
  ii.run(2,'Dal Shorba','Smooth lentil soup tempered with cumin and garlic',90,1,1,1,1,15,'🫘');
  ii.run(2,'Sweet Corn Soup','Creamy corn soup with desi spices',85,1,0,1,0,10,'🌽');
  ii.run(2,'Mulligatawny','Anglo-Indian curried lentil soup with coconut',110,1,0,0,2,15,'🥥');

  // Breads & Rice (3)
  ii.run(3,'Butter Naan','Soft tandoor bread brushed with butter',40,1,0,0,0,8,'🫓');
  ii.run(3,'Garlic Naan','Tandoor bread with roasted garlic and coriander',50,1,0,0,0,8,'🫓');
  ii.run(3,'Lachha Paratha','Flaky layered whole-wheat bread',45,1,0,0,0,10,'🥙');
  ii.run(3,'Puri (3 pcs)','Deep-fried puffed bread',50,1,1,0,0,8,'🫓');
  ii.run(3,'Steamed Rice','Long-grain basmati rice',60,1,1,1,0,15,'🍚');
  ii.run(3,'Jeera Rice','Basmati rice tempered with cumin seeds',80,1,1,1,1,15,'🍚');
  ii.run(3,'Missi Roti','Spiced gram flour flatbread',40,1,1,0,1,10,'🫓');

  // Dal & Sabzi (4)
  ii.run(4,'Dal Makhani','Black lentils slow-cooked overnight in butter and cream',180,1,0,1,1,25,'🫘');
  ii.run(4,'Paneer Butter Masala','Cottage cheese in rich tomato and cashew gravy',220,1,0,1,1,20,'🧀');
  ii.run(4,'Palak Paneer','Cottage cheese in creamy spinach gravy',200,1,0,1,1,20,'🥬');
  ii.run(4,'Shahi Paneer','Paneer in royal Mughlai gravy with saffron and cream',240,1,0,1,1,25,'👑');
  ii.run(4,'Aloo Gobi','Potato and cauliflower dry-fried with turmeric and spices',150,1,1,1,1,20,'🥦');
  ii.run(4,'Chhole Bhature','Spiced chickpeas with fluffy deep-fried bread',160,1,1,0,2,20,'🍳');
  ii.run(4,'Baingan Bharta','Roasted eggplant mashed with spices and tomatoes',160,1,1,1,2,25,'🍆');

  // Tandoor (5)
  ii.run(5,'Paneer Tikka','Marinated cottage cheese grilled in clay oven with peppers',280,1,0,1,2,25,'🧀');
  ii.run(5,'Tandoori Chicken Half','Chicken marinated in yogurt and spices, grilled in tandoor',320,0,0,1,2,30,'🍗');
  ii.run(5,'Seekh Kebab (4 pcs)','Minced lamb skewers grilled with aromatic spices',360,0,0,1,2,25,'🍢');
  ii.run(5,'Malai Tikka','Chicken in creamy cashew and cream marinade, mildly spiced',340,0,0,1,1,25,'🍗');
  ii.run(5,'Tandoori Jhinga','Tiger prawns marinated with lemon and spices',420,0,0,1,2,20,'🦐');
  ii.run(5,'Achari Paneer Tikka','Cottage cheese marinated in pickle masala',300,1,0,1,3,25,'🧀');

  // Non-Veg Curries (6)
  ii.run(6,'Butter Chicken','Tender chicken in velvety tomato-butter gravy — India favourite',340,0,0,1,1,25,'🍗');
  ii.run(6,'Chicken Tikka Masala','Grilled chicken in spiced onion-tomato masala',350,0,0,1,2,25,'🍗');
  ii.run(6,'Mutton Rogan Josh','Slow-cooked lamb in aromatic Kashmiri spices',420,0,0,1,2,40,'🐑');
  ii.run(6,'Goan Fish Curry','Fresh fish in tangy coconut and kokum curry',380,0,0,1,3,25,'🐟');
  ii.run(6,'Prawn Masala','Juicy prawns in a bold onion-tomato masala',440,0,0,1,3,20,'🦐');
  ii.run(6,'Chicken Chettinad','Fiery South Indian chicken with freshly ground spices',360,0,0,1,4,30,'🌶️');

  // Biryani (7)
  ii.run(7,'Hyderabadi Mutton Biryani','Dum-cooked basmati with tender mutton and saffron',480,0,0,1,2,45,'🍚');
  ii.run(7,'Chicken Biryani','Aromatic basmati with spiced chicken — Lucknawi style',380,0,0,1,2,40,'🍗');
  ii.run(7,'Paneer Biryani','Fragrant rice layered with marinated cottage cheese',320,1,0,1,1,35,'🧀');
  ii.run(7,'Vegetable Pulao','Lightly spiced basmati rice with seasonal vegetables',220,1,1,1,1,25,'🌾');
  ii.run(7,'Egg Biryani','Spiced basmati with masala eggs and caramelised onions',300,0,0,1,2,35,'🥚');

  // Desserts (8)
  ii.run(8,'Gulab Jamun (2 pcs)','Soft milk-solid dumplings soaked in rose syrup',80,1,0,0,0,5,'🍩');
  ii.run(8,'Rasgulla (2 pcs)','Spongy cottage cheese balls in sugar syrup',80,1,0,0,0,5,'⚪');
  ii.run(8,'Gajar Ka Halwa','Slow-cooked carrot pudding with khoya and dry fruits',120,1,0,1,0,10,'🥕');
  ii.run(8,'Kulfi Falooda','Traditional Indian ice cream with vermicelli and rose syrup',140,1,0,0,0,5,'🍧');
  ii.run(8,'Phirni','Creamy ground rice pudding with saffron and cardamom',110,1,0,1,0,5,'🍚');
  ii.run(8,'Jalebi with Rabdi','Crispy sugar syrup spirals with thickened milk',100,1,0,0,0,10,'🍥');

  // Beverages (9)
  ii.run(9,'Sweet Lassi','Chilled blended yogurt with sugar and cardamom',80,1,0,1,0,3,'🥛');
  ii.run(9,'Mango Lassi','Thick yogurt blended with Alphonso mango pulp',100,1,0,1,0,3,'🥭');
  ii.run(9,'Masala Chai','Spiced tea brewed with ginger, cardamom and milk',40,1,0,1,0,5,'🍵');
  ii.run(9,'Fresh Lime Soda','Sweet or salted fresh lime with soda',50,1,1,1,0,2,'🍋');
  ii.run(9,'Rose Sharbat','Chilled rose-flavoured drink with basil seeds',60,1,1,1,0,2,'🌹');
  ii.run(9,'Chaas (Buttermilk)','Spiced thin yogurt drink with cumin and mint',50,1,0,1,0,2,'🥛');
  ii.run(9,'Filter Coffee','South Indian strong drip coffee with frothy milk',60,1,0,1,0,5,'☕');

  console.log('✅ Indian menu seeded successfully');
}

module.exports = db;
