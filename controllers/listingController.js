const prisma = require('../prisma/client')
const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
  destination: "./assets/staycations",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

exports.newListing = [
  upload.array("images"), // handle files first
  async (req, res, next) => {
    try {
      // Parse JSON fields sent in FormData
      const listing = JSON.parse(req.body.listing);
      const hostId = req.body.hostId;

      const URL = process.env.DB_URL || "http://localhost:3000";
      const savedImages = req.files.map(file => `${URL}/assets/staycations/${file.filename}`);
      listing.images = savedImages;

      const newStaycation = await prisma.staycation.create({
        data: {
          ...listing,
          hostId: parseInt(hostId, 10)
        }
      });

      res.status(201).json(newStaycation);
    } catch (error) {
      console.error(error);
      res.status(400).json("Failed to create listing");
    }
  }
];


exports.allListing = async (req, res, next) => {

    try {
      const allStaycation = await prisma.staycation.findMany();

      console.log(allStaycation)
  
      res.status(200).json(allStaycation);
    } catch (error) {
      next(error); // let your error middleware handle it
    }

};

exports.oneListing = async (req, res, next) => {

}


  
