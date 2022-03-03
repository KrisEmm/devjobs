const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config()
require("./config/db");
const path = require("path");
const morgan = require("morgan");
const router = require("./routes");
const hbs = require("express-handlebars");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash = require("connect-flash");
const createError = require("http-errors");
const passport = require("./config/passport");
const app = express();

app.set("view engine", ".hbs");
app.engine(
  ".hbs",
  hbs({
    extname: ".hbs",
    defaultLayout: "layout",
    partialsDir: __dirname + "/views/emails",
    helpers: require("./helpers/handlebars")
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SECRETO,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    })
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use((req, res, next) => {
  // console.log("Cookies: ", req.cookies);
  // console.log("Session: ", req.session);
  res.locals.mensajes = req.flash();
  next();
});

app.use("/", router());
app.use((req, res, next) => {
  next(createError(404, "No encontrado"));
});
app.use((error, req, res, next) => {
  const status = error.status || 500;
  res.locals.mensaje = error.message;
  res.locals.status = status;
  res.render("error");
});

app.listen(process.env.PUERTO, () => {
  console.log("Server is Running on Port:" + process.env.PUERTO);
});
