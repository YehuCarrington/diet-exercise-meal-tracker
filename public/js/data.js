"use strict";
/* Plateful data: plates, weekly rotation, training days, copy. No logic here. */
/* ---------- data ---------- */
var I=function(t,q,u,k,p,c){return {t:t,q:q,u:u,k:k,p:p,c:c?1:0};};
var MEALS={
 b:[
  {n:"Protein oats",how:"Cook oats in water 3 min, stir the powder in off the heat, slice banana on top.",
   it:[I("rolled oats (dry)",.75,"cup",300,10,1),I("lactose-free protein powder",1,"scoop",120,24),I("banana",1,"",105,1),I("peanut butter",1,"tbsp",95,4)]},
  {n:"Saltfish, cucumber and toast",x:"fish",how:"Boil saltfish the night before. Toss with cucumber, sweet pepper and a little oil. No tomato, no pepper sauce.",
   it:[I("saltfish, soaked and flaked",120,"g",1.3,.28),I("whole-wheat bread",2,"slice",80,4,1),I("cucumber and sweet pepper",1,"cup",20,1),I("oil",1,"tsp",40,0),I("pawpaw",1,"cup",60,1)]},
  {n:"Tuna and zaboca sandwich",x:"fish",how:"Mash tuna with zaboca instead of mayo. Two minutes.",
   it:[I("tuna in water, drained",1,"can",130,28),I("whole-wheat bread",2,"slice",80,4,1),I("mashed zaboca",2,"tbsp",25,0),I("banana",1,"",105,1)]}
,
  {n:"Sardine toast",x:"fish",how:"Sardines packed in water or oil, not tomato sauce. Drain, mash with chadon beni, pile on toast with cucumber.",
   it:[I("sardines, drained",1,"can",190,22),I("whole-wheat bread",2,"slice",80,4,1),I("cucumber",1,"cup",20,1),I("pawpaw",1,"cup",60,1)]},
  {n:"Peanut-banana blender shake",how:"Everything in the blender with ice, 60 seconds. Drink it on the way to work.",
   it:[I("lactose-free protein powder",1,"scoop",120,24),I("unsweetened soy milk",1,"cup",80,7),I("rolled oats (dry)",.5,"cup",300,10,1),I("banana",1,"",105,1),I("peanut butter",1,"tbsp",95,4)]},
  {n:"Chicken and sweet potato hash",meat:1,how:"Dice leftover baked chicken and boiled sweet potato. Fry 5 min in 1 tsp oil with sweet pepper and pimento.",
   it:[I("baked chicken breast",120,"g",1.65,.31),I("boiled sweet potato",1,"cup",190,2,1),I("sweet pepper and pimento",.5,"cup",30,1),I("oil",1,"tsp",40,0)]},
  {n:"Scrambled eggs on toast",x:"egg",how:"Scramble over low heat in 1 tsp oil. Two minutes.",
   it:[I("eggs",3,"",72,6),I("whole-wheat bread",2,"slice",80,4,1),I("oil",1,"tsp",40,0),I("pawpaw",1,"cup",60,1)]},
  {n:"Yogurt, oats and banana",x:"dairy",how:"Stir dry oats into the yogurt, slice the banana on top. No cooking.",
   it:[I("plain low-fat Greek yogurt",1,"cup",150,23),I("rolled oats (dry)",.5,"cup",300,10,1),I("banana",1,"",105,1),I("peanut butter",1,"tbsp",95,4)]},
  {n:"Peanut butter banana sandwiches and a shake",gain:1,how:"Two minutes, no cooking. Easy calories when you are not hungry.",
   it:[I("whole-wheat bread",3,"slice",80,4,1),I("peanut butter",2,"tbsp",95,4),I("banana",1,"",105,1),I("lactose-free protein powder",1,"scoop",120,24)]}
 ],
 l:[
  {n:"Baked chicken, rice and dhal",meat:1,how:"From Sunday's batch. Reheat, add the veg.",
   it:[I("baked chicken breast",150,"g",1.65,.31),I("cooked rice",1,"cup",205,4,1),I("dhal",.5,"cup",200,12),I("bhagi, pak choi or cabbage",1,"cup",70,3)]},
  {n:"Stewed lentils, chicken and provision",meat:1,how:"From the batch. Stew the lentils with pumpkin, light on oil.",
   it:[I("skinless chicken thigh",120,"g",1.8,.25),I("stewed lentils",.75,"cup",230,18),I("boiled provision (sweet potato, dasheen or cassava)",1,"cup",190,2,1),I("steamed veg",1,"cup",70,3)]},
  {n:"Mild curry channa and chicken",meat:1,how:"Go easy on pepper and oil so it sits well.",
   it:[I("chicken breast",130,"g",1.65,.31),I("curry channa",.5,"cup",270,14),I("cooked rice",1,"cup",205,4,1),I("cucumber salad",1,"cup",20,1),I("cooked veg",1,"cup",70,3)]},
  {n:"Your pick",how:"Doubles, roti, a lime with the boys. Eat it as lunch, not on top of lunch. Skip the sweet drink.",free:1,
   it:[I("meal of your choice (rough estimate)",1,"",750,25)]},
  {n:"Lean pelau",meat:1,how:"Skinless chicken, pigeon peas, light on browning sugar, no coconut milk.",
   it:[I("lean chicken pelau",1.5,"cup",280,18,1),I("extra chicken",80,"g",1.65,.31),I("cucumber and cabbage slaw, no mayo",1,"cup",40,1)]}
,
  {n:"No-cook tuna and channa bowl",x:"fish",how:"Rinse canned channa, toss with tuna, cucumber, carrot, chadon beni and salt. Nothing to heat.",
   it:[I("tuna in water, drained",1,"can",130,28),I("channa, rinsed",.75,"cup",270,14),I("cooked rice",.75,"cup",205,4,1),I("cucumber and grated carrot",1,"cup",30,1),I("diced zaboca",2,"tbsp",25,0)]},
  {n:"Light stew chicken with pigeon peas",meat:1,how:"Brown 1 tsp sugar only, skin off, stew 25 min with pimento and thyme. Batch it on Sunday instead of the baked chicken.",
   it:[I("stewed skinless chicken thigh",150,"g",1.8,.25),I("pigeon peas",.5,"cup",200,11),I("cooked rice",1,"cup",205,4,1),I("steamed cabbage and carrot",1,"cup",70,3)]},
  {n:"Fish broth",x:"fish",how:"Simmer green fig, dasheen, carrot and okra 15 min with thyme and chadon beni, add the fish for the last 6. Leave out the lime and pepper.",
   it:[I("carite or kingfish",170,"g",1.35,.26),I("green fig and dasheen",1.25,"cup",180,2,1),I("carrot and okra",1,"cup",50,2)]},
  {n:"Stewed soya chunks, lentils and rice",how:"Soak the soya chunks 10 min in hot water, squeeze dry, then stew with green seasoning and pimento.",
   it:[I("soya chunks (dry)",40,"g",3.4,.5),I("stewed lentils",.75,"cup",230,18),I("cooked rice",1,"cup",205,4,1),I("steamed veg",1,"cup",70,3)]},
  {n:"Curry channa, soya and aloo with rice",how:"Mild curry, light on oil. Soak and squeeze the soya chunks first. Batch a pot on Sunday.",
   it:[I("curry channa",1,"cup",270,14),I("soya chunks (dry)",30,"g",3.4,.5),I("potato",.5,"cup",120,2,1),I("cooked rice",1,"cup",205,4,1),I("cucumber salad",1,"cup",20,1)]},
  {n:"Lentil and pumpkin stew with provision",how:"One pot: lentils, pumpkin, garlic, thyme. 30 minutes.",
   it:[I("stewed lentils",1.25,"cup",230,18),I("boiled provision",1,"cup",190,2,1),I("bhagi",1,"cup",70,3)]},
  {n:"Rice and peas with stew chicken and zaboca",meat:1,gain:1,how:"A bigger plate for building up. Skin off, light on browning sugar.",
   it:[I("stewed skinless chicken thigh",150,"g",1.8,.25),I("pigeon peas",.75,"cup",200,11),I("cooked rice",1.25,"cup",205,4,1),I("sliced zaboca",4,"tbsp",25,0),I("steamed cabbage and carrot",1,"cup",70,3)]}
 ],
 s:[
  {n:"Shake and a banana",how:"Powder in water. Keep a shaker at your desk.",
   it:[I("lactose-free protein powder",1,"scoop",120,24),I("banana",1,"",105,1)]},
  {n:"Tuna and crackers",x:"fish",how:"Keep cans in your desk drawer.",
   it:[I("tuna in water, drained",1,"can",130,28),I("whole-wheat crackers",4,"",17.5,.5,1),I("cucumber",.5,"cup",10,0)]},
  {n:"Peanuts and fruit",how:"Weigh the peanuts once so you know what 30 g looks like.",
   it:[I("unsalted roasted peanuts",30,"g",5.7,.24),I("banana, or a cup of pawpaw or melon",1,"",105,1)]}
,
  {n:"Chicken strips and carrot sticks",meat:1,how:"Slice a piece of the batch chicken. Eat it cold.",
   it:[I("baked chicken breast",80,"g",1.65,.31),I("whole-wheat crackers",4,"",17.5,.5,1),I("carrot sticks",1,"cup",50,1)]},
  {n:"Salted channa and cucumber",how:"Rinsed canned channa, cucumber, chadon beni, salt. Lowest protein option, so use it once a week.",
   it:[I("channa, rinsed",.75,"cup",270,14),I("cucumber",1,"cup",20,1)]},
  {n:"Two boiled eggs and fruit",x:"egg",how:"Boil six on Sunday and keep them in the fridge.",
   it:[I("boiled eggs",2,"",72,6),I("banana",1,"",105,1)]},
  {n:"Greek yogurt and peanuts",x:"dairy",how:"Plain yogurt, not flavoured.",
   it:[I("plain low-fat Greek yogurt",1,"cup",150,23),I("unsalted roasted peanuts",15,"g",5.7,.24)]},
  {n:"Peanuts, raisins and a banana",gain:1,how:"Bag a week's worth on Sunday.",
   it:[I("unsalted roasted peanuts",40,"g",5.7,.24),I("raisins",30,"g",3,.03),I("banana",1,"",105,1)]}
 ],
 d:[
  {n:"Seared fish, provision and bodi",x:"fish",how:"Carite or kingfish, 4 min a side in 1 tsp oil. Green seasoning, no lime if it burns you.",
   it:[I("carite or kingfish",170,"g",1.35,.26),I("boiled provision",1.25,"cup",190,2,1),I("bodi and pumpkin",1.5,"cup",70,3),I("oil",1,"tsp",40,0)]},
  {n:"Chicken and veg stir-fry",meat:1,how:"Ginger, garlic, pak choi, carrot, cabbage. 15 minutes.",
   it:[I("chicken breast",150,"g",1.65,.31),I("stir-fried veg",2,"cup",70,3),I("cooked rice",1,"cup",205,4,1)]},
  {n:"Chicken, pumpkin and lentil soup",meat:1,how:"One pot, makes two nights. No dumplings.",
   it:[I("skinless chicken thigh",120,"g",1.8,.25),I("lentils",.5,"cup",230,18),I("pumpkin and dasheen",1.25,"cup",150,2,1),I("pak choi or spinach",1,"cup",50,3)]},
  {n:"Baked chicken, okra and sweet potato",meat:1,how:"Tray bake, 25 min at 200°C.",
   it:[I("skinless chicken thigh",150,"g",1.8,.25),I("sweet potato",1.25,"cup",190,2,1),I("okra and pumpkin",1.5,"cup",70,3)]}
,
  {n:"Foil-baked fish with okra and pumpkin",x:"fish",how:"Fish, okra, pumpkin, garlic and green seasoning in one foil parcel. 20 min at 200°C, no pan to wash.",
   it:[I("carite or kingfish",170,"g",1.35,.26),I("okra and pumpkin",1.5,"cup",70,3),I("cooked rice",1,"cup",205,4,1)]},
  {n:"Geera chicken, rice and cucumber",meat:1,how:"Toast 1 tsp geera in a dry pan, add diced thigh, garlic and 1 tsp oil, cook 12 min. Keep it mild.",
   it:[I("skinless chicken thigh",150,"g",1.8,.25),I("cooked rice",1,"cup",205,4,1),I("cucumber salad",1,"cup",20,1),I("oil",1,"tsp",40,0)]},
  {n:"Chicken mince and cabbage with provision",meat:1,how:"Brown lean chicken mince with garlic and ginger, add shredded cabbage and carrot, lid on 6 min.",
   it:[I("lean chicken mince",150,"g",1.7,.23),I("cabbage and carrot",2,"cup",70,3),I("boiled provision",1,"cup",190,2,1)]},
  {n:"Grilled chicken, lentils and bhagi",meat:1,how:"Grill or pan-sear the breast 5 min a side. Wilt the bhagi with garlic in the same pan.",
   it:[I("chicken breast",130,"g",1.65,.31),I("stewed lentils",.75,"cup",230,18),I("boiled sweet potato",1,"cup",190,2,1),I("bhagi",1,"cup",70,3)]},
  {n:"Soya chunk and veg stir-fry",how:"Soak and squeeze the soya chunks, then stir-fry with ginger, garlic and veg. 15 minutes.",
   it:[I("soya chunks (dry)",50,"g",3.4,.5),I("stir-fried veg",2,"cup",70,3),I("cooked rice",1,"cup",205,4,1)]},
  {n:"Dhal, rice, channa and bhagi",how:"The classic plate. Wilt the bhagi with garlic.",
   it:[I("dhal",1,"cup",200,12),I("channa",.5,"cup",270,14),I("cooked rice",1,"cup",205,4,1),I("bhagi",1.5,"cup",70,3)]},
  {n:"Tofu and pak choi with provision",how:"Press the tofu dry, cube it, brown it in 1 tsp oil, then add pak choi and garlic.",
   it:[I("firm tofu",200,"g",1.45,.17),I("pak choi",2,"cup",70,3),I("boiled provision",1,"cup",190,2,1),I("oil",1,"tsp",40,0)]}
 ]
};
/* Mon..Sun: [breakfast, lunch, snack, dinner] */
var WEEK=[[0,0,0,0],[2,0,1,1],[0,1,0,2],[1,1,1,3],[0,2,0,0],[2,3,2,1],[1,4,0,2]];
var SLOTS=[
 {id:"b",label:"Breakfast",why:"Protein early is what stops the mid-morning pastry and sweet drink."},
 {id:"l",label:"Lunch",why:"Packed from home, so the food court does not decide for you."},
 {id:"s",label:"Afternoon snack",why:"This replaces the 3 pm candy bar. Eat it even if you are not hungry yet."},
 {id:"d",label:"Dinner",why:"Last food of the day. A gap before bed helps you sleep and ends the evening snacking."}
];
var DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
var SCIENCE=[
 {h:"Fat loss is an energy gap",b:"Your body burns roughly {tdee} kcal a day at your size and activity (Mifflin-St Jeor estimate for resting burn, times a factor for how active you are). The plan feeds you about {target}. A gap near 500 kcal a day works out to roughly 1 lb a week at first, then slows as you get lighter. No food, timing trick or supplement works except by changing that gap."},
 {h:"Why the plan is built on protein",b:"When you eat less, you lose muscle along with fat unless protein stays high. Pooled trials in overweight adults find that going above about 1.3 g per kg of body weight a day protects muscle, and that dropping under 1.0 g per kg raises the risk of losing it. Reviews also point to roughly 25 to 30 g at each meal for better appetite control. Your floor is {protein} g a day, split over four sittings.",
  src:[["Enhanced protein intake in adults with overweight (meta-analysis, 2024)","https://pubmed.ncbi.nlm.nih.gov/39002131/"],["The role of protein in weight loss and maintenance (2015)","https://pubmed.ncbi.nlm.nih.gov/25926512/"]]},
 {h:"Why packaged and fried food is out by default",b:"In a month-long NIH feeding trial, 20 adults were given either ultra-processed or minimally processed meals matched for calories on offer, and told to eat as much as they wanted. They ate about 500 kcal a day more on the ultra-processed menu and gained weight, then lost it on the whole-food menu. Nobody felt they were overeating. Pies, sweet drinks and candy bars work on you the same way.",
  src:[["NIH: heavily processed foods cause overeating and weight gain","https://www.nih.gov/news-events/news-releases/nih-study-finds-heavily-processed-foods-cause-overeating-weight-gain"]]},
 {h:"Why set times",b:"Meal timing does not burn fat by itself. Fixed times matter because of what happens without them: a skipped breakfast turns into a fried pastry at 10, a crash after lunch turns into a candy bar, and a light dinner turns into snacking at night. Four planned plates remove those decisions. The kitchen closes 3 hours before bed to end night snacking.{reflux}"},
 {h:"Why weigh every day",b:"Your weight swings 2 to 4 lb from water, salt and food in transit, so a single reading tells you nothing. Weigh each morning after the bathroom, before eating, and read only the 7-day average. The Track tab does this for you and tells you when to change the food."},
 {h:"Why earlier attempts did not work",b:"The usual cause is not effort. People consistently eat more than they believe they do, and the extra comes from drinks, oil, bites while cooking and weekend meals. This plan does not ask you to count anything. It asks you to eat the listed plates and nothing else, then lets the scale trend check the maths."},
 {h:"Keep lifting",b:"Strength training tells your body to keep muscle while the deficit takes fat. Belly fat tends to respond early to a steady deficit plus training. Do not add hours of cardio to make up for off-plan eating."}
];

var ICONS=[["choice","🍽️"],["soya","🫘"],["tofu","🥡"],["raisin","🍇"],["sweet potato","🍠"],["potato","🥔"],["pelau","🍚"],["chicken","🍗"],["tuna","🐟"],["sardine","🐟"],["saltfish","🐟"],["carite","🐟"],["kingfish","🐟"],["egg","🥚"],["yogurt","🥛"],["oats","🥣"],["powder","🥤"],["soy milk","🥛"],["peanut","🥜"],["banana","🍌"],["bread","🍞"],["cracker","🍘"],["zaboca","🥑"],["pawpaw","🍈"],["rice","🍚"],["dhal","🫘"],["lentil","🫘"],["channa","🫘"],["pigeon","🫘"],["sweet potato","🍠"],["provision","🍠"],["dasheen","🍠"],["green fig","🍠"],["sweet pepper","🫑"],["cucumber","🥒"],["carrot","🥕"],["ginger","🌿"],["oil","🫒"],["pumpkin","🎃"]];
/* ---------- training data ---------- */
var WORKOUTS={
 A:{t:"Squat + Push",e:"🏋️",ex:[
  {n:"Goblet squat",s:3,r:"10",c:["Hold one dumbbell against your chest.","Sit down between your heels, knees follow your toes.","Chest stays up, heels stay down."]},
  {n:"Dumbbell bench press",s:3,r:"10",c:["Feet flat, shoulder blades pinched together.","Lower to chest level with elbows about 45° from your sides.","Press up and slightly in."]},
  {n:"Seated dumbbell shoulder press",s:3,r:"10",c:["Back against the pad, ribs down.","Start at ear height, press straight up.","Do not arch to finish the rep."]},
  {n:"Leg press",s:3,r:"12",c:["Feet shoulder width, mid-platform.","Lower until knees reach about 90°.","Never lock the knees hard at the top."]},
  {n:"Cable triceps pushdown",s:2,r:"12",c:["Elbows pinned to your sides.","Only the forearms move.","Squeeze for a second at the bottom."]},
  {n:"Plank",s:3,r:"30 s",c:["Elbows under shoulders.","Squeeze glutes, body in one line.","Stop the set when your hips sag."]}],
  fin:"10 min incline walk, a pace where you can still talk"},
 B:{t:"Legs + Pull",e:"🦵",ex:[
  {n:"Dumbbell Romanian deadlift",s:3,r:"10",c:["Soft knees, push your hips straight back.","Dumbbells slide down your thighs to mid-shin.","Back stays flat; feel it in the hamstrings."]},
  {n:"Lat pulldown",s:3,r:"10",c:["Grip just wider than shoulders.","Pull the bar to your upper chest, elbows down.","Control it back up, no swinging."]},
  {n:"Seated cable row",s:3,r:"10",c:["Sit tall, slight bend in the knees.","Pull to your lower ribs, squeeze the shoulder blades.","Do not lean back to move the weight."]},
  {n:"Walking lunge",s:3,r:"10 / side",c:["Long step, back knee drops toward the floor.","Front knee stays over the foot.","Push through the front heel."]},
  {n:"Dumbbell curl",s:2,r:"12",c:["Elbows stay by your sides.","Curl without swinging the body.","Lower for a slow two-count."]},
  {n:"Dead bug",s:3,r:"8 / side",c:["Lower back pressed into the floor.","Reach opposite arm and leg away slowly.","Stop if your back lifts."]}],
  fin:"10 min easy bike"},
 C:{t:"Posterior + Core",e:"🍑",ex:[
  {n:"Hip thrust",s:3,r:"12",c:["Upper back on a bench, feet flat.","Drive hips up until your body is level.","Chin tucked, squeeze glutes at the top."]},
  {n:"Lying leg curl",s:3,r:"12",c:["Pad just above your heels.","Curl all the way, hips stay on the bench.","Lower slowly."]},
  {n:"One-arm dumbbell row",s:3,r:"10 / side",c:["Hand and knee on a bench, back flat.","Pull the dumbbell to your hip.","No twisting through the torso."]},
  {n:"Push-up",s:3,r:"max − 2",c:["Hands under shoulders, body in one line.","Chest to a fist's height off the floor.","Too hard? Hands on a bench."]},
  {n:"Back extension",s:2,r:"12",c:["Hinge at the hips, not the lower back.","Come up until your body is straight, no higher.","Slow on the way down."]},
  {n:"Side plank",s:3,r:"20 s / side",c:["Elbow under shoulder.","Hips high and stacked.","Bend the bottom knee to make it easier."]}],
  fin:"10 min rower or brisk walk"}
};
var SLOTE={b:"🌅",l:"🍱",s:"🥜",d:"🍽️"};
var FLAGS=[["noDairy","🥛","No milk or yogurt","Lactose intolerant or avoiding dairy"],["noEggs","🥚","No eggs","Allergy or just do not like them"],["noFish","🐟","No fish","Removes fish, tuna and saltfish plates"],["noMeat","🥦","Vegetarian","No meat or fish. Plates use lentils, channa, soya and tofu"],["reflux","🔥","Reflux friendly","Heartburn or GERD: keeps plates mild and low fat"]];

/* ---------- home training plan: no equipment beyond a backpack and a chair ---------- */
var WORKOUTS_HOME={
 A:{t:"Squat + Push",e:"🏠",ex:[
  {n:"Bodyweight squat",s:3,r:"15",c:["Feet shoulder width, toes slightly out.","Sit back and down until thighs are level.","Chest up, heels down."]},
  {n:"Push-up",s:3,r:"max − 2",c:["Hands under shoulders, body in one line.","Chest to a fist's height off the floor.","Too hard? Hands on a chair or bed."]},
  {n:"Reverse lunge",s:3,r:"10 / side",c:["Step back, drop the back knee toward the floor.","Front knee stays over the foot.","Push through the front heel to stand."]},
  {n:"Pike push-up",s:3,r:"8",c:["Hips high, body in an upside-down V.","Lower the top of your head toward the floor.","Elbows point back, not out."]},
  {n:"Chair dip",s:2,r:"10",c:["Hands on a sturdy chair behind you.","Bend elbows to about 90°.","Keep your back close to the chair."]},
  {n:"Plank",s:3,r:"30 s",c:["Elbows under shoulders.","Squeeze glutes, body in one line.","Stop the set when your hips sag."]}],
  fin:"10 min brisk walk"},
 B:{t:"Legs + Pull",e:"🏠",ex:[
  {n:"Backpack Romanian deadlift",s:3,r:"12",c:["Hold a loaded backpack in both hands.","Soft knees, push your hips straight back.","Back stays flat; feel it in the hamstrings."]},
  {n:"Backpack bent-over row",s:3,r:"12",c:["Hinge forward with a flat back.","Pull the backpack to your lower ribs.","Squeeze the shoulder blades, lower slowly."]},
  {n:"Split squat",s:3,r:"10 / side",c:["One foot forward, one back, stay in place.","Drop straight down, back knee toward the floor.","Most of the weight on the front leg."]},
  {n:"Superman pull",s:3,r:"12",c:["Lie face down, arms overhead.","Lift chest slightly and pull elbows to your ribs.","Slow and controlled, eyes on the floor."]},
  {n:"Backpack curl",s:2,r:"12",c:["Hold the backpack by its top handle.","Elbows stay by your sides.","Lower for a slow two-count."]},
  {n:"Dead bug",s:3,r:"8 / side",c:["Lower back pressed into the floor.","Reach opposite arm and leg away slowly.","Stop if your back lifts."]}],
  fin:"10 min stairs or step-ups at an easy pace"},
 C:{t:"Posterior + Core",e:"🏠",ex:[
  {n:"Glute bridge",s:3,r:"15",c:["On your back, feet flat, knees bent.","Drive hips up until your body is level.","Squeeze glutes for a second at the top."]},
  {n:"Single-leg glute bridge",s:3,r:"10 / side",c:["One foot down, the other knee toward your chest.","Hips stay level as you lift.","Go slower rather than higher."]},
  {n:"Step-up",s:3,r:"10 / side",c:["Use a sturdy step or the bottom stair.","Push through the whole foot on the step.","Lower under control, no dropping."]},
  {n:"Push-up",s:3,r:"max − 2",c:["Hands under shoulders, body in one line.","Chest to a fist's height off the floor.","Too hard? Hands on a chair or bed."]},
  {n:"Bird dog",s:3,r:"8 / side",c:["On hands and knees, back flat.","Reach opposite arm and leg out long.","No twisting through the hips."]},
  {n:"Side plank",s:3,r:"20 s / side",c:["Elbow under shoulder.","Hips high and stacked.","Bend the bottom knee to make it easier."]}],
  fin:"10 min brisk walk"}
};
/* ---------- plain names for local foods ---------- */
var GLOSS=[["zaboca","avocado"],["provision","root vegetables"],["dasheen","taro"],["bodi","long beans"],["bhagi","spinach-like greens"],["carite","a mackerel"],["kingfish","king mackerel"],["channa","chickpeas"],["dhal","split-pea soup"],["pawpaw","papaya"],["chadon beni","culantro"],["saltfish","salted cod"],["pelau","one-pot rice, peas and chicken"],["green fig","unripe banana"],["pimento","mild seasoning pepper"],["green seasoning","blended herb marinade"],["geera","cumin"],["pak choi","bok choy"],["aloo","potato"],["doubles","curried chickpeas in fried flatbread"],["soya chunks","dried soy pieces"]];
/* ---------- food groups for the plate picture ---------- */
var GROUPS={protein:"protein foods",starch:"starch",veg:"vegetables",fruit:"fruit",fat:"fats",other:"other"};
/* ---------- shopping: plate ingredient -> what to buy. [keywords],[[name, aisle, unit, amount per plate unit]] ---------- */
var SHOPCATS=["Protein","Peas and grains","Provision and veg","Fruit and extras","From your own meals"];
var BUY=[
 [["choice","oil"],[]],
 [["pelau"],[["Rice (dry)","Peas and grains","g",45],["Skinless chicken thighs (raw)","Protein","g",70],["Pigeon peas","Peas and grains","can",.2]]],
 [["chicken mince"],[["Lean chicken mince (raw)","Protein","g",1.25]]],
 [["thigh"],[["Skinless chicken thighs (raw)","Protein","g",1.35]]],
 [["chicken"],[["Chicken breast (raw)","Protein","g",1.35]]],
 [["carite","kingfish"],[["Carite or kingfish","Protein","g",1.2]]],
 [["saltfish"],[["Saltfish","Protein","g",.85]]],
 [["tuna"],[["Tuna in water","Protein","can",1]]],
 [["sardine"],[["Sardines","Protein","can",1]]],
 [["soya"],[["Soya chunks","Protein","g",1]]],
 [["tofu"],[["Firm tofu","Protein","g",1]]],
 [["powder"],[["Protein powder","Protein","scoop",1]]],
 [["egg"],[["Eggs","Protein","",1]]],
 [["yogurt"],[["Plain Greek yogurt","Protein","g",245]]],
 [["soy milk"],[["Unsweetened soy milk","Fruit and extras","ml",240]]],
 [["oats"],[["Rolled oats","Peas and grains","g",80]]],
 [["rice"],[["Rice (dry)","Peas and grains","g",65]]],
 [["dhal"],[["Split peas (dry)","Peas and grains","g",50]]],
 [["lentil"],[["Lentils (dry)","Peas and grains","g",75]]],
 [["channa"],[["Channa","Peas and grains","can",.65]]],
 [["pigeon"],[["Pigeon peas","Peas and grains","can",.65]]],
 [["bread"],[["Whole-wheat bread","Peas and grains","slice",1]]],
 [["cracker"],[["Whole-wheat crackers","Peas and grains","",1]]],
 [["sweet potato","provision","dasheen","green fig"],[["Provision: sweet potato, dasheen or cassava","Provision and veg","g",160]]],
 [["potato"],[["Potatoes","Provision and veg","g",150]]],
 [["pawpaw"],[["Pawpaw","Fruit and extras","g",150]]],
 [["banana"],[["Bananas","Fruit and extras","",1]]],
 [["zaboca"],[["Zaboca","Fruit and extras","",.07]]],
 [["peanut butter"],[["Peanut butter","Fruit and extras","tbsp",1]]],
 [["peanut"],[["Unsalted peanuts","Fruit and extras","g",1]]],
 [["raisin"],[["Raisins","Fruit and extras","g",1]]],
 [["cucumber"],[["Cucumbers","Provision and veg","",.5]]]
];
var BUY_DEFAULT=[["Vegetables: pak choi, bhagi, cabbage, bodi, okra, pumpkin, carrot","Provision and veg","g",110]];
