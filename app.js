// --- IMPORTS ---
// **FIX:** Corrected the typo in the firestore import URL
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
let foodLog = [], activityLog = [], symptomLog = [], db, auth, userId;
let currentPhotoBase64 = null;
let currentEditInfo = { id: null, type: null };
let userProfile = {
    name: '',
    monitoringPrefs: {
        calories: true, sodium: true, added_sugar: true, sat_fat: true,
        fat: true, protein: true, fiber: true, potassium: true,
        purine: true, alcohol: true,
    },
    heightFt: null, heightIn: null, weightLbs: null, calorieGoal: 2200
};
// Use a default app ID if not provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
let recognition;
let isListening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// --- DATA: Food Database ---
const foodDatabase = {
    'oatmeal': { keywords: ['oatmeal', 'oats'], unit: 'cup', cal: 150, na: 5, sat_fat: 0.5, fat: 2.5, protein: 5, potassium: 140, added_sugar: 0, fiber: 4, purine: 'Low', swap: 'Great choice! Using steel-cut or rolled oats maximizes fiber.' },
    'blueberry': { keywords: ['blueberry', 'blueberries'], unit: 'cup', cal: 85, na: 1, sat_fat: 0, fat: 0.5, protein: 1, potassium: 110, added_sugar: 0, fiber: 3.6, purine: 'Low', swap: 'Perfect addition. Berries are great for antioxidants.' },
    'walnut': { keywords: ['walnut', 'walnuts'], unit: 'oz', cal: 185, na: 1, sat_fat: 1.7, fat: 18, protein: 4, potassium: 125, added_sugar: 0, fiber: 1.9, purine: 'Low', swap: 'Excellent source of healthy fats. Stick to a 1 oz portion (about 1/4 cup) to manage calories.' },
    'flax seed powder': { keywords: ['flax seed powder', 'flax seed', 'flax'], unit: 'tbsp', cal: 37, na: 2, sat_fat: 0.3, fat: 3, protein: 1.5, potassium: 60, added_sugar: 0, fiber: 2, purine: 'Low', swap: 'Fantastic for fiber and omega-3s.' },
    'peanut butter': { keywords: ['peanut butter'], unit: 'tbsp', cal: 95, na: 70, sat_fat: 1.7, fat: 8, protein: 4, potassium: 100, added_sugar: 1.5, fiber: 1, purine: 'Low', swap: 'Choose a natural peanut butter with no added sugar or salt.' },
    'almond milk': { keywords: ['almond milk'], unit: 'cup', cal: 40, na: 150, sat_fat: 0, fat: 2.5, protein: 1, potassium: 170, added_sugar: 7, fiber: 1, purine: 'Low', swap: 'Opt for the "unsweetened" version to avoid added sugars.' },
    'egg': { keywords: ['egg', 'eggs', 'fried egg'], unit: 'large', cal: 75, na: 70, sat_fat: 1.6, fat: 5, protein: 6, potassium: 60, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'A great source of protein. Scramble with veggies for extra fiber.' },
    'scrambled egg': { keywords: ['scrambled egg', 'scrambled eggs'], unit: 'large egg', cal: 100, na: 100, sat_fat: 2.5, fat: 7.5, protein: 6, potassium: 70, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'Use milk instead of cream and cook with minimal oil or butter.' },
    'egg omelet': { keywords: ['egg omelet', 'omelet'], unit: '2-egg', cal: 180, na: 200, sat_fat: 5, fat: 14, protein: 12, potassium: 140, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'Load it with veggies like spinach and bell peppers for added fiber and nutrients.' },
    'boiled egg': { keywords: ['boiled egg', 'hard boiled egg'], unit: 'large', cal: 75, na: 70, sat_fat: 1.6, fat: 5, protein: 6, potassium: 60, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'A perfect high-protein, low-fat snack on its own.' },
    'bacon': { keywords: ['bacon'], unit: 'slice', cal: 45, na: 180, sat_fat: 1.5, fat: 3.5, protein: 3, potassium: 50, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Try turkey bacon or a plant-based alternative for less saturated fat.' },
    'sirloin steak': { keywords: ['sirloin steak', 'steak'], unit: 'oz', cal: 55, na: 70, sat_fat: 2.5, fat: 3, protein: 7, potassium: 100, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Try a smaller 5-6 oz portion, or swap for grilled salmon for healthy fats.' },
    'anchovies': { keywords: ['anchovies'], unit: 'oz', cal: 60, na: 1040, sat_fat: 1, fat: 2.5, protein: 6, potassium: 110, added_sugar: 0, fiber: 0, purine: 'High', swap: 'Avoid high-purine fish. Try capers for a similar salty kick in dishes.' },
    'deli turkey': { keywords: ['deli turkey', 'turkey slices'], unit: 'oz', cal: 35, na: 350, sat_fat: 0.2, fat: 1, protein: 5, potassium: 70, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Choose low-sodium versions or, even better, use leftover roasted chicken/turkey.' },
    'mashed potatoes': { keywords: ['mashed potatoes', 'mashed potato'], unit: 'cup', cal: 200, na: 350, sat_fat: 8, fat: 9, protein: 4, potassium: 300, added_sugar: 0, fiber: 3, purine: 'Low', swap: 'Mash with olive oil or Greek yogurt instead of butter to cut saturated fat.' },
    'sautéed spinach': { keywords: ['sautéed spinach', 'spinach'], unit: 'cup', cal: 50, na: 150, sat_fat: 0.5, fat: 1, protein: 5, potassium: 840, added_sugar: 0, fiber: 4, purine: 'Low', swap: 'Great choice! Steam it to avoid added oils and sodium.' },
    'chicken noodle soup': { keywords: ['chicken noodle soup', 'chicken soup'], unit: 'cup', cal: 80, na: 850, sat_fat: 1, fat: 2.5, protein: 5, potassium: 150, added_sugar: 1, fiber: 1, purine: 'Low', swap: 'Opt for a low-sodium broth or a homemade version to control salt.' },
    'side salad': { keywords: ['side salad', 'salad'], unit: 'cup', cal: 100, na: 250, sat_fat: 2, fat: 8, protein: 2, potassium: 200, added_sugar: 2, fiber: 2, purine: 'Low', swap: 'Use an olive oil & vinegar dressing instead of creamy ones.' },
    'wheat bread': { keywords: ['wheat bread', 'bread'], unit: 'slice', cal: 80, na: 150, sat_fat: 0.5, fat: 1.5, protein: 4, potassium: 70, added_sugar: 1, fiber: 2, purine: 'Low', swap: 'Choose 100% whole wheat for maximum fiber.' },
    'low-fat yogurt': { keywords: ['low-fat yogurt', 'yogurt'], unit: '6oz', cal: 150, na: 80, sat_fat: 2, fat: 3.5, protein: 12, potassium: 400, added_sugar: 8, fiber: 0, purine: 'Low', swap: 'Pick plain yogurt and add your own fruit to control added sugar.' },
    'cherries': { keywords: ['cherries'], unit: 'cup', cal: 90, na: 0, sat_fat: 0, fat: 0.5, protein: 1.5, potassium: 300, added_sugar: 0, fiber: 3, purine: 'Low', swap: 'Excellent choice, rich in antioxidants!' },
    'cheeseburger': { keywords: ['cheeseburger', 'burger'], unit: 'item', cal: 500, na: 1100, sat_fat: 12, fat: 28, protein: 25, potassium: 400, added_sugar: 5, fiber: 2, purine: 'Moderate', swap: 'Make a burger at home with lean ground turkey on a whole wheat bun.' },
    'french fries': { keywords: ['french fries', 'fries'], unit: 'medium', cal: 350, na: 300, sat_fat: 3, fat: 17, protein: 4, potassium: 500, added_sugar: 0, fiber: 3, purine: 'Low', swap: 'Bake potato wedges at home with a drizzle of olive oil instead of frying.' },
    'beer': { keywords: ['beer'], unit: '12oz', cal: 150, na: 10, sat_fat: 0, fat: 0, protein: 1.5, potassium: 100, added_sugar: 0, fiber: 0, purine: 'High', alcohol: 1, swap: 'Swap for sparkling water with lime to avoid alcohol and purines.' },
    'coke': { keywords: ['coke', 'soda', 'cola'], unit: '12oz', cal: 140, na: 45, sat_fat: 0, fat: 0, protein: 0, potassium: 10, added_sugar: 39, fiber: 0, purine: 'High', swap: 'Switch to diet soda or, ideally, flavored sparkling water to avoid sugar.' },
    'water': { keywords: ['water'], unit: 'glass', cal: 0, na: 0, sat_fat: 0, fat: 0, protein: 0, potassium: 0, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'Perfect for hydration, which helps manage uric acid.' },
    'grilled chicken': { keywords: ['grilled chicken', 'chicken breast', 'chicken'], unit: 'oz', cal: 45, na: 20, sat_fat: 0.3, fat: 1, protein: 9, potassium: 70, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Excellent lean protein choice. Be mindful of high-sodium marinades.'},
    'fried chicken': { keywords: ['fried chicken'], unit: 'piece', cal: 300, na: 700, sat_fat: 7, fat: 18, protein: 25, potassium: 250, added_sugar: 0, fiber: 1, purine: 'Moderate', swap: 'Grilled or baked chicken is a much healthier option to reduce sodium and saturated fat.'},
    'roast chicken': { keywords: ['roast chicken', 'roasted chicken'], unit: 'oz', cal: 50, na: 25, sat_fat: 0.5, fat: 2, protein: 8, potassium: 65, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Great choice! Remove the skin to lower saturated fat content.'},
    'chicken curry': { keywords: ['chicken curry'], unit: 'cup', cal: 380, na: 800, sat_fat: 10, fat: 22, protein: 25, potassium: 500, added_sugar: 4, fiber: 4, purine: 'Moderate', swap: 'A lighter, broth-based curry is a healthier alternative to creamy ones.'},
    'chicken salad': { keywords: ['chicken salad'], unit: 'cup', cal: 400, na: 600, sat_fat: 4, fat: 20, protein: 30, potassium: 350, added_sugar: 2, fiber: 1, purine: 'Moderate', swap: 'Make it with Greek yogurt instead of mayonnaise to drastically cut fat and calories.'},
    'chicken sandwich': { keywords: ['chicken sandwich'], unit: 'sandwich', cal: 350, na: 800, sat_fat: 3, fat: 10, protein: 25, potassium: 300, added_sugar: 4, fiber: 3, purine: 'Moderate', swap: 'Use grilled chicken and whole wheat bread for a healthier version.'},
    'chicken wings': { keywords: ['chicken wings', 'wings'], unit: '3 pieces', cal: 350, na: 900, sat_fat: 8, fat: 25, protein: 20, potassium: 200, added_sugar: 5, fiber: 0, purine: 'Moderate', swap: 'Try baked or air-fried wings with a dry rub instead of a sugary sauce.'},
    'tandoori chicken': { keywords: ['tandoori chicken'], unit: 'piece', cal: 250, na: 400, sat_fat: 4, fat: 12, protein: 30, potassium: 400, added_sugar: 1, fiber: 1, purine: 'Moderate', swap: 'Excellent lean choice. Pair with a side salad instead of naan.'},
    'roti': { keywords: ['roti', 'chapati'], unit: 'piece', cal: 100, na: 150, sat_fat: 0.5, fat: 2, protein: 3, potassium: 80, added_sugar: 0, fiber: 3, purine: 'Low', swap: 'Opt for whole wheat (atta) roti for more fiber.' },
    'naan': { keywords: ['naan'], unit: 'piece', cal: 260, na: 450, sat_fat: 2, fat: 7, protein: 8, potassium: 120, added_sugar: 2, fiber: 2, purine: 'Low', swap: 'Roti is a lower calorie and sodium alternative.' },
    'dal': { keywords: ['dal', 'lentil soup'], unit: 'cup', cal: 230, na: 600, sat_fat: 2, fat: 5, protein: 12, potassium: 400, added_sugar: 0, fiber: 8, purine: 'Low', swap: 'Excellent source of protein and fiber. Make at home to control sodium.' },
    'samosa': { keywords: ['samosa'], unit: 'piece', cal: 250, na: 400, sat_fat: 5, fat: 15, protein: 5, potassium: 200, added_sugar: 1, fiber: 3, purine: 'Low', swap: 'Try baked samosas instead of fried to reduce fat content.' },
    'chicken tikka masala': { keywords: ['chicken tikka masala'], unit: 'cup', cal: 400, na: 900, sat_fat: 12, fat: 25, protein: 30, potassium: 600, added_sugar: 5, fiber: 4, purine: 'Moderate', swap: 'Opt for tandoori chicken (dry) to avoid the creamy, high-fat sauce.' },
    'paneer butter masala': { keywords: ['paneer butter masala'], unit: 'cup', cal: 450, na: 800, sat_fat: 18, fat: 35, protein: 15, potassium: 500, added_sugar: 6, fiber: 3, purine: 'Low', swap: 'A lighter palak paneer (spinach) is a healthier choice.' },
    'biryani': { keywords: ['biryani', 'chicken biryani'], unit: 'cup', cal: 450, na: 850, sat_fat: 8, fat: 18, protein: 25, potassium: 450, added_sugar: 2, fiber: 3, purine: 'Moderate', swap: 'Vegetable biryani is a lower purine option. Control portion size.' },
    'idli': { keywords: ['idli'], unit: 'piece', cal: 60, na: 150, sat_fat: 0, fat: 0.2, protein: 2, potassium: 50, added_sugar: 0, fiber: 1, purine: 'Low', swap: 'A great low-calorie, steamed option. Watch the sodium in chutneys.' },
    'dosa': { keywords: ['dosa'], unit: 'piece', cal: 180, na: 300, sat_fat: 1, fat: 6, protein: 4, potassium: 100, added_sugar: 0, fiber: 2, purine: 'Low', swap: 'Plain dosa is good; avoid high-fat masala fillings.' },
    'chana masala': { keywords: ['chana masala', 'chole'], unit: 'cup', cal: 350, na: 700, sat_fat: 2, fat: 12, protein: 15, potassium: 500, added_sugar: 3, fiber: 10, purine: 'Low', swap: 'A fantastic high-fiber and high-protein option. Best made at home to limit sodium.' },
    'salmon': { keywords: ['salmon'], unit: 'oz', cal: 50, na: 25, sat_fat: 0.8, fat: 3, protein: 6, potassium: 130, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Excellent source of Omega-3s. Grilling or baking is healthiest.' },
    'catfish': { keywords: ['catfish'], unit: 'oz', cal: 55, na: 150, sat_fat: 2, fat: 4, protein: 5, potassium: 90, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Baking or grilling is a healthier choice than frying.' },
    'rice': { keywords: ['rice', 'white rice'], unit: 'cup', cal: 205, na: 5, sat_fat: 0.1, fat: 0.4, protein: 4, potassium: 55, added_sugar: 0, fiber: 0.6, purine: 'Low', swap: 'Choose brown rice for significantly more fiber and nutrients.' },
    'brown rice': { keywords: ['brown rice'], unit: 'cup', cal: 215, na: 10, sat_fat: 0.4, fat: 1.8, protein: 5, potassium: 150, added_sugar: 0, fiber: 3.5, purine: 'Low', swap: 'Excellent choice for fiber.' },
    'pasta': { keywords: ['pasta'], unit: 'cup', cal: 220, na: 1, sat_fat: 0.2, fat: 1.3, protein: 8, potassium: 120, added_sugar: 0, fiber: 2.5, purine: 'Low', swap: 'Opt for whole wheat pasta for more fiber and pair with a veggie-based sauce.' },
    'spaghetti and meatballs': { keywords: ['spaghetti and meatballs', 'spaghetti meatballs'], unit: 'cup', cal: 380, na: 900, sat_fat: 7, fat: 16, protein: 20, potassium: 550, added_sugar: 8, fiber: 4, purine: 'Moderate', swap: 'Use whole wheat pasta and lean meatballs.' },
    // **FIX:** Removed "chicken pasta" to prevent it from matching *before* "chicken" and "pasta" separately.
    'chicken alfredo': { keywords: ['chicken alfredo', 'chicken fettuccine'], unit: 'cup', cal: 600, na: 950, sat_fat: 22, fat: 38, protein: 28, potassium: 350, added_sugar: 2, fiber: 2, purine: 'Moderate', swap: 'A very high-fat dish. Try grilled chicken with a tomato-based sauce instead.' },
    'macaroni and cheese': { keywords: ['macaroni and cheese', 'mac and cheese'], unit: 'cup', cal: 350, na: 750, sat_fat: 10, fat: 18, protein: 12, potassium: 150, added_sugar: 3, fiber: 2, purine: 'Low', swap: 'Use whole wheat pasta and low-fat cheese to reduce fat and sodium.' },
    'quinoa': { keywords: ['quinoa'], unit: 'cup', cal: 222, na: 13, sat_fat: 0.5, fat: 3.6, protein: 8, potassium: 318, added_sugar: 0, fiber: 5, purine: 'Low', swap: 'A fantastic complete protein and high-fiber grain.' },
    'broccoli': { keywords: ['broccoli'], unit: 'cup', cal: 55, na: 50, sat_fat: 0.1, fat: 0.6, protein: 4, potassium: 450, added_sugar: 0, fiber: 5, purine: 'Low', swap: 'Great choice! Steaming is a great way to preserve nutrients.' },
    'carrots': { keywords: ['carrots', 'carrot'], unit: 'cup', cal: 52, na: 88, sat_fat: 0.1, fat: 0.3, protein: 1, potassium: 410, added_sugar: 0, fiber: 3.6, purine: 'Low', swap: 'Excellent source of Vitamin A.' },
    'bell pepper': { keywords: ['bell pepper', 'pepper'], unit: 'cup', cal: 30, na: 3, sat_fat: 0, fat: 0.2, protein: 1, potassium: 210, added_sugar: 0, fiber: 2, purine: 'Low', swap: 'Colorful and rich in Vitamin C.' },
    'tomato': { keywords: ['tomato', 'tomatoes'], unit: 'cup', cal: 32, na: 9, sat_fat: 0, fat: 0.4, protein: 1.5, potassium: 427, added_sugar: 0, fiber: 2.2, purine: 'Low', swap: 'A great source of lycopene and potassium.' },
    'apple': { keywords: ['apple'], unit: 'medium', cal: 95, na: 2, sat_fat: 0, fat: 0.3, protein: 0.5, potassium: 195, added_sugar: 0, fiber: 4.4, purine: 'Low', swap: 'A perfect high-fiber snack.' },
    'orange': { keywords: ['orange'], unit: 'medium', cal: 62, na: 0, sat_fat: 0, fat: 0.2, protein: 1.2, potassium: 237, added_sugar: 0, fiber: 3.1, purine: 'Low', swap: 'Excellent source of Vitamin C.' },
    'grapes': { keywords: ['grapes'], unit: 'cup', cal: 104, na: 3, sat_fat: 0.1, fat: 0.2, protein: 1, potassium: 288, added_sugar: 0, fiber: 1.4, purine: 'Low', swap: 'A sweet and hydrating snack.' },
    'pork chop': { keywords: ['pork chop'], unit: 'oz', cal: 60, na: 15, sat_fat: 2, fat: 4, protein: 6, potassium: 90, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Choose lean cuts and trim visible fat. Baking is healthier than frying.' },
    'ground beef': { keywords: ['ground beef'], unit: 'oz', cal: 70, na: 25, sat_fat: 2.5, fat: 5, protein: 7, potassium: 80, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Opt for lean (90/10 or leaner) ground beef to reduce saturated fat.' },
    'shrimp': { keywords: ['shrimp'], unit: 'oz', cal: 24, na: 60, sat_fat: 0, fat: 0.1, protein: 5, potassium: 20, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Good source of protein, but can be high in cholesterol. Grilling or steaming is best.' },
    'tuna': { keywords: ['tuna', 'canned tuna'], unit: 'oz', cal: 30, na: 100, sat_fat: 0, fat: 0.5, protein: 7, potassium: 60, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Choose tuna packed in water, not oil, and look for low-sodium options.' },
    'almonds': { keywords: ['almonds'], unit: 'oz', cal: 164, na: 0, sat_fat: 1.2, fat: 14, protein: 6, potassium: 208, added_sugar: 0, fiber: 3.5, purine: 'Low', swap: 'A great source of healthy fats and fiber. Stick to a 1 oz portion.' },
    'potato chips': { keywords: ['potato chips', 'chips'], unit: 'oz', cal: 152, na: 136, sat_fat: 1.5, fat: 10, protein: 2, potassium: 336, added_sugar: 0, fiber: 1, purine: 'Low', swap: 'Try baked chips or popcorn for a lower-fat, lower-sodium crunch.' },
    'pretzels': { keywords: ['pretzels'], unit: 'oz', cal: 108, na: 450, sat_fat: 0.2, fat: 0.8, protein: 3, potassium: 54, added_sugar: 1, fiber: 1, purine: 'Low', swap: 'Look for unsalted or low-sodium pretzels to manage blood pressure.' },
    'potato': { keywords: ['potato', 'baked potato'], unit: 'medium', cal: 160, na: 15, sat_fat: 0.1, fat: 0.2, protein: 4, potassium: 900, added_sugar: 0, fiber: 4, purine: 'Low', swap: 'Great source of potassium. Avoid high-fat toppings like butter and sour cream.' },
    'plantain': { keywords: ['plantain', 'fried plantain'], unit: 'cup', cal: 310, na: 10, sat_fat: 4, fat: 12, protein: 2, potassium: 700, added_sugar: 0, fiber: 3, purine: 'Low', swap: 'Baking plantains instead of frying them greatly reduces fat and calories.' },
    'banana': { keywords: ['banana'], unit: 'medium', cal: 105, na: 1, sat_fat: 0.1, fat: 0.4, protein: 1, potassium: 420, added_sugar: 0, fiber: 3, purine: 'Low', swap: 'A perfect snack, high in potassium and fiber.' },
    'beef stir-fry': { keywords: ['beef stir-fry'], unit: 'cup', cal: 350, na: 900, sat_fat: 5, fat: 18, protein: 25, potassium: 500, added_sugar: 8, fiber: 4, purine: 'Moderate', swap: 'Use low-sodium soy sauce and lots of vegetables.'},
    'beef stew': { keywords: ['beef stew'], unit: 'cup', cal: 300, na: 800, sat_fat: 6, fat: 15, protein: 20, potassium: 600, added_sugar: 3, fiber: 5, purine: 'Moderate', swap: 'Load it with vegetables like carrots and potatoes, and use a lean cut of beef.'},
    'meatloaf': { keywords: ['meatloaf'], unit: 'slice', cal: 280, na: 500, sat_fat: 8, fat: 18, protein: 20, potassium: 300, added_sugar: 4, fiber: 1, purine: 'Moderate', swap: 'Use lean ground beef or turkey and a low-sugar glaze.'},
    'beef taco': { keywords: ['beef taco', 'taco'], unit: 'taco', cal: 250, na: 550, sat_fat: 5, fat: 14, protein: 15, potassium: 250, added_sugar: 1, fiber: 3, purine: 'Moderate', swap: 'Use lean ground beef, a whole wheat tortilla, and load up on lettuce and tomato.'},
    'spaghetti bolognese': { keywords: ['spaghetti bolognese'], unit: 'cup', cal: 350, na: 700, sat_fat: 6, fat: 15, protein: 20, potassium: 500, added_sugar: 8, fiber: 4, purine: 'Moderate', swap: 'Use whole wheat spaghetti and a sauce with lots of vegetables.'},
    'fettuccine alfredo': { keywords: ['fettuccine alfredo'], unit: 'cup', cal: 550, na: 900, sat_fat: 20, fat: 35, protein: 15, potassium: 300, added_sugar: 2, fiber: 2, purine: 'Low', swap: 'A very high-fat dish. Try a lighter version with a yogurt or cauliflower-based sauce.'},
    'lasagna': { keywords: ['lasagna'], unit: 'slice', cal: 400, na: 850, sat_fat: 10, fat: 22, protein: 25, potassium: 450, added_sugar: 6, fiber: 3, purine: 'Moderate', swap: 'Use lean ground meat and low-fat cheeses to reduce calories and fat.'},
    'caesar salad': { keywords: ['caesar salad'], unit: 'large', cal: 450, na: 800, sat_fat: 8, fat: 30, protein: 10, potassium: 300, added_sugar: 2, fiber: 3, purine: 'Low', swap: 'Ask for dressing on the side and use it sparingly. Add grilled chicken for protein.'},
    'greek salad': { keywords: ['greek salad'], unit: 'large', cal: 350, na: 900, sat_fat: 7, fat: 25, protein: 8, potassium: 500, added_sugar: 1, fiber: 5, purine: 'Low', swap: 'A great choice, but be mindful of the high sodium from feta and olives.'},
    'cobb salad': { keywords: ['cobb salad'], unit: 'large', cal: 600, na: 1200, sat_fat: 15, fat: 45, protein: 35, potassium: 700, added_sugar: 3, fiber: 6, purine: 'Moderate', swap: 'Very high in sodium and fat. Ask for light dressing and less bacon/cheese.'},
    'cod': { keywords: ['cod'], unit: 'oz', cal: 23, na: 15, sat_fat: 0.1, fat: 0.2, protein: 5, potassium: 115, added_sugar: 0, fiber: 0, purine: 'Moderate', swap: 'Excellent lean fish. Baking or broiling are the healthiest preparations.'},
    'tilapia': { keywords: ['tilapia'], unit: 'oz', cal: 27, na: 16, sat_fat: 0.3, fat: 0.8, protein: 5.5, potassium: 85, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'A very lean fish option. Season with herbs instead of salt.'},
    'shrimp scampi': { keywords: ['shrimp scampi'], unit: 'cup', cal: 450, na: 900, sat_fat: 10, fat: 25, protein: 20, potassium: 200, added_sugar: 1, fiber: 2, purine: 'Moderate', swap: 'Typically high in butter and sodium. Try grilled shrimp with lemon and herbs instead.'},
    'coffee': { keywords: ['coffee'], unit: 'cup', cal: 5, na: 5, sat_fat: 0, fat: 0, protein: 0.3, potassium: 116, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'Drink it black or with a splash of low-fat milk to avoid added sugars and fat.' },
    'tea': { keywords: ['tea', 'green tea', 'black tea'], unit: 'cup', cal: 2, na: 5, sat_fat: 0, fat: 0, protein: 0, potassium: 88, added_sugar: 0, fiber: 0, purine: 'Low', swap: 'An excellent, healthy beverage choice. Avoid adding sugar.' },
    'orange juice': { keywords: ['orange juice'], unit: 'cup', cal: 112, na: 2, sat_fat: 0.1, fat: 0.5, protein: 1.7, potassium: 496, added_sugar: 21, fiber: 0.7, purine: 'Low', swap: 'Eating a whole orange is better as it includes fiber. If you drink juice, stick to a small glass.' },
    'milk': { keywords: ['milk', 'low-fat milk'], unit: 'cup', cal: 102, na: 107, sat_fat: 1.5, fat: 2.4, protein: 8, potassium: 382, added_sugar: 12, fiber: 0, purine: 'Low', swap: 'A great source of calcium and protein. Opt for low-fat or skim milk.' },
    'wine': { keywords: ['wine', 'red wine', 'white wine'], unit: '5oz glass', cal: 125, na: 6, sat_fat: 0, fat: 0, protein: 0.1, potassium: 127, added_sugar: 1.4, fiber: 0, purine: 'Low', alcohol: 1, swap: 'Moderation is key. Alcohol can trigger gout and add empty calories.' },
};
// --- DATA: Goals & Tips ---
const healthGoals = { sodium: 2000, added_sugar: 36, sat_fat: 22, calories: 2200, protein: 50, potassium: 3400, fat: 65 };
const metricLabels = { calories: "Calories", sodium: "Sodium", added_sugar: "Added Sugar", sat_fat: "Saturated Fat", fat: "Total Fat", protein: "Protein", fiber: "Fiber", potassium: "Potassium", purine: "Purine Verdict", alcohol: "Alcohol" };
const healthTips = [
    "Aim for at least 30 minutes of moderate-intensity exercise, like brisk walking, most days of the week to support heart health.",
    "To lower cholesterol, focus on soluble fiber from foods like oatmeal, apples, and beans. It helps bind cholesterol and remove it from your body.",
    "Reduce high blood pressure by limiting processed foods, which are often high in sodium. Cooking at home gives you more control.",
    "For gout management, limit high-purine foods like red meat, organ meats, and certain seafood like anchovies. Stay hydrated with plenty of water.",
    "Control blood sugar by choosing whole grains (like brown rice) over refined grains (like white bread). The fiber slows down sugar absorption.",
    "Protect your kidneys by managing blood pressure and blood sugar. A balanced diet low in sodium is crucial.",
    "To lower saturated fat intake, trim visible fat from meats, choose lean protein sources like chicken breast or fish, and use olive oil for cooking.",
    "Increase your potassium intake with foods like bananas, potatoes, and spinach. Potassium helps your body get of excess sodium.",
    "Limit sugary drinks like sodas and juices. They are a major source of added sugars and can contribute to weight gain and other health issues.",
    "Staying well-hydrated is key for kidney health and can help your body flush out excess uric acid, which is important for managing gout."
];

// --- DOM BINDING ---
// **FIX:** This variable is now declared globally but defined inside the listener
let dom;

// --- FIREBASE & INITIALIZATION ---

async function setupFirebase() {
    try {
        let app;
        
        // **FIX:** This logic now correctly reads from config.js
        // It checks if the global 'firebaseConfig' variable exists and is not the placeholder.
        if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === "YOUR_API_KEY") {
            // Check for environment variable as a fallback (for canvas environment)
            if (typeof __firebase_config !== 'undefined') {
                const envConfig = JSON.parse(__firebase_config);
                app = initializeApp(envConfig);
            } else {
                // If no config is found anywhere
                dom.loaderContainer.innerHTML = '<p class="text-red-500">Firebase config is missing. Please create `config.js` and add your Firebase project keys.</p>';
                console.error("firebaseConfig is not defined. Check config.js.");
                return;
            }
        } else {
             // Use the global config from config.js
             app = initializeApp(firebaseConfig);
        }

        // Initialize services
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Set up the authentication listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                if (!userId) { // Only run this once
                    userId = user.uid;
                    await setupAllListeners(); // This will attach all the database listeners
                    dom.loaderContainer.style.display = 'none';
                    dom.appContent.classList.remove('invisible');
                }
            } else {
                // User is signed out. Attempt to sign them in.
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    // We are in the preview environment
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    // We are on the live deployed site
                    await signInAnonymously(auth);
                }
            }
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        dom.loaderContainer.innerHTML = `<p class="text-red-500">Could not connect to database. Check: <br>1. Firebase config is correct. <br>2. Anonymous Auth is enabled. <br>3. Firestore Rules are set. <br>4. Authorized Domain is added.</p>`;
    }
}

async function setupAllListeners() {
    if (!userId) return;
    const collectionPath = (name) => `/artifacts/${appId}/users/${userId}/${name}`;
    
    // --- Database Snapshots ---
    onSnapshot(query(collection(db, collectionPath('meals')), orderBy("date", "desc")), (snap) => {
        foodLog = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() }));
        renderAllMeals(foodLog);
        updateCalorieTracker();
    });
    onSnapshot(query(collection(db, collectionPath('activities')), orderBy("date", "desc")), (snap) => {
        activityLog = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() }));
        renderAllActivities(activityLog);
    });
    onSnapshot(query(collection(db, collectionPath('symptoms')), orderBy("date", "desc")), (snap) => {
        symptomLog = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() }));
        renderAllSymptoms(symptomLog);
    });
    onSnapshot(doc(db, `${collectionPath('profile')}/userProfile`), (snap) => {
        const data = snap.data() || {};
        userProfile = { ...userProfile, ...data };
        if (data.photoURL) {
            dom.profilePic.img.src = data.photoURL;
            dom.profilePic.placeholder.classList.add('hidden');
        } else {
            dom.profilePic.img.src = '';
            dom.profilePic.placeholder.classList.remove('hidden');
        }
        if(data.monitoringPrefs) {
            Object.keys(metricLabels).forEach(key => {
                if (typeof data.monitoringPrefs[key] === 'undefined') data.monitoringPrefs[key] = true;
            });
            userProfile.monitoringPrefs = data.monitoringPrefs;
        }
        healthGoals.calories = userProfile.calorieGoal || 2200;
        renderSettings();
        updateBmiAndCaloriesDisplay();
        updateGreeting();
        updateCalorieTracker();
    });
    
    showHealthTip();
    
    // --- Event Listeners ---
    dom.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            dom.tabs.forEach(t => {
                t.classList.remove('bg-blue-600', 'text-white', 'shadow');
                t.classList.add('text-slate-500');
            });
            tab.classList.add('bg-blue-600', 'text-white', 'shadow');
            tab.classList.remove('text-slate-500');
            
            dom.panels.forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tab.id.split('-')[1]}`).classList.remove('hidden');
        });
    });

    dom.logTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            dom.logTabs.forEach(t => {
                t.classList.remove('bg-blue-600', 'text-white', 'shadow');
                t.classList.add('text-slate-500');
            });
            tab.classList.add('bg-blue-600', 'text-white', 'shadow');
            tab.classList.remove('text-slate-500');
            
            Object.values(dom.logPanels).forEach(p => p.classList.add('hidden'));
            const panelId = tab.id.split('-')[2];
            dom.logPanels[panelId].classList.remove('hidden');
        });
    });
    
    dom.profilePic.input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            dom.profilePic.img.src = base64;
            dom.profilePic.placeholder.classList.add('hidden');
            await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/userProfile`), { photoURL: base64 }, { merge: true });
        };
        reader.readAsDataURL(file);
    });

    dom.photoLog.input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                currentPhotoBase64 = dataUrl.split(',')[1];
                dom.photoLog.input.dataset.mimeType = dataUrl.split(';')[0].split(':')[1];
                dom.photoLog.fileName.textContent = file.name;
                dom.photoLog.button.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    dom.photoLog.button.addEventListener('click', async () => {
        const mimeType = dom.photoLog.input.dataset.mimeType;
        if (!currentPhotoBase64 || !mimeType) return;
        dom.photoLog.uploader.classList.add('hidden');
        dom.photoLog.loader.classList.remove('hidden');
        try {
            const foodText = await getFoodFromImage(currentPhotoBase64, mimeType);
            
            // **DEBUGGING LOG**
            console.log("Gemini API Response:", foodText); 
            
            dom.manualLog.input.value = foodText;
            dom.tabs.forEach(t => t.id === 'tab-manual' ? t.click() : null);
            await handleLogEntry();
        } catch (error) {
            console.error('Photo analysis error:', error);
            dom.manualLog.input.value = "Couldn't identify food. Please log manually.";
            dom.tabs.forEach(t => t.id === 'tab-manual' ? t.click() : null);
        } finally {
            dom.photoLog.uploader.classList.remove('hidden');
            dom.photoLog.loader.classList.add('hidden');
            dom.photoLog.button.disabled = true;
            dom.photoLog.fileName.textContent = 'Tap to upload a photo';
            currentPhotoBase64 = null;
            dom.photoLog.input.value = '';
        }
    });

    dom.manualLog.button.addEventListener('click', handleLogEntry);
    dom.manualLog.confirmLogButton.addEventListener('click', saveMeal);
    dom.manualLog.cancelLogButton.addEventListener('click', () => {
        dom.manualLog.confirmationPanel.classList.add('hidden');
        currentEditInfo = { id: null, type: null };
    });
    
    dom.activityLog.button.addEventListener('click', async () => {
        const text = dom.activityLog.input.value.trim();
        if (text) { await addData('activities', { date: new Date(), description: text }); dom.activityLog.input.value = ''; }
    });

    dom.summaries.closeBtn.addEventListener('click', closeModal);
    dom.summaries.dailyBtn.addEventListener('click', showDailySummary);
    dom.summaries.weeklyBtn.addEventListener('click', showWeeklySummary);

    dom.symptom.logBtn.addEventListener('click', () => openSymptomModal());
    dom.symptom.cancelBtn.addEventListener('click', closeSymptomModal);
    dom.symptom.severity.addEventListener('input', (e) => dom.symptom.severityValue.textContent = e.target.value);
    dom.symptom.saveBtn.addEventListener('click', async () => {
        const description = dom.symptom.description.value.trim();
        if (!description) return;
        const data = { description, severity: dom.symptom.severity.value };
        if (currentEditInfo.id) { await updateData('symptoms', currentEditInfo.id, data); } 
        else { data.date = new Date(); await addData('symptoms', data); }
        closeSymptomModal();
    });

    dom.activityEdit.cancelBtn.addEventListener('click', closeActivityEditModal);
    dom.activityEdit.saveBtn.addEventListener('click', async () => {
        const description = dom.activityEdit.description.value.trim();
        if (description && currentEditInfo.id) { await updateData('activities', currentEditInfo.id, { description }); }
        closeActivityEditModal();
    });
    
    dom.settings.button.addEventListener('click', openSettingsModal);
    dom.settings.closeButton.addEventListener('click', closeSettingsModal);

    [dom.settings.profileTab, dom.settings.monitoringTab].forEach(tab => {
        tab.addEventListener('click', () => {
            const isProfile = tab.id === 'settings-tab-profile';
            dom.settings.profileTab.classList.toggle('bg-white', isProfile);
            dom.settings.profileTab.classList.toggle('text-blue-600', isProfile);
            dom.settings.profileTab.classList.toggle('shadow', isProfile);
            dom.settings.profileTab.classList.toggle('text-slate-500', !isProfile);

            dom.settings.monitoringTab.classList.toggle('bg-white', !isProfile);
            dom.settings.monitoringTab.classList.toggle('text-blue-600', !isProfile);
            dom.settings.monitoringTab.classList.toggle('shadow', !isProfile);
            dom.settings.monitoringTab.classList.toggle('text-slate-500', isProfile);

            dom.settings.profilePanel.classList.toggle('hidden', !isProfile);
            dom.settings.monitoringPanel.classList.toggle('hidden', isProfile);
        });
    });

    ['height-ft', 'height-in', 'weight-lbs', 'calorie-goal', 'name-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', saveBodyMetrics);
            if(id !== 'name-input') el.addEventListener('input', updateBmiAndCaloriesDisplay);
        }
    });

    document.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.classList.contains('edit-meal-btn')) { const meal = foodLog.find(m => m.id === target.dataset.id); if (meal) { currentEditInfo = { id: meal.id, type: 'meal' }; openMealConfirmationPanel(meal.items, meal.mealType, "Edit Meal", "Save Changes"); dom.manualLog.confirmationPanel.scrollIntoView({ behavior: 'smooth' }); }} 
        else if (target.classList.contains('edit-activity-btn')) { const activity = activityLog.find(a => a.id === target.dataset.id); if (activity) openActivityEditModal(activity); } 
        else if (target.classList.contains('edit-symptom-btn')) { const symptom = symptomLog.find(s => s.id === target.dataset.id); if (symptom) openSymptomModal(symptom); }
    });

    dom.manualLog.input.addEventListener('input', () => {
        const text = dom.manualLog.input.value;
        const lastWord = text.split(/,?\s+/).pop().toLowerCase();
        
        if (lastWord.length < 2) {
            dom.manualLog.autocompleteList.classList.add('hidden');
            return;
        }

        const suggestions = Object.keys(foodDatabase)
            .filter(key => foodDatabase[key].keywords.some(kw => kw.toLowerCase().includes(lastWord)))
            .slice(0, 5);
        
        if (suggestions.length > 0) {
            dom.manualLog.autocompleteList.innerHTML = suggestions.map(key => {
                const name = key.replace(/\b\w/g, l => l.toUpperCase());
                return `<div class="p-2 hover:bg-slate-100 cursor-pointer" data-food-name="${name}">${name}</div>`
            }).join('');
            dom.manualLog.autocompleteList.classList.remove('hidden');
        } else {
            dom.manualLog.autocompleteList.classList.add('hidden');
        }
    });

    dom.manualLog.autocompleteList.addEventListener('click', (e) => {
        if(e.target.dataset.foodName) {
            const currentText = dom.manualLog.input.value;
            const words = currentText.split(/,?\s+/);
            words.pop(); // remove the partial word
            const newText = words.join(', ') + (words.length > 0 ? ', ' : '') + e.target.dataset.foodName + ', ';
            dom.manualLog.input.value = newText;
            dom.manualLog.autocompleteList.classList.add('hidden');
            dom.manualLog.input.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dom.manualLog.input.contains(e.target) && !dom.manualLog.autocompleteList.contains(e.target)) {
            dom.manualLog.autocompleteList.classList.add('hidden');
        }
    });

    // **FIX:** Moved speech recognition setup inside the `if` block
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            dom.manualLog.micButton.classList.add('bg-red-500', 'text-white');
            dom.manualLog.micText.textContent = 'Listening...';
        };

        recognition.onend = () => {
            isListening = false;
            dom.manualLog.micButton.classList.remove('bg-red-500', 'text-white');
            dom.manualLog.micText.textContent = 'Listen';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isListening = false;
            dom.manualLog.micButton.classList.remove('bg-red-500', 'text-white');
            dom.manualLog.micText.textContent = 'Listen';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            dom.manualLog.input.value = transcript;
        };

        dom.manualLog.micButton.addEventListener('click', () => {
            if (!isListening) {
                recognition.start();
            } else {
                recognition.stop();
            }
        });

    } else {
        dom.manualLog.micButton.disabled = true;
        dom.manualLog.micText.textContent = 'N/A';
    }
    
    // --- Pantry Scanner Listeners ---
    dom.pantryLog.input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                currentPhotoBase64 = dataUrl.split(',')[1];
                dom.pantryLog.input.dataset.mimeType = dataUrl.split(';')[0].split(':')[1];
                dom.pantryLog.fileName.textContent = file.name;
                dom.pantryLog.button.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    dom.pantryLog.button.addEventListener('click', async () => {
        const mimeType = dom.pantryLog.input.dataset.mimeType;
        if (!currentPhotoBase64 || !mimeType) return;
        dom.pantryLog.uploader.classList.add('hidden');
        dom.pantryLog.loader.classList.remove('hidden');
        try {
            const nutritionText = await analyzeNutritionLabel(currentPhotoBase64, mimeType);
            showPantryScanResults(nutritionText);
        } catch (error) {
            console.error('Pantry analysis error:', error);
            showPantryScanResults("<p class='text-red-500'>Could not analyze the label. Please try again with a clearer image.</p>");
        } finally {
            dom.pantryLog.uploader.classList.remove('hidden');
            dom.pantryLog.loader.classList.add('hidden');
            dom.pantryLog.button.disabled = true;
            dom.pantryLog.fileName.textContent = 'Tap to scan a nutrition label';
            currentPhotoBase64 = null;
            dom.pantryLog.input.value = '';
        }
    });
    
    // --- Modal Close Listeners ---
    dom.highRiskAlert.closeBtn.addEventListener('click', () => dom.highRiskAlert.modal.classList.add('hidden'));
    dom.pantryScanResults.closeBtn.addEventListener('click', () => dom.pantryScanResults.modal.classList.add('hidden'));
}

// --- GEMINI API FUNCTIONS ---
async function getFoodFromImage(base64ImageData, mimeType) {
    // **FIX:** Use the geminiApiKey variable from config.js
    // Fallback to environment key if not provided (for preview)
    let apiKey = (typeof geminiApiKey !== 'undefined' && geminiApiKey !== "YOUR_GEMINI_API_KEY") 
                 ? geminiApiKey 
                 : (typeof __google_api_key !== 'undefined' ? __google_api_key : "");
    
    if ((!apiKey || apiKey === "YOUR_GEMINI_API_KEY") && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY" && (typeof __google_api_key == 'undefined' || !__google_api_key)) {
         // Try to get the key from the Firebase config as a last resort IF gemini key is not set
        apiKey = firebaseConfig.apiKey;
    }

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey === "YOUR_API_KEY") {
        throw new Error("API key is missing. Please add your Gemini API key to the `geminiApiKey` variable in config.js.");
    }

    // **FIX:** Using the correct, stable model for this task
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: "You are a nutritional analyst. Your task is to identify all food items in this image. List them as a simple comma-separated string, e.g., 'sirloin steak, mashed potatoes, spinach, roti, dal'." }, { inlineData: { mimeType, data: base64ImageData } }] }] };
    
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        console.error('API Response Error:', await response.text());
        throw new Error(`API error ${response.status}`);
    }
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.error("No text returned from API. Full response:", result);
        throw new Error("Could not extract text from response.");
    }
    return text.trim();
}

async function analyzeNutritionLabel(base64ImageData, mimeType) {
    // **FIX:** Use the geminiApiKey variable from config.js
    // Fallback to environment key if not provided (for preview)
    let apiKey = (typeof geminiApiKey !== 'undefined' && geminiApiKey !== "YOUR_GEMINI_API_KEY") 
                 ? geminiApiKey 
                 : (typeof __google_api_key !== 'undefined' ? __google_api_key : "");
    
    if ((!apiKey || apiKey === "YOUR_GEMINI_API_KEY") && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY" && (typeof __google_api_key == 'undefined' || !__google_api_key)) {
         // Try to get the key from the Firebase config as a last resort IF gemini key is not set
        apiKey = firebaseConfig.apiKey;
    }

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey === "YOUR_API_KEY") {
        throw new Error("API key is missing. Please add your Gemini API key to the `geminiApiKey` variable in config.js.");
    }

    // **FIX:** Using the correct, stable model for this task
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{
            parts: [
                { text: "You are a nutritional analyst. Transcribe the nutrition label in this image. Focus only on Calories, Sodium, Saturated Fat, and Total Sugars. Provide the value and percent daily value (%) for each. If a value is not present, mark it as N/A. Then, provide a brief one-sentence health summary about this product for someone monitoring blood pressure, cholesterol, and gout." },
                { inlineData: { mimeType, data: base64ImageData } }
            ]
        }]
    };
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        console.error('API Response Error:', await response.text());
        throw new Error(`API error ${response.status}`);
    }
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.error("No text returned from API. Full response:", result);
        throw new Error("Could not extract text from response.");
    }
    return text;
}


// --- MODAL & UI FUNCTIONS ---
function showPantryScanResults(analysisText) {
    // Simple text formatting for the modal
    const formattedText = analysisText
        .replace(/Calories:? ([\d,]+)/g, '<p><strong>Calories:</strong> <span class="font-bold text-blue-600">$1</span></p>')
        .replace(/Sodium:? ([\d,]+mg(?: ?\([\d,]+%\))?)/g, '<p><strong>Sodium:</strong> <span class="font-bold text-red-600">$1</span></p>')
        .replace(/Saturated Fat:? ([\d,]+g(?: ?\([\d,]+%\))?)/g, '<p><strong>Saturated Fat:</strong> <span class="font-bold text-red-600">$1</span></p>')
        .replace(/Total Sugars:? ([\d,]+g)/g, '<p><strong>Total Sugars:</strong> <span class="font-bold text-amber-600">$1</span></p>')
        .replace(/Health Summary:?/g, '<p class="mt-4 pt-4 border-t border-slate-200 font-semibold">Health Summary:</p>');

    dom.pantryScanResults.content.innerHTML = `<div class="space-y-2 text-slate-700">${formattedText}</div>`;
    dom.pantryScanResults.modal.classList.add('flex');
    dom.pantryScanResults.modal.classList.remove('hidden');
}

function showHighRiskAlert(content) {
    dom.highRiskAlert.content.innerHTML = content;
    dom.highRiskAlert.modal.classList.add('flex');
    dom.highRiskAlert.modal.classList.remove('hidden');
}

function openModal(content) { 
    dom.summaries.content.innerHTML = content; 
    dom.summaries.modal.classList.add('flex'); 
    dom.summaries.modal.classList.remove('hidden');
}
function closeModal() { 
    dom.summaries.modal.classList.remove('flex'); 
    dom.summaries.modal.classList.add('hidden');
}

function openSymptomModal(symptom = null) {
    currentEditInfo = { id: symptom ? symptom.id : null, type: 'symptom' };
    dom.symptom.title.textContent = symptom ? 'Edit Symptom' : 'Log a Symptom';
    dom.symptom.saveBtn.textContent = symptom ? 'Save Changes' : 'Save Symptom';
    dom.symptom.description.value = symptom ? symptom.description : '';
    dom.symptom.severity.value = symptom ? symptom.severity : 5;
    dom.symptom.severityValue.textContent = symptom ? symptom.severity : 5;
    dom.symptom.modal.classList.add('flex'); 
    dom.symptom.modal.classList.remove('hidden');
}
const closeSymptomModal = () => { dom.symptom.modal.classList.remove('flex'); dom.symptom.modal.classList.add('hidden'); currentEditInfo = { id: null, type: null }; };

function openActivityEditModal(activity) {
    currentEditInfo = { id: activity.id, type: 'activity' };
    dom.activityEdit.description.value = activity.description;
    dom.activityEdit.modal.classList.add('flex'); 
    dom.activityEdit.modal.classList.remove('hidden');
}
const closeActivityEditModal = () => { dom.activityEdit.modal.classList.remove('flex'); dom.activityEdit.modal.classList.add('hidden'); currentEditInfo = { id: null, type: null }; };

// --- Settings Modal ---
const openSettingsModal = () => { dom.settings.modal.classList.add('flex'); dom.settings.modal.classList.remove('hidden'); };
const closeSettingsModal = () => { dom.settings.modal.classList.remove('flex'); dom.settings.modal.classList.add('hidden'); };

function updateBmiAndCaloriesDisplay() {
    const ft = parseFloat(dom.settings.heightFt.value) || 0;
    const inches = parseFloat(dom.settings.heightIn.value) || 0;
    const weight = parseFloat(dom.settings.weightLbs.value) || 0;
    const totalInches = (ft * 12) + inches;

    if (weight > 0 && totalInches > 0) {
        const bmi = (weight / (totalInches * totalInches)) * 703;
        dom.settings.bmiValue.textContent = bmi.toFixed(1);

        const weightKg = weight / 2.20462;
        const heightCm = totalInches * 2.54;
        const age = 56; // Example age, you could add this to profile
        const bmr = 66.5 + (13.75 * weightKg) + (5.003 * heightCm) - (6.75 * age);
        const recommended = Math.round(bmr * 1.375); // Assume lightly active
        dom.settings.recommendedCalories.textContent = `${recommended}`;
    } else {
        dom.settings.bmiValue.textContent = '--.-';
        dom.settings.recommendedCalories.textContent = '----';
    }
}

function saveBodyMetrics() {
    const data = {
        heightFt: parseFloat(dom.settings.heightFt.value) || null,
        heightIn: parseFloat(dom.settings.heightIn.value) || null,
        weightLbs: parseFloat(dom.settings.weightLbs.value) || null,
        calorieGoal: parseInt(dom.settings.calorieGoal.value) || 2200,
        name: dom.settings.nameInput.value || '',
    };
    saveProfileData(data);
}

function renderSettings() {
    dom.settings.nameInput.value = userProfile.name || '';
    dom.settings.heightFt.value = userProfile.heightFt || '';
    dom.settings.heightIn.value = userProfile.heightIn || '';
    dom.settings.weightLbs.value = userProfile.weightLbs || '';
    dom.settings.calorieGoal.value = userProfile.calorieGoal || 2200;
    
    dom.settings.options.innerHTML = Object.keys(metricLabels).map(key => `
        <label for="toggle-${key}" class="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-200">
            <span class="font-semibold text-slate-700 text-sm">${metricLabels[key]}</span>
            <div class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="toggle-${key}" class="sr-only toggle-checkbox" data-key="${key}" ${userProfile.monitoringPrefs[key] ? 'checked' : ''}>
                <div class="w-11 h-6 bg-slate-200 rounded-full toggle-label transition-colors ease-in-out duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform after:duration-200"></div>
            </div>
        </label>
    `).join('');
    
    dom.settings.options.querySelectorAll('.toggle-checkbox').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const key = e.target.dataset.key;
            userProfile.monitoringPrefs[key] = e.target.checked;
            await saveProfileData({ monitoringPrefs: userProfile.monitoringPrefs });
        });
    });
    updateBmiAndCaloriesDisplay();
    updateGreeting();
    updateCalorieTracker();
}

// --- UI Updates ---
function updateGreeting() {
    if(userProfile.name) {
        dom.greeting.textContent = `Hi, ${userProfile.name}!`;
    } else {
        dom.greeting.textContent = 'My Daily Journal';
    }
}

function updateCalorieTracker() {
    const goal = userProfile.calorieGoal || 2200;
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const todaysMeals = foodLog.filter(meal => meal.date >= startOfToday);
    const eaten = todaysMeals.reduce((sum, meal) => sum + (meal.totals.cal || 0), 0);
    const left = goal - eaten;

    dom.calorieTracker.goal.textContent = goal;
    dom.calorieTracker.eaten.textContent = eaten.toFixed(0);
    dom.calorieTracker.left.textContent = left.toFixed(0);

    dom.calorieTracker.eaten.classList.toggle('text-red-600', eaten > goal);
    dom.calorieTracker.eaten.classList.toggle('text-green-600', eaten <= goal);
}

function showHealthTip() {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const tip = healthTips[dayOfYear % healthTips.length];
    dom.motivation.innerHTML = `
        <div class="flex items-center justify-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <h3 class="font-bold text-lg text-slate-800">Health Tip of the Day</h3>
        </div>
        <p class="text-slate-600 text-sm">"${tip}"</p>
    `;
}

// --- DATABASE FUNCTIONS ---
function addData(collectionName, data) {
    return addDoc(collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`), data);
}

function updateData(collectionName, id, data) {
    return updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/${collectionName}`, id), data);
}

function saveProfileData(data) {
    return setDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile/userProfile`), data, { merge: true });
}

// --- LOGIC FUNCTIONS ---
const handleLogEntry = async () => {
    const text = dom.manualLog.input.value.trim();
    if (!text) return;
    const parsedItems = parseInput(text);
    
    // **DEBUGGING LOG**
    console.log("Parsed items:", parsedItems);

    if (parsedItems.length === 0) {
        dom.manualLog.input.value = "Sorry, couldn't recognize that food. Try being more specific.";
        return;
    }
    openMealConfirmationPanel(parsedItems);
};

function openMealConfirmationPanel(items, mealType, title = "Adjust Quantities & Log", buttonText = "Log Meal") {
     dom.manualLog.title.textContent = title;
     dom.manualLog.confirmLogButton.textContent = buttonText;
     
     let typeToSelect = mealType;
     if (!typeToSelect) {
        const hour = new Date().getHours();
        if (hour < 11) typeToSelect = 'Breakfast';
        else if (hour < 16) typeToSelect = 'Lunch';
        else if (hour < 21) typeToSelect = 'Dinner';
        else typeToSelect = 'Snack';
     }

     dom.manualLog.mealTypeSelector.querySelectorAll('.meal-type-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('border-slate-300', 'text-slate-600');
        if (btn.dataset.mealType === typeToSelect) {
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('border-slate-300', 'text-slate-600');
        }
    });

     dom.manualLog.confirmationItemsContainer.innerHTML = items.map(item => {
        const dbEntry = foodDatabase[item.dbKey] || {};
        const name = (item.name || 'Unknown').replace(/\b\w/g, l => l.toUpperCase());
        const unit = dbEntry.unit || 'serving';
        const portion = item.portion || 1;
        return `<div class="flex items-center gap-2">
            <p class="flex-1 font-medium text-sm">${name}</p>
            <input type="number" value="${portion}" step="0.1" class="quantity-input w-20 p-2 border border-slate-300 rounded-md text-center" data-dbkey="${item.dbKey}" data-name="${item.name}">
            <span class="text-sm text-slate-600">${unit}</span>
        </div>`;
    }).join('');
    dom.manualLog.confirmationPanel.classList.remove('hidden');
}

const saveMeal = async () => {
    const confirmedItems = Array.from(dom.manualLog.confirmationItemsContainer.querySelectorAll('.quantity-input')).map(input => ({
        name: input.dataset.name, portion: parseFloat(input.value) || 1, dbKey: input.dataset.dbkey
    }));
    const selectedBtn = dom.manualLog.mealTypeSelector.querySelector('.bg-blue-600');
    const mealType = selectedBtn ? selectedBtn.dataset.mealType : 'Meal';
    
    const items = confirmedItems.map(analyzeFood);
    const totals = items.reduce((acc, i) => { Object.keys(acc).forEach(key => acc[key] += i.estimates[key] || 0); return acc; }, 
        { cal: 0, na: 0, sat_fat: 0, added_sugar: 0, fiber: 0, alcohol: 0, protein: 0, potassium: 0, fat: 0 });
    ['sat_fat', 'fiber', 'fat', 'protein'].forEach(k => totals[k] = parseFloat(totals[k].toFixed(1)));
    const purineSummary = items.reduce((acc, i) => { if (i.estimates.purine === 'High') acc.high++; else if (i.estimates.purine === 'Moderate') acc.moderate++; return acc; }, { high: 0, moderate: 0 });
    const signals = items.map(i => i.signals);
    const priority = { 'Red': 3, 'Yellow': 2, 'Green': 1 };
    const getWorst = (type) => signals.reduce((worst, s) => priority[s[type].color] > priority[worst.color] ? s[type] : worst, {color: 'Green', r: 'Low risk'});
    const mealData = { date: currentEditInfo.id ? foodLog.find(m => m.id === currentEditInfo.id).date : new Date(), items, totals, purineSummary, mealType, overallSignals: { bp: getWorst('bp'), cholesterol: getWorst('cholesterol'), uric_acid: getWorst('uric_acid') } };
    
    if (currentEditInfo.id) {
        await updateData('meals', currentEditInfo.id, mealData);
    } else {
        await addData('meals', mealData);
    }
    
    dom.manualLog.input.value = '';
    dom.manualLog.confirmationPanel.classList.add('hidden');
    currentEditInfo = { id: null, type: null };
    
    const highRiskSignals = Object.entries(mealData.overallSignals).filter(([key, value]) => value.color === 'Red');
    if (highRiskSignals.length > 0) {
        const alertContent = highRiskSignals.map(([key, value]) => {
            const reason = key === 'bp' ? 'high sodium' : key === 'cholesterol' ? 'high saturated fat' : 'high purine/alcohol';
            return `<p>This meal was flagged for <strong class="text-red-600">${metricLabels[key]} risk</strong> due to ${reason}.</p>`;
        }).join('');
        showHighRiskAlert(alertContent);
    }
};

function convertWordsToNumbers(text) {
    const words = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'a': 1, 'an': 1 };
    return text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\b/gi, (match) => words[match.toLowerCase()]);
}

// **FIX:** This function is now more robust to find all items.
function parseInput(text) {
    let remainingText = convertWordsToNumbers(text.toLowerCase().replace(/,/g, ' '));
    const foundItems = [];
    const allKeywords = Object.keys(foodDatabase).flatMap(key => foodDatabase[key].keywords.map(kw => ({ keyword: kw, dbKey: key }))).sort((a, b) => b.keyword.length - a.keyword.length);
    
    let somethingFound = true;
    while(somethingFound && remainingText.trim().length > 0) {
        somethingFound = false;
        for (const { keyword, dbKey } of allKeywords) {
            // This regex finds the keyword with an optional number and unit *before* it.
            const regex = new RegExp(`(\\d*\\.?\\d*)\\s*(?:servings?|cups?|oz|tbsp|slices?|large|medium|glass|pieces?)?\\s*(${keyword}s?)\\b`, 'i');
            const match = remainingText.match(regex);

            if (match) {
                foundItems.push({ 
                    name: dbKey, 
                    portion: (match[1] && parseFloat(match[1])) || 1, 
                    dbKey: dbKey 
                });
                
                // Replace the matched text with a space to prevent re-matching
                remainingText = remainingText.replace(match[0], ' ');
                somethingFound = true;
                break; // Restart the for-loop to prioritize longest matches
            }
        }
    }
    return foundItems;
}


function analyzeFood(item) {
    const dbEntry = foodDatabase[item.dbKey];
    const est = { cal: 0, na: 0, sat_fat: 0, added_sugar: 0, fiber: 0, purine: 'Low', alcohol: 0, protein: 0, potassium: 0, fat: 0, swap: 'N/A' };
    if (dbEntry) {
        Object.keys(est).forEach(key => {
            if (dbEntry[key] !== undefined) {
                if (typeof dbEntry[key] === 'number') {
                    est[key] = dbEntry[key] * item.portion;
                } else {
                    est[key] = dbEntry[key];
                }
            }
        });
    }
    const name = (item.name || 'Unknown').replace(/\b\w/g, l => l.toUpperCase());
    const unit = dbEntry ? dbEntry.unit : 'serving';
    return { name: `${name}`, portion: item.portion, dbKey: item.dbKey, displayName: `${name} (${item.portion} ${unit}${item.portion > 1 ? 's' : ''})`, estimates: est, signals: getSignals(est) };
}

function getSignals(estimates) {
    const s = {};
    s.bp = estimates.na > 900 ? {c:'Red', r:`High sodium`} : estimates.na > 600 ? {c:'Yellow', r:`Mod. sodium`} : {c:'Green', r:'Low sodium'};
    s.cholesterol = estimates.sat_fat > 8 ? {c:'Red', r:`High sat fat`} : estimates.sat_fat > 4 ? {c:'Yellow', r:`Mod. sat fat`} : {c:'Green', r:'Low sat fat'};
    s.uric_acid = estimates.purine === 'High' || estimates.alcohol > 0 ? {c:'Red', r:`High purine/alcohol`} : estimates.purine === 'Moderate' ? {c:'Yellow', r:'Mod. purine'} : {c:'Green', r:'Low purine'};
    Object.values(s).forEach(sig => sig.color = sig.c);
    return s;
}

// --- RENDER FUNCTIONS ---
function renderAllMeals(meals) {
    dom.logPanels.meal.innerHTML = '';
    if (meals.length === 0) {
        dom.logPanels.meal.innerHTML = '<p class="text-center text-slate-500">No meals logged yet.</p>';
        return;
    }
    
    const mealsByDate = {};
    meals.forEach(meal => {
        const dateStr = meal.date.toDateString();
        if (!mealsByDate[dateStr]) {
            mealsByDate[dateStr] = { Breakfast: [], Lunch: [], Dinner: [], Snack: [] };
        }
        const mealType = meal.mealType || 'Snack';
        mealsByDate[dateStr][mealType].push(meal);
    });

    const sortedDates = Object.keys(mealsByDate).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(dateStr => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'bg-white rounded-lg shadow-md p-3';
        dateHeader.innerHTML = `<h2 class="text-xl font-bold text-slate-800 text-center">${new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>`;
        dom.logPanels.meal.appendChild(dateHeader);

        const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
        mealOrder.forEach(mealType => {
            const mealsForType = mealsByDate[dateStr][mealType];
            if (mealsForType && mealsForType.length > 0) {
                mealsForType.sort((a, b) => a.date - b.date);
                mealsForType.forEach(meal => {
                    dom.logPanels.meal.appendChild(createMealCard(meal));
                });
            }
        });
    });
}

function createMealCard(meal) {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 sm:p-5 rounded-2xl shadow-md';
    const priority = { 'Red': 3, 'Yellow': 2, 'Green': 1 };
    const worstSignal = [meal.overallSignals.bp, meal.overallSignals.cholesterol, meal.overallSignals.uric_acid].sort((a,b) => (priority[b.color] || 0) - (priority[a.color] || 0))[0];
    let purineText = 'Low';
    if (meal.purineSummary) {
        if (meal.purineSummary.high > 0) purineText = `<span class="font-bold text-red-600">${meal.purineSummary.high} High</span>${meal.purineSummary.moderate > 0 ? `, ${meal.purineSummary.moderate} Mod.` : ''}`;
        else if (meal.purineSummary.moderate > 0) purineText = `<span class="font-bold text-amber-600">${meal.purineSummary.moderate} Moderate</span>`;
    }
    const itemsHTML = meal.items.map(item => `
        <div class="bg-slate-100 p-3 rounded-lg mt-3">
            <p class="font-bold text-sm text-slate-800">${item.displayName}</p>
            <p class="text-xs text-slate-500 mt-1">~${item.estimates.cal.toFixed(0)} kcal | Na ${item.estimates.na.toFixed(0)} | Sat fat ${item.estimates.sat_fat.toFixed(1)} | Sug ${item.estimates.added_sugar.toFixed(0)} | Fib ${item.estimates.fiber.toFixed(1)} | Pur: ${item.estimates.purine}</p>
            <p class="text-xs text-blue-600 mt-2 font-medium"><strong>Swap:</strong> ${item.estimates.swap}</p>
        </div>`).join('');
    
    card.innerHTML = `<div class="flex justify-between items-start">
            <div>
                <h3 class="font-bold text-slate-900">${meal.mealType || 'Meal'}</h3>
                <p class="text-xs text-slate-500">${meal.date.toLocaleString()}</p>
            </div>
            <div class="flex items-center gap-3">
                <button class="edit-meal-btn text-xs font-semibold text-blue-600 hover:underline" data-id="${meal.id}">Edit</button>
                <span class="w-3.5 h-3.5 rounded-full bg-${(worstSignal.color || 'green').toLowerCase()}-500 flex-shrink-0"></span>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <p><strong class="text-slate-500">BP:</strong> <span class="font-semibold text-${meal.overallSignals.bp.color.toLowerCase()}-600">${meal.overallSignals.bp.color}</span></p>
            <p><strong class="text-slate-500">Cholesterol:</strong> <span class="font-semibold text-${meal.overallSignals.cholesterol.color.toLowerCase()}-600">${meal.overallSignals.cholesterol.color}</span></p>
            <p><strong class="text-slate-500">Uric Acid:</strong> <span class="font-semibold text-${meal.overallSignals.uric_acid.color.toLowerCase()}-600">${meal.overallSignals.uric_acid.color}</span></p>
            <p><strong class="text-slate-500">Purine Load:</strong> ${purineText}</p>
        </div>
        <div class="mt-4 pt-4 border-t border-slate-200">${itemsHTML}</div>`;
    return card;
}

const renderAllActivities = (activities) => {
    if (activities.length === 0) {
        dom.logPanels.activity.innerHTML = '<p class="text-center text-slate-500">No activities logged yet.</p>';
        return;
    }
    dom.logPanels.activity.innerHTML = activities.map(act => `<div class="bg-white p-4 rounded-xl shadow-md flex justify-between items-center"><div class="flex-1"><p class="font-semibold text-slate-800">${act.description}</p><p class="text-xs text-slate-500 mt-1">${act.date.toLocaleString()}</p></div><button class="edit-activity-btn text-xs font-semibold text-blue-600 hover:underline ml-4" data-id="${act.id}">Edit</button></div>`).join('');
}
const renderAllSymptoms = (symptoms) => {
    if (symptoms.length === 0) {
        dom.logPanels.symptom.innerHTML = '<p class="text-center text-slate-500">No symptoms logged yet.</p>';
        return;
    }
    dom.logPanels.symptom.innerHTML = symptoms.map(sym => `<div class="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg shadow-md"><div class="flex justify-between items-start"><div class="flex-1"><p class="font-semibold text-purple-800">${sym.description}</p><p class="text-xs text-purple-600 mt-1">${sym.date.toLocaleString()}</p></div><p class="font-bold text-purple-800 text-lg ml-4">${sym.severity}/10</p></div><div class="mt-3 pt-3 border-t border-purple-200 flex items-center justify-between"><button class="correlate-btn text-sm font-semibold text-blue-600 hover:underline" data-symptom-date="${sym.date.toISOString()}">See Food Log (4 Days)</button><button class="edit-symptom-btn text-xs font-semibold text-blue-600 hover:underline" data-id="${sym.id}">Edit</button></div></div>`).join('');
}
        
function showDailySummary() {
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const todaysMeals = foodLog.filter(meal => meal.date >= startOfToday);
    if (todaysMeals.length === 0) { openModal(`<h2 class="text-2xl font-bold mb-4">Daily Snapshot</h2><p>No meals logged today.</p>`); return; }
    const totals = todaysMeals.reduce((acc, meal) => { 
        Object.keys(acc).forEach(key => {
            if (key !== 'purine' && meal.totals[key]) acc[key] += meal.totals[key];
        });
        if (meal.purineSummary) { acc.purine.high += meal.purineSummary.high; acc.purine.moderate += meal.purineSummary.moderate; } return acc; }, { cal: 0, na: 0, sat_fat: 0, added_sugar: 0, drinks: 0, protein: 0, potassium: 0, fat: 0, fiber: 0, purine: { high: 0, moderate: 0 } });
    const verdicts = { bp: totals.na > healthGoals.sodium ? {c: 'Red', r: 'Sodium exceeded'} : {c: 'Green', r: 'Good sodium control'}, cholesterol: totals.sat_fat > healthGoals.sat_fat ? {c: 'Red', r: 'Sat fat exceeded'} : {c: 'Green', r: 'Good sat fat control'}, uric_acid: totals.purine.high > 0 || totals.drinks > 0 ? {c: 'Red', r: 'High purine/alcohol'} : {c: 'Green', r: 'Low purine day'}};
    
    let totalsHTML = '';
    if (userProfile.monitoringPrefs.calories) totalsHTML += `<p><strong>Calories:</strong> <span class="font-bold ${totals.cal > healthGoals.calories ? 'text-red-600' : 'text-green-600'}">${totals.cal.toFixed(0)}</span> / ${healthGoals.calories} kcal</p>`;
    if (userProfile.monitoringPrefs.sat_fat) totalsHTML += `<p><strong>Sat Fat:</strong> <span class="font-bold ${totals.sat_fat > healthGoals.sat_fat ? 'text-red-600' : 'text-green-600'}">${totals.sat_fat.toFixed(1)}</span> / ${healthGoals.sat_fat} g</p>`;
    if (userProfile.monitoringPrefs.sodium) totalsHTML += `<p><strong>Sodium:</strong> <span class="font-bold ${totals.na > healthGoals.sodium ? 'text-red-600' : 'text-green-600'}">${totals.na.toFixed(0)}</span> / ${healthGoals.sodium} mg</p>`;
    if (userProfile.monitoringPrefs.added_sugar) totalsHTML += `<p><strong>Added Sugar:</strong> <span class="font-bold ${totals.added_sugar > healthGoals.added_sugar ? 'text-red-600' : 'text-green-600'}">${totals.added_sugar.toFixed(0)}</span> / ${healthGoals.added_sugar} g</p>`;
    if (userProfile.monitoringPrefs.fat) totalsHTML += `<p><strong>Total Fat:</strong> <span class="font-bold ${totals.fat > healthGoals.fat ? 'text-red-600' : 'text-green-600'}">${totals.fat.toFixed(1)}</span> / ${healthGoals.fat} g</p>`;
    if (userProfile.monitoringPrefs.protein) totalsHTML += `<p><strong>Protein:</strong> <span class="font-bold ${totals.protein < healthGoals.protein ? 'text-amber-600' : 'text-green-600'}">${totals.protein.toFixed(1)}</span> / ${healthGoals.protein} g</p>`;
    if (userProfile.monitoringPrefs.fiber) totalsHTML += `<p><strong>Fiber:</strong> ${totals.fiber.toFixed(1)} g</p>`;
    if (userProfile.monitoringPrefs.potassium) totalsHTML += `<p><strong>Potassium:</strong> <span class_TEST="font-bold ${totals.potassium < healthGoals.potassium ? 'text-amber-600' : 'text-green-600'}">${totals.potassium.toFixed(0)}</span> / ${healthGoals.potassium} mg</p>`;
    
    let verdictsHTML = '';
    if (userProfile.monitoringPrefs.sodium) verdictsHTML += `<p><strong>BP (Sodium):</strong> <span class="font-bold text-${verdicts.bp.c.toLowerCase()}-600">${verdicts.bp.c}</span> - ${verdicts.bp.r}</p>`;
    if (userProfile.monitoringPrefs.sat_fat) verdictsHTML += `<p><strong>Cholesterol (Sat Fat):</strong> <span class="font-bold text-${verdicts.cholesterol.c.toLowerCase()}-600">${verdicts.cholesterol.c}</span> - ${verdicts.cholesterol.r}</p>`;
    if (userProfile.monitoringPrefs.purine || userProfile.monitoringPrefs.alcohol) verdictsHTML += `<p><strong>Uric Acid (Purine/Alc):</strong> <span class="font-bold text-${verdicts.uric_acid.c.toLowerCase()}-600">${verdicts.uric_acid.c}</span> - ${verdicts.uric_acid.r}</p>`;

    const allItems = todaysMeals.flatMap(m => m.items);
    const wins = allItems.filter(i => i.signals.bp.color === 'Green').slice(0, 2).map(i => `<li>${i.displayName}</li>`).join('');
    const fixes = allItems.filter(i => i.signals.bp.color === 'Red' || i.signals.cholesterol.color === 'Red' || i.signals.uric_acid.color === 'Red').slice(0, 2).map(i => `<li>${i.displayName}</li>`).join('');
    openModal(`<h2 class="text-2xl font-bold mb-4">Daily Snapshot — ${new Date().toLocaleDateString()}</h2><div class="bg-white p-4 rounded-xl shadow-md"><h3 class="font-bold text-lg mb-2">Daily Totals</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm">${totalsHTML}</div></div><div class="bg-white p-4 rounded-xl shadow-md mt-4"><h3 class="font-bold text-lg mb-2">Verdicts</h3>${verdictsHTML}</div>${(wins || fixes) ? `<div class="bg-white p-4 rounded-xl shadow-md mt-4 text-sm">${wins ? `<h3 class="font-bold text-lg mb-2 text-green-600">Wins</h3><ul class="list-disc pl-5">${wins}</ul>` : ''}${fixes ? `<h3 class="font-bold text-lg mt-4 mb-2 text-red-600">Fixes</h3><ul class="list-disc pl-5">${fixes}</ul>` : ''}</div>` : ''}`);
}

function showWeeklySummary() {
    const today = new Date();
    const sevenDaysAgo = new Date(new Date().setDate(today.getDate() - 6)); sevenDaysAgo.setHours(0,0,0,0);
    const thisWeekMeals = foodLog.filter(meal => meal.date >= sevenDaysAgo);
    if (thisWeekMeals.length === 0) { openModal(`<h2 class="text-2xl font-bold mb-4">Weekly Review</h2><p>Not enough data for a weekly review yet.</p>`); return; }
    const dailyData = Array.from({length: 7}, (_, i) => { const day = new Date(); day.setDate(today.getDate() - i); day.setHours(0,0,0,0); return { date: day, na:0, sat_fat:0, purine_high: 0, drinks: 0, cal: 0, added_sugar: 0 }; }).reverse();
    thisWeekMeals.forEach(meal => { const dayStr = new Date(meal.date.setHours(0,0,0,0)).toDateString(); const day = dailyData.find(d => d.date.toDateString() === dayStr); if (day) { Object.keys(day).forEach(key => day[key] += meal.totals[key] || (meal.purineSummary && meal.purineSummary[key]) || 0); }});
    const calendarHTML = dailyData.map(d => `<div class="bg-slate-200/60 p-2 rounded-lg text-center"><p class="text-xs font-bold text-slate-500">${d.date.toLocaleDateString('en-US', { weekday: 'short' })}</p><p class="font-bold text-lg mt-1">${d.cal.toFixed(0)}</p><p class="text-xs text-slate-400">kcal</p></div>`).join('');
    const numDaysWithMeals = new Set(thisWeekMeals.map(m => new Date(m.date.setHours(0,0,0,0)).toDateString())).size || 1;
    const avgNa = thisWeekMeals.reduce((s, m) => s + (m.totals.na || 0), 0) / numDaysWithMeals;
    const avgSugar = thisWeekMeals.reduce((s, m) => s + (m.totals.added_sugar || 0), 0) / numDaysWithMeals;
    
    let averagesHTML = '';
    if (userProfile.monitoringPrefs.sodium) averagesHTML += `<p><strong>Sodium:</strong> <span class="font-bold ${avgNa > healthGoals.sodium ? 'text-red-600' : 'text-green-600'}">${avgNa.toFixed(0)}</span> / ${healthGoals.sodium} mg</p>`;
    if (userProfile.monitoringPrefs.added_sugar) averagesHTML += `<p><strong>Added Sugar:</strong> <span class="font-bold ${avgSugar > healthGoals.added_sugar ? 'text-red-600' : 'text-green-600'}">${avgSugar.toFixed(0)}</span> / ${healthGoals.added_sugar} g</p>`;

    const redDays = dailyData.reduce((acc, day) => { if (day.na > healthGoals.sodium) acc.bp++; if (day.sat_fat > healthGoals.sat_fat) acc.cholesterol++; if (day.purine_high > 0 || day.drinks > 0) acc.uric_acid++; return acc; }, { bp: 0, cholesterol: 0, uric_acid: 0 });
    const topTriggers = Object.entries(thisWeekMeals.flatMap(m => m.items).filter(i => i.signals.bp.color === 'Red' || i.signals.cholesterol.color === 'Red').reduce((acc, i) => { const n = i.displayName.split(' (')[0]; acc[n] = (acc[n] || 0) + 1; return acc; }, {})).sort((a,b) => b[1] - a[1]).slice(0,3).map(([n, c]) => `<li>${n} (${c}x)</li>`).join('');
    openModal(`<h2 class="text-2xl font-bold mb-4">Weekly Review</h2><div class="bg-white p-4 rounded-xl shadow-md mb-4"><h3 class="font-bold text-lg mb-3">Calorie Intake</h3><div class="grid grid-cols-7 gap-2">${calendarHTML}</div></div><div class="bg-white p-4 rounded-xl shadow-md"><h3 class="font-bold text-lg mb-2">7-Day Averages</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">${averagesHTML}</div></div><div class="bg-white p-4 rounded-xl shadow-md mt-4"><h3 class="font-bold text-lg mb-2">Red Flag Days</h3><div class="grid grid-cols-3 gap-2 text-sm text-center"><div><p class="font-bold text-2xl text-red-500">${redDays.bp}</p><p>BP</p></div><div><p class="font-bold text-2xl text-red-500">${redDays.cholesterol}</p><p>Cholesterol</p></div><div><p class="font-bold text-2xl text-red-500">${redDays.uric_acid}</p><p>Uric Acid</p></div></div></div>${topTriggers ? `<div class="bg-white p-4 rounded-xl shadow-md mt-4"><h3 class="font-bold text-lg mb-2 text-red-600">Biggest Triggers</h3><ul class="list-disc pl-5 text-sm">${topTriggers}</ul></div>` : ''}<div class="bg-blue-100 text-blue-800 p-4 rounded-xl shadow-md mt-4"><h3 class="font-bold text-lg mb-2">Next Week Goals</h3><ul class="list-disc pl-5 text-sm"><li>Aim for sodium under ${healthGoals.sodium} mg on 5/7 days.</li><li>Swap one red meat meal for fish or chicken.</li></ul></div>`);
}

function showSymptomCorrelation(symptomDateStr) {
    const symptomDate = new Date(symptomDateStr); const fourDaysAgo = new Date(symptomDate); fourDaysAgo.setDate(symptomDate.getDate() - 4); fourDaysAgo.setHours(0, 0, 0, 0);
    const relevantMeals = foodLog.filter(meal => meal.date >= fourDaysAgo && meal.date < symptomDate).sort((a, b) => b.date - a.date);
    if (relevantMeals.length === 0) { openModal(`<h2 class="text-2xl font-bold mb-4">Food Correlation</h2><p>No meals were logged in the 4 days prior to this symptom.</p>`); return; }
    const triggerSummary = relevantMeals.reduce((acc, meal) => { acc.highPurine += meal.purineSummary.high || 0; acc.moderatePurine += meal.purineSummary.moderate || 0; acc.alcohol += meal.totals.alcohol || 0; return acc; }, { highPurine: 0, moderatePurine: 0, alcohol: 0 });
    const mealListHTML = relevantMeals.map(meal => `<div class="bg-white p-3 rounded-lg mt-3"><p class="font-semibold text-sm text-slate-800">${meal.date.toLocaleString()}</p><ul class="list-disc pl-5 mt-2 space-y-1">${meal.items.map(item => `<li class="text-sm text-slate-600 ${item.estimates.purine === 'High' || item.estimates.alcohol > 0 ? 'bg-red-100 text-red-800 font-bold' : item.estimates.purine === 'Moderate' ? 'bg-amber-100 text-amber-800' : ''} p-1 rounded">${item.displayName}</li>`).join('')}</ul></div>`).join('');
    openModal(`<h2 class="text-2xl font-bold mb-4">Food Correlation Report</h2><div class="bg-white p-4 rounded-xl shadow-md mb-4"><h3 class="font-bold text-lg mb-2">Potential Gout Triggers</h3><p class="text-sm">In the 4 days before your symptom, you consumed:</p><div class="grid grid-cols-3 gap-2 text-center mt-2"><div><p class="font-bold text-2xl text-red-500">${triggerSummary.highPurine}</p><p class="text-xs">High-Purine</p></div><div><p class="font-bold text-2xl text-amber-500">${triggerSummary.moderatePurine}</p><p class="text-xs">Mod-Purine</p></div><div><p class="font-bold text-2xl text-red-500">${triggerSummary.alcohol}</p><p class="text-xs">Alcohol</p></div></div></div><div><h3 class="font-bold text-lg mb-2">Meal History</h3><div class="max-h-64 overflow-y-auto">${mealListHTML}</div></div>`);
}

// --- INIT ---
// We wrap the initial setup in a DOMContentLoaded listener to ensure all HTML elements are loaded before the script tries to find them.
document.addEventListener('DOMContentLoaded', () => {
    // **FIX:** DOM elements are now bound *after* the document is loaded
    dom = {
        loaderContainer: document.getElementById('loader-container'),
        appContent: document.getElementById('app-content'),
        greeting: document.getElementById('greeting'),
        calorieTracker: {
            goal: document.getElementById('calorie-goal-display'),
            eaten: document.getElementById('calorie-eaten-display'),
            left: document.getElementById('calorie-left-display'),
        },
        profilePic: { img: document.getElementById('profile-pic-img'), placeholder: document.getElementById('profile-pic-placeholder'), input: document.getElementById('profile-pic-input') },
        tabs: document.querySelectorAll('.tab-btn'),
        panels: document.querySelectorAll('.tab-panel'),
        manualLog: { input: document.getElementById('food-input'), autocompleteList: document.getElementById('autocomplete-list'), button: document.getElementById('log-button'), micButton: document.getElementById('mic-button'), micText: document.getElementById('mic-text'), micIcon: document.getElementById('mic-icon'), confirmationPanel: document.getElementById('meal-confirmation-panel'), confirmationItemsContainer: document.getElementById('confirmation-items-container'), confirmLogButton: document.getElementById('confirm-log-button'), cancelLogButton: document.getElementById('cancel-log-button'), title: document.getElementById('meal-panel-title'), mealTypeSelector: document.getElementById('meal-type-selector') },
        photoLog: { uploader: document.getElementById('photo-uploader'), loader: document.getElementById('photo-loader-container'), input: document.getElementById('photo-input'), fileName: document.getElementById('file-name'), button: document.getElementById('analyze-photo-button') },
        pantryLog: { uploader: document.getElementById('pantry-uploader'), loader: document.getElementById('pantry-loader-container'), input: document.getElementById('pantry-photo-input'), fileName: document.getElementById('pantry-file-name'), button: document.getElementById('analyze-pantry-button') },
        activityLog: { input: document.getElementById('activity-input'), button: document.getElementById('log-activity-button'), container: document.getElementById('activity-log-container') },
        summaries: { dailyBtn: document.getElementById('daily-summary-button'), weeklyBtn: document.getElementById('weekly-summary-button'), modal: document.getElementById('summary-modal'), content: document.getElementById('summary-content'), closeBtn: document.getElementById('close-modal') },
        symptom: { logBtn: document.getElementById('log-symptom-button'), modal: document.getElementById('symptom-modal'), title: document.getElementById('symptom-modal-title'), description: document.getElementById('symptom-description'), severity: document.getElementById('symptom-severity'), severityValue: document.getElementById('severity-value'), saveBtn: document.getElementById('save-symptom-button'), cancelBtn: document.getElementById('cancel-symptom-button'), container: document.getElementById('symptom-log-container') },
        activityEdit: { modal: document.getElementById('activity-edit-modal'), description: document.getElementById('activity-edit-description'), saveBtn: document.getElementById('save-activity-edit-button'), cancelBtn: document.getElementById('cancel-activity-edit-button')},
        logTabs: document.querySelectorAll('.log-tab-btn'),
        logPanels: { meal: document.getElementById('log-container'), activity: document.getElementById('activity-log-container'), symptom: document.getElementById('symptom-log-container') },
        settings: { 
            button: document.getElementById('settings-button'), 
            modal: document.getElementById('settings-modal'), 
            options: document.getElementById('settings-options'), 
            closeButton: document.getElementById('close-settings-button'),
            nameInput: document.getElementById('name-input'),
            heightFt: document.getElementById('height-ft'),
            heightIn: document.getElementById('height-in'),
            weightLbs: document.getElementById('weight-lbs'),
            bmiValue: document.getElementById('bmi-value'),
            calorieGoal: document.getElementById('calorie-goal'),
            recommendedCalories: document.getElementById('recommended-calories'),
            profileTab: document.getElementById('settings-tab-profile'),
            monitoringTab: document.getElementById('settings-tab-monitoring'),
            profilePanel: document.getElementById('settings-panel-profile'),
            monitoringPanel: document.getElementById('settings-panel-monitoring'),
        },
        motivation: document.getElementById('daily-motivation'),
        highRiskAlert: { modal: document.getElementById('high-risk-alert-modal'), content: document.getElementById('high-risk-alert-content'), closeBtn: document.getElementById('close-high-risk-alert') },
        pantryScanResults: { modal: document.getElementById('pantry-scan-results-modal'), content: document.getElementById('pantry-scan-results-content'), closeBtn: document.getElementById('close-pantry-scan-results') },
    };
    
    setupFirebase();
});

