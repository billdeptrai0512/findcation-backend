const prisma = require('../prisma/client')
const multer = require("multer")
const path = require("path")
const { sendVerifyEmail } = require("../utils/sendEmail")


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
      const email = req.body.email

      // const URL = process.env.DB_URL || "http://localhost:3000"; we call backend url with file name on front end so save only name and path is fine
      const savedImages = req.files.map(file => `/assets/staycations/${file.filename}`);
      listing.images = savedImages;

      console.log(listing)

      const newStaycation = await prisma.staycation.create({
        data: {
          ...listing,
          hostId: parseInt(hostId, 10)
        }
      });

      console.log("New staycation created:", newStaycation);

      // it get the user's email and send to it
      await sendVerifyEmail(email, newStaycation);

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

      console.log("total listing " + allStaycation.length)
  
      res.status(200).json(allStaycation);
    } catch (error) {
      next(error); // let your error middleware handle it
    }

};

exports.allVerifiedListing = async (req, res, next) => {

  try {
    const allStaycation = await prisma.staycation.findMany();

    // Lọc ở tầng JS
    const verifiedStaycations = allStaycation.filter((staycation) => {
      const { contacts } = staycation;
      return (
        contacts?.facebook?.verified === true &&
        contacts?.instagram?.verified === true &&
        contacts?.zalo?.verified === true
      );
    });

    console.log("number verified listing " + verifiedStaycations.length);

    res.status(200).json(verifiedStaycations);
  } catch (error) {
    next(error);
  }

};

// allVerifiedListing

// allPaidListing

exports.oneListing = async (req, res, next) => {

  const { staycationId } = req.params;

  console.log(staycationId)

  try {
    const staycation = await prisma.staycation.findUnique({
      where: { id: parseInt(staycationId, 10) },
    });

    if (!staycation) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(staycation);
  } catch (error) {
    console.error("Error fetching listing:", error);
    next(error); // let your error middleware handle it
  }

}

exports.socialMedia = async (req, res, next) => {

  const { staycationId } = req.params;
  const {  name, code } = req.body

  try {
    const staycation = await prisma.staycation.findUnique({
      where: { id: parseInt(staycationId, 10) },
    });

    if (!staycation) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const contacts = staycation.contacts;

    if (!contacts || !contacts[name]) {
      return res.status(400).json({ message: `Invalid social media name: ${name}` });
    }

    if (contacts[name].code !== code) {
      return res.status(400).json({ message: "Verification failed: wrong code" });
    }

    contacts[name].verified = true;

    const updatedStaycation = await prisma.staycation.update({
      where: { id: parseInt(staycation.id, 10) },
      data: {
        contacts,
      },
    });

    return res.status(200).json({
      message: `${name} verified successfully`,
      staycation: updatedStaycation,
    });

  } catch (error) {
    console.error("Error fetching listing:", error);
    next(error); // let your error middleware handle it
  }


}


  
