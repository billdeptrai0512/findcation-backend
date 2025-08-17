// app.js
require('dotenv').config();
require('./passport');
const express = require("express");
const cors = require("cors")
const session = require("express-session") ;
const cookieParser = require('cookie-parser');
const path = require('path');




const app = express();
app.use(cors({
    origin: ['https://findcation-eight.vercel.app', 'http://localhost:5173'], // danh sách các origin được phép
    credentials: true, // nếu bạn dùng cookie / session
}));

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use("/assets/staycations", express.static(path.join(__dirname, "assets/staycations")));
app.use("/geo", express.static(path.join(__dirname, "assets/geo")));

app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        sameSite: "none",  // important for cross-site cookies
        secure: true,      // must be true when using https (ngrok/vercel)
      },
    })
  );


const map = require("./routes/mapRouter")
const login = require("./routes/loginRouter");
const register = require("./routes/registerRouter")
const auth = require("./routes/authRouter")
const suggestion = require("./routes/suggestionRouter")
const listing = require("./routes/listingRouter")
const geojson = require("./routes/geojsonRouter")

app.use("", map)
app.use("/auth", auth)
app.use("/login", login);
app.use("/register", register)
app.use("/suggestion", suggestion)
app.use("/listing", listing)
app.use("/geojson", geojson)

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