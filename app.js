// app.js
require('dotenv').config();
require('./passport');
const express = require("express");
const cors = require("cors")
const cookieParser = require('cookie-parser');
const path = require('path');




const app = express();
app.use(cors({
    origin: 'http://localhost:5173', // hoặc domain thật nếu deploy
    credentials: true, // nếu bạn dùng cookie / session
}));

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use("/assets/staycations", express.static(path.join(__dirname, "assets/staycations")));




const map = require("./routes/mapRouter")
const login = require("./routes/loginRouter");
const register = require("./routes/registerRouter")
const auth = require("./routes/authRouter")
const suggestion = require("./routes/suggestionRouter")
const listing = require("./routes/listingRouter")

app.use("", map)
app.use("/auth", auth)
app.use("/login", login);
app.use("/register", register)
app.use("/suggestion", suggestion)
app.use("/listing", listing)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Express app listening on port ${PORT}!`));


//We need login and register routes 
//We need refferal code, so only allow user will refferal code to register

//We have : User / Host
//We have : Staycation = { GPS, name, price, picture[], address ,hostId }

// filter web interaction


//how many new sign in user

//session start
//how many times they click to view a location
//