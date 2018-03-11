const axios = require('axios');



 function findIngredients(){
    let currentItem = recItem;
    let releventIngredients = [];
    let found = false;
    ingredients.forEach(ingredient => {
      found = false;
      parseIngredient(ingredient).forEach(word => {
        console.log('current word: ', word)
        let regex = RegExp(word, 'i');
        if (currentItem.toString().match(regex)){
          found = true;
        }
      })
      if (found){
        releventIngredients.push(ingredient);
      }
    })
    return releventIngredients;
  }

 function findNumsCansEtc(item){
    return item.match(RegExp(/\d+/g)) || item.match(RegExp('can')) || item.match(RegExp('cup'));
  }

 function parseIngredient(ingredient){
    //gets rid of characters that break the regex
    ingredient = ingredient.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    let ingreArr = ingredient.split(' ');
    let returnArr = [];
    ingreArr.forEach(ingre => {
      if(!findNumsCansEtc(ingre)) returnArr.push(ingre);
    })
    return returnArr;
  }


let ingredients = [
  "1 15-ounce can (1 3/4 cups) pumpkin puree",
  "1/2 cup (120 ml) vegetable or another neutral cooking oil or melted butter (115 grams)",
  "3 large eggs",
  "1 2/3 (330 grams) cups granulated sugar",
  "1 1/2 teaspoons baking powder",
  "3/4 teaspoon baking soda",
  "3/4 teaspoon fine sea or table salt",
  "3/4 teaspoon ground cinnamon",
  "Heaped 1/4 teaspoon fresh grated nutmeg",
  "Heaped 1/4 teaspoon ground ginger",
  "Two pinches of ground cloves",
  "2 1/4 cups (295 grams) all-purpose flour",
  "1 tablespoon (12 grams) granulated sugar",
  "1 teaspoon ground cinnamon"
  ]

  let recItem = "Heat oven to 350 degrees F. Butter a 6-cup loaf pan or coat it with nonstick spray"


const ingre = findIngredients();
console.log(ingre);
