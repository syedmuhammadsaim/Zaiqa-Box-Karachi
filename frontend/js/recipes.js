/**
 * ZaiqaBox Karachi - Free Homestyle Healthy Recipes
 * Empowering clients to prepare healthy, nutritionist-reviewed meals at home.
 */

const RECIPE_DATA = {
  "Monday": {
    day: "Monday",
    title: "Chicken Tikka Rice Bowl",
    tagline: "High-Protein • Low-Oil • Pan-Grilled Charred Flavors",
    image: "assets/menu/monday_tikka_bowl.jpg",
    prepTime: "15 mins",
    cookTime: "20 mins",
    serves: "1 - 2 Persons",
    calories: "520 kcal",
    protein: "32g",
    carbs: "54g",
    fat: "14g",
    description: "Lean skinless chicken breast marinated in hung yogurt, lemon juice, and freshly ground tikka spices, pan-grilled with minimal cold-pressed oil, served over steamed aromatic basmati with crisp kachumber and mint raita.",
    ingredients: [
      "Skinless Chicken Breast: 250g (cut into 1-inch bite-sized cubes)",
      "Low-Fat Plain Yogurt / Dahi: 2 tablespoons (whipped)",
      "Ginger & Garlic Paste: 1 teaspoon fresh",
      "Lemon Juice: 1 tablespoon fresh lime",
      "Kashmiri Red Chili Powder: 1 teaspoon (for rich color without burning heat)",
      "Roasted Cumin Powder (Bhuna Zeera): 1/2 teaspoon",
      "Garam Masala Powder: 1/4 teaspoon",
      "Cold-Pressed Mustard Oil or Olive Oil: 1 teaspoon (for brushing tawa)",
      "Himalayan Pink Salt: 1/2 teaspoon or to taste",
      "Steamed Basmati Rice: 1 cup cooked (with whole cardamom)",
      "Kachumber Salad: Diced cucumber, firm red tomatoes & red onion rings",
      "Cooling Mint Raita: 3 tbsp yogurt with crushed fresh mint & green chili"
    ],
    steps: [
      "1. Chicken Marination: Ek bowl me chicken cubes, dahi, lehsan-adrak paste, lemon juice, Kashmiri laal mirch, bhuna zeera, garam masala aur pink salt achi tarah mix karein. 20-30 minute marinate hone ke liye rakh dein.",
      "2. Healthy Pan-Grill: Non-stick tawa ya grill pan ko medium-high heat par garam karein aur sirf 1 teaspoon mustard/olive oil se lightly brush karein. Tikka cubes ko tawa par rakh kar 4-5 minute har taraf se char hone tak cook karein jab tak golden crust ban jaye aur chicken juicy naram ho.",
      "3. Fragrant Steaming: Basmati chawal ko 1 chhoti elaichi aur zeera ke sath boil/steam karein. Excess starch strain kar dein taake light rahe.",
      "4. Bowl Assembly: Bowl me steamed warm basmati rice daalein, upar juicy grilled chicken tikka cubes arrange karein, side par crunchy kachumber salad aur fresh mint raita drizzle karein.",
      "5. Garnish: Upar se halka chaat masala aur taza hara dhaniya sprinkle karein. Enjoy fresh, healthy office lunch!"
    ],
    chefTip: "💡 ZaiqaBox Secret: Marination me lemon juice chicken ke fibers ko naturally tender banata hai. Pan ko cover karke 2 minute cook karne se chicken ka apna natural juice andar seal rehta hai aur extra oil ki bilkul zaroorat nahi parti!"
  },

  "Tuesday": {
    day: "Tuesday",
    title: "Homestyle Daal Palak (Spinach & Lentils Stew)",
    tagline: "Iron & Fiber Rich • Clean Tarka • Light Digestion",
    image: "assets/menu/tuesday_daal_palak.jpg",
    prepTime: "10 mins",
    cookTime: "25 mins",
    serves: "2 Persons",
    calories: "440 kcal",
    protein: "22g",
    carbs: "62g",
    fat: "9g",
    description: "Hearty yellow lentils simmered with organic chopped spinach, gently seasoned with turmeric and cumin, finished with a fragrant golden garlic and whole zeera tarka.",
    ingredients: [
      "Yellow Moong & Masoor Daal: 1 cup (washed and soaked for 20 mins)",
      "Fresh Organic Spinach (Palak): 2 cups (finely chopped & washed)",
      "Ripe Tomato: 1 medium (chopped)",
      "Garlic Cloves: 4-5 (thinly sliced for tarka)",
      "Whole Cumin Seeds (Sabut Zeera): 1 teaspoon",
      "Dried Whole Round Red Chilies (Gol Laal Mirch): 2-3",
      "Turmeric Powder (Haldi): 1/2 teaspoon",
      "Coriander Powder (Dhaniya): 1/2 teaspoon",
      "Pure Desi Ghee or Olive Oil: 1 tablespoon (for tarka)",
      "Green Chilies: 2 slit length-wise",
      "Himalayan Pink Salt: To taste"
    ],
    steps: [
      "1. Daal Boiling: Soaked moong aur masoor daal ko 3 cup paani, haldi, salt aur kate huway tamatar ke sath pot me ubaal lein. Medium aanch par daal galne tak pakayein (approx 15 mins).",
      "2. Adding Fresh Palak: Daal jab 80% soft ho jaye to chopped fresh palak aur hari mirchen shamil karein. Dheemi aanch par 5-7 minute pakaein taake palak ka natural green color aur vitamins zaya na hon.",
      "3. Fragrant Golden Tarka: Chhotay pan me 1 tablespoon desi ghee ya olive oil garam karein. Barik kata hua lehsan daalein aur golden fry karein, sath hi sabut zeera aur gol laal mirch daal kar 15 second crackle karein.",
      "4. The Sizzle Seal: Tarka ko ubalti hui daal palak par daalein aur foran 2 minute ke liye dakan band kar dein taake khushboo andar jazb ho jaye.",
      "5. Serve: Garma garam whole-wheat chakki tawa roti aur kachumber ke sath serve karein."
    ],
    chefTip: "💡 ZaiqaBox Secret: Palak ko daal ke sath shuru se nahi ubalna chahiye. Aakhri 6-7 minute me daalne se uski iron, folate aur natural vibrant green rangat mehfooz rehti hai!"
  },

  "Wednesday": {
    day: "Wednesday",
    title: "Light Desi Chicken Handi",
    tagline: "Lean Poultry • Zero Heavy Cream • Velvety Yogurt Gravy",
    image: "assets/menu/wednesday_chicken_handi.jpg",
    prepTime: "15 mins",
    cookTime: "25 mins",
    serves: "1 - 2 Persons",
    calories: "510 kcal",
    protein: "34g",
    carbs: "28g",
    fat: "16g",
    description: "Traditional Karachi Clay-Pot style boneless chicken cooked in a rich yet light tomato and whipped yogurt masala, infused with roasted crushed spices and aromatic dried fenugreek (kasuri methi).",
    ingredients: [
      "Boneless Chicken Thigh/Breast: 300g (cut into small handi cubes)",
      "Whipped Low-Fat Yogurt (Dahi): 1/2 cup (room temperature)",
      "Fresh Tomato Puree: 2 medium tomatoes blended smooth",
      "Ginger-Garlic Paste: 1 tablespoon freshly crushed",
      "Bhuna Zeera & Dhaniya (Roasted & Crushed): 1 tablespoon",
      "Kashmiri Red Chili: 1 teaspoon",
      "Black Pepper Powder (Kaali Mirch): 1/2 teaspoon",
      "Kasuri Methi (Dried Fenugreek Leaves): 1 tablespoon (rubbed between palms)",
      "Fresh Ginger Juliennes & Green Chilies: For garnish",
      "Olive Oil or Clean Canola: 1.5 tablespoons",
      "Salt: 1 teaspoon or to taste"
    ],
    steps: [
      "1. Aromatic Searing: Handi ya karahi me 1.5 tbsp oil garam karein. Adrak-lehsan paste daal kar 30 second sauté karein. Phir chicken cubes shamil karein aur high heat par 4-5 minute fry karein jab tak chicken ka color white aur edges halki golden ho jayein.",
      "2. Spice & Tomato Infusion: Tomato puree, laal mirch powder, salt aur crushed bhuna zeera-dhaniya daalein. Masale ko 3-4 minute bhun lein jab tak oil halka sa alag nazar aane lage.",
      "3. Low-Fat Yogurt Gravy: Choolha bilkul halka karein (low flame), whipped dahi shamil karein aur taizi se chalayein taake dahi phate nahi. Dakan dhak kar halki aanch par 12-14 minute dam par pakayein.",
      "4. Finishing Aromatics: Dakan khol kar kaali mirch powder aur kasuri methi hath se masal kar chhirak dein. 2 minute simmer karein.",
      "5. Serving: Taza adrak juliennes aur hari mirch se sajayein. Pure whole-wheat roti ke sath serve karein."
    ],
    chefTip: "💡 ZaiqaBox Secret: Commercial restaurants heavy cream aur processed butter daal kar heavy banate hain. ZaiqaBox achi tarah whipped fresh yogurt use karta hai jo creamy texture deta hai magar pet par halka rehta hai!"
  },

  "Thursday": {
    day: "Thursday",
    title: "Spiced Chana Medley & Peas Pulao",
    tagline: "Plant Powered • Low GI • Slow Sustained Energy",
    image: "assets/menu/thursday_chana_pulao.jpg",
    prepTime: "15 mins",
    cookTime: "30 mins",
    serves: "2 Persons",
    calories: "460 kcal",
    protein: "19g",
    carbs: "72g",
    fat: "10g",
    description: "Tender Kabuli chickpeas simmered in a tangy spiced tomato and pomegranate seed gravy, paired with fluffy fragrant green peas basmati pulao and refreshing mint raita.",
    ingredients: [
      "Kabuli Chickpeas (Safaid Chana): 1.5 cups (overnight soaked & boiled until buttery soft)",
      "Chickpea Stock (Chana ka pani): 1 cup",
      "Onion: 1 medium (thinly sliced)",
      "Tomato Puree: 2 ripe tomatoes",
      "Anardana Powder (Dry Pomegranate) or Amchur: 1/2 teaspoon (for authentic tangy punch)",
      "Chana Masala Spices: Cumin, coriander, black pepper, clove",
      "Long Grain Basmati Rice: 1 cup (soaked)",
      "Sweet Green Peas (Matar): 1/2 cup fresh or frozen",
      "Whole Spices for Pulao: 1 bay leaf, 2 cloves, 1 cinnamon stick",
      "Cold-Pressed Cooking Oil: 1.5 tablespoons",
      "Pink Salt: To taste"
    ],
    steps: [
      "1. Fragrant Peas Pulao: Pot me 1 tsp oil garam karein, tez patta, laung aur daarchini crackle karein. Green peas aur drained basmati chawal daal kar 1 minute gently sauté karein. 1.75 cup paani aur namak daal kar cover karein aur dam par 12-15 minute pakayein.",
      "2. Tangy Chana Masala: Dusre pan me 1 tbsp oil garam karein. Pyaaz ko golden brown karein. Ginger-garlic paste aur tomato puree daal kar bhun lein.",
      "3. Simmering: Boiled kabuli chane aur chana stock shamil karein. Anardana/amchur powder, zeera, dhaniya aur salt daal kar medium flame par 10 minute simmer karein taake thick flavorful masala chano par lipat jaye.",
      "4. Assembly: Garam peas pulao ke sath tangy spiced chana bowl me serve karein, sath cucumber slices aur raita rakhein."
    ],
    chefTip: "💡 ZaiqaBox Secret: Chickpeas ko ubaal kar unka paani phenkna nahi chahiye. Wahi paani gravy me use karne se natural vegetable starch sauce ko naturally thick aur rich banata hai bina kisi cornflour ke!"
  },

  "Friday": {
    day: "Friday",
    title: "Fragrant Sindhi Chicken Biryani (Olive Oil Special)",
    tagline: "Karachi Friday Treat • Measured Cold-Pressed Oil • Zero Afternoon Slump",
    image: "assets/menu/friday_biryani.jpg",
    prepTime: "20 mins",
    cookTime: "35 mins",
    serves: "2 - 3 Persons",
    calories: "540 kcal",
    protein: "32g",
    carbs: "68g",
    fat: "14g",
    description: "Royal Karachi Friday tradition reimagined for working professionals! Skinless chicken cooked with aromatic whole spices, dried plums, and low-fat yogurt, layered with long-grain basmati and saffron essence. Authentic rich flavor with zero heavy greasy oiliness.",
    ingredients: [
      "Chicken Pieces: 350g (skinless, trimmed of excess fat)",
      "Aged Basmati Rice: 1.5 cups (soaked 30 mins)",
      "Yogurt (Dahi): 1/2 cup",
      "Sliced Onions: 2 medium (lightly browned in minimal oil)",
      "Tomatoes: 2 (sliced into rounds)",
      "Dried Plums (Aaloo Bukhara): 4-5 pieces (vital for Sindhi zing)",
      "Whole Biryani Spices: Cardamom, cinnamon, star anise, black pepper, cloves",
      "Fresh Mint & Coriander Leaves: 1/2 cup chopped",
      "Cold-Pressed Olive Oil: 1.5 tablespoons",
      "Saffron Water or Kewra: 1 teaspoon",
      "Green Chilies: 3 whole",
      "Salt: To taste"
    ],
    steps: [
      "1. Chicken Qorma Base: Pot me 1.5 tbsp olive oil me pyaz golden karein. Adrak-lehsan paste aur chicken daal kar 5 minute fry karein. Dahi, tamatar, aaloo bukhara, laal mirch, aur crushed biryani masala shamil karein. Dheemi aanch par chicken galne tak 15 minute pakaein.",
      "2. Aromatic Rice Boil: Khulay paani me sabut garam masale, pudina aur namak daal kar rice ko 80% boil karein (rice me 1 kani rehni chahiye). Strain kar lein.",
      "3. Layering (Teh): Pot ke base me chicken masala rakhein, upar strained steaming basmati chawal ki layer lagayein. Upar fresh pudina, dhaniya, kewra/saffron water aur sliced green chilies sprinkle karein.",
      "4. The Royal Dum: Pot ko tight lid ya foil se cover karein aur tawe par 15 minute bilkul halki aanch par dum dein.",
      "5. Ready to Feast: Dakan utharein, gentle hath se chawal mix karein aur fresh mint raita ke sath khushboo ka lutf uthayein!"
    ],
    chefTip: "💡 ZaiqaBox Secret: Traditional deg biryani me 1 kilo par 250ml ganda oil/dalda hota hai jo lunch ke baad office me neend (food coma) lata hai. ZaiqaBox exact measured olive oil aur fresh spices use karta hai — pure royal Karachi swaad, magar afternoon energy 100% active!"
  }
};

/**
 * Open Recipe Modal
 */
function openDishRecipeModal(day) {
  const recipe = RECIPE_DATA[day] || RECIPE_DATA["Monday"];
  const modal = document.getElementById("dishRecipeModal");
  if (!modal) return;

  // Populate Fields
  const titleEl = document.getElementById("recModalTitle");
  const taglineEl = document.getElementById("recModalTagline");
  const imgEl = document.getElementById("recModalImg");
  const dayBadge = document.getElementById("recModalDayBadge");
  const prepEl = document.getElementById("recModalPrep");
  const cookEl = document.getElementById("recModalCook");
  const calsEl = document.getElementById("recModalCals");
  const proteinEl = document.getElementById("recModalProtein");
  const descEl = document.getElementById("recModalDesc");
  const ingList = document.getElementById("recModalIngredients");
  const stepsList = document.getElementById("recModalSteps");
  const tipEl = document.getElementById("recModalChefTip");
  const orderBtn = document.getElementById("recModalOrderBtn");

  if (titleEl) titleEl.textContent = recipe.title;
  if (taglineEl) taglineEl.textContent = recipe.tagline;
  if (dayBadge) dayBadge.textContent = recipe.day + "'s Chef Special";
  if (imgEl) {
    imgEl.src = recipe.image;
    imgEl.onerror = function() { this.src = "assets/menu/monday_tikka_bowl.jpg"; };
  }
  if (prepEl) prepEl.textContent = recipe.prepTime;
  if (cookEl) cookEl.textContent = recipe.cookTime;
  if (calsEl) calsEl.textContent = recipe.calories;
  if (proteinEl) proteinEl.textContent = recipe.protein;
  if (descEl) descEl.textContent = recipe.description;
  if (tipEl) tipEl.textContent = recipe.chefTip;

  if (ingList) {
    ingList.innerHTML = recipe.ingredients.map(ing => `<li>${ing}</li>`).join("");
  }
  if (stepsList) {
    stepsList.innerHTML = recipe.steps.map(step => `<li>${step}</li>`).join("");
  }

  if (orderBtn) {
    const waMsg = encodeURIComponent(`Hi ZaiqaBox! I checked the recipe for ${recipe.title} (${recipe.day}). I want to order this healthy lunch delivered fresh to my office!`);
    orderBtn.href = `https://wa.me/923378034564?text=${waMsg}`;
  }

  // Update active selector tab
  modal.querySelectorAll(".recipe-day-tab").forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-day") === recipe.day);
  });

  modal.classList.add("open");
}

/**
 * Close Recipe Modal
 */
function closeDishRecipeModal() {
  const modal = document.getElementById("dishRecipeModal");
  if (modal) modal.classList.remove("open");
}

// Bind Global Escape Key and Backdrop Click
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("dishRecipeModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeDishRecipeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDishRecipeModal();
  });
});
