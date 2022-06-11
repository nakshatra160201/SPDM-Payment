const express = require("express");
const https = require("https");
// const querystring = require("query-string");
// const fast2sms=require("fast-two-sms");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const parseUrl = express.urlencoded({ extended: false });
const parseJson = express.json({ extended: false });
const YOUR_DOMAIN = "https://spdm-pay.herokuapp.com";
const app = express();
var Publishable_Key =
  "pk_test_51L8pfLSIOgPWEn2dWNaXwRP19A2oh7jo06ShLf6VdlPzQyGZOGPWXKKr5fUgwZ99eiViLmeT8ML2oM2H6SlzNGMn004tAdOH4Q";
var Secret_Key =
  "REMOVED FOR SECURITY PURPOSE ..ITS FED AS ENV VARIABLE AT HEROKU";
const stripe = require("stripe")(Secret_Key);
const cookieParser = require("cookie-parser");
var sessions = require("express-session");
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
const oneDay = 1000 * 60 * 60 * 24;
app.use(
  sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false,
  })
);

mongoose.connect(
  "mongodb+srv://naksh160201:<PASSWORD REMOVED>@nakshatracluster.qrbdl.mongodb.net/?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const codesSchema = new mongoose.Schema({
  machine: { type: String, required: true, unique: true },
  codes: { type: Array, default: [] },
});

const PORT = process.env.PORT || 4000;
const Code = new mongoose.model("Code", codesSchema);

app.get("/", (req, res) => {
  res.render("spdm");
});
app.get("/buy", (req, res) => {
  res.render("home");
});

app.post("/quantity", (req, res) => {
  req.session.machineid = req.body.machineid;
  console.log(req.body.machineid);
  Code.findOne({ machine: req.body.machineid }, function (err, found) {
    if (err) {
      console.log(err);
    } else {
      if (found) {
        if (found.codes.length == 0) res.send("No pads available");
        else res.render("home1", { avlbl: found.codes.length });
      } else {
        res.send("Oh snap ! no such machine exist");
      }
    }
  });
});
app.post("/payment", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: "Pad",
            images: [
              "https://5.imimg.com/data5/OU/BF/LC/SELLER-24394604/sanitary-pad-500x500.jpg",
            ],
          },
          unit_amount: 1000,
        },
        quantity: req.session.quant,
      },
    ],
    mode: "payment",
    success_url: `${YOUR_DOMAIN}/success`,
    cancel_url: `${YOUR_DOMAIN}/failure`,
  });

  res.json({ id: session.id });
});
app.get("/success", function (req, res) {
  Code.findOne({ machine: req.session.machineid }, function (err, found) {
    var arry = [];
    if (err) {
      console.log(err);
    } else {
      if (found) {
        if (found.codes.length == 0) res.send("No pads available");
        else {
          for (var i = 0; i < req.session.quant; i++) {
            arry.push(found.codes.pop());
          }
          found.save(function (err) {
            if (!err) {
              console.log("saved success");
              res.render("success", { arry: arry });
            } else {
              res.send("try later ");
            }
          });
        }
      } else {
        res.send("Oh snap ! no such machine exist");
      }
    }
  });
});
app.get("/failure", function (req, res) {
  res.render("fail");
});

app.post("/payout", function (req, res) {
  req.session.quant = req.body.quant;
  res.render("payment", {
    key: Publishable_Key,
    amt: req.session.quant * 10,
  });
});

app.listen(PORT, () => {
  console.log(`App is listening on Port ${PORT}`);
});
