// app.js
require('dotenv').config();
require('./passport');
const express = require("express");
const cors = require("cors")
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

// Static assets
app.use('/assets/avatar', express.static(path.join(__dirname, 'assets/avatar')));
app.use("/assets/staycations", express.static(path.join(__dirname, "assets/staycations")));
app.use("/assets/geo", express.static(path.join(__dirname, "assets/geo")));

// Routers
const map = require("./routes/mapRouter")

const login = require("./routes/loginRouter");
const auth = require("./routes/authRouter")

const suggestion = require("./routes/suggestionRouter")
const listing = require("./routes/listingRouter")
const geojson = require("./routes/geojsonRouter")

app.use("", map)
app.use("/auth", auth)
app.use("/login", login);
app.use("/suggestion", suggestion)
app.use("/listing", listing)
app.use("/geojson", geojson)

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`Express app listening on port ${PORT}!`));

