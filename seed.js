const Sequelize = require("sequelize");
const {
  db,
  Recipie,
  User,
} = require("./server/db/models/index");

const recipies = [
  {
    name: "Pumpkin Bread",
    ingredients: [
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
      ],
    recipie: ["Heat oven to 350 degrees F. Butter a 6-cup loaf pan or coat it with nonstick spray",
    "In a large bowl, whisk together pumpkin, oil, eggs and sugar until smooth."
    , "Sprinkle baking powder, baking soda, salt, cinanmon, nutmeg, ginger and cloves over batter and whisk until well-combined.", "Add flour and stir with a spoon, just until mixed.", "Scrape into prepared pan and smooth the top.", "In a small dish, or empty measuring cup, stir sugar and cinnamon together. Sprinkle over top of batter.",
    "Bake bread for 65 to 75 minutes until a tester poked into all parts of cake (both the top and center will want to hide pockets of uncooked batter) come out batter-free, turning the cake once during the baking time for even coloring.",
    "You can cool it in the pan for 10 minutes and then remove it, or cool it completely in there. The latter provides the advantage of letting more of the loose cinnamon sugar on top adhere before being knocked off.",
    "Cake keeps at room temperature as long as you can hide it. I like to keep mine in the tin with a piece of foil or plastic just over the cut end and the top exposed to best keep the lid crisp as long as possible."]
  }
];

const users = [
  {
    email: "aweis@gmail.com",
    password: "123",
    firstName: "Alex",
    lastName: "Weis",
    creditCard: 123456789,
    adminStatus: true,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "newGuy@gmail.com",
    password: "123",
    firstName: "New",
    lastName: "guy",
    creditCard: 123456781,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "GeorgeCastanza@gmail.com",
    password: "123",
    firstName: "George",
    lastName: "Castanza",
    creditCard: 123456782,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "goodJokes@gmail.com",
    password: "123",
    firstName: "Jerry",
    lastName: "Seinfeld",
    creditCard: 123456783,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "tCruise@gmail.com",
    password: "123",
    firstName: "Tom",
    lastName: "Cruise",
    creditCard: 123456784,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "abc123@gmail.com",
    password: "123",
    firstName: "Michael",
    lastName: "Jackson",
    creditCard: 123456785,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "Kobe@gmail.com",
    password: "123",
    firstName: "Kobe",
    lastName: "Bryant",
    creditCard: 123456786,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "lGags@gmail.com",
    password: "123",
    firstName: "Lady",
    lastName: "Gaga",
    creditCard: 123456787,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "bono@gmail.com",
    password: "123",
    firstName: "Bono",
    lastName: "...",
    creditCard: 123456788,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "dGrohl@gmail.com",
    password: "123",
    firstName: "Dave",
    lastName: "Grohl",
    creditCard: 223456789,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "kCobain@gmail.com",
    password: "123",
    firstName: "Kurt",
    lastName: "Cobain",
    creditCard: 323456789,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "jHendrix@gmail.com",
    password: "123",
    firstName: "Jimi",
    lastName: "Hendrix",
    creditCard: 423456789,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "runninDownADream@gmail.com",
    password: "123",
    firstName: "Tom",
    lastName: "Petty",
    creditCard: 523456789,
    hasPassword: true,
    googleId: "321"
  },
  {
    email: "folk4lyfe@gmail.com",
    password: "123",
    firstName: "Bob",
    lastName: "Dylan",
    creditCard: 623456789,
    hasPassword: true,
    googleId: "321"
  }
];

const seed = () =>
  Promise.all(recipies.map(recipie => Recipie.create(recipie)))
    .then(() => Promise.all(users.map(user => User.create(user))))

// const addPerms = () =>
//   User.findAll({
//     where: {
//       adminStatus: true
//     }
//   })
//   .then(foundUsers => Promise.all(foundUsers.map(user => addPermsToUsers(user))));

// const addPermsToUsers = (user) =>
//   Permission.findAll()
//   .then(foundPerms => Promise.all(foundPerms.map(perm => user.addPermission(perm))));

const main = () => {
  console.log("Syncing db...");
  db
    .sync({ force: true })
    .then(() => {
      console.log("Seeding database...");
      return seed();
    })
    // .then(() => {
    //   console.log("Setting Relationships...");
    //   return addPerms();
    // })
    .then(() => console.log('Finished seeding database!'))
    .catch(err => {
      console.log("Error while seeding");
      console.log(err.stack);
    })
    .then(() => {
      db.close();
      return null;
    });
};

main();
