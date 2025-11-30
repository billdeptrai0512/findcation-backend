const prisma = require('../prisma/client')
const multer = require("multer")
const path = require("path")
const fs = require("fs");
const { sendVerifyEmail } = require("../utils/sendEmail")
const { syncRooms } = require("../utils/roomManager");

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

      if (listing.numberOfRoom && listing.numberOfRoom > 0) {
        const roomsData = Array.from({ length: listing.numberOfRoom }).map(
          (_, idx) => ({
            name: `Room ${idx + 1}`, // e.g. Room 1, Room 2...
            staycationId: newStaycation.id,
          })
        );

        await prisma.room.createMany({
          data: roomsData,
        });

        console.log(`Created ${listing.numberOfRoom} rooms`);
      }

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
    const allStaycation = await prisma.staycation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log("total listing " + allStaycation.length);

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

exports.oneListing = async (req, res, next) => {

  const { staycationId } = req.params;

  try {
    const staycation = await prisma.staycation.findUnique({
      where: { id: parseInt(staycationId, 10) },
      include: {
        rooms: true,
        host: true,
      },
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

exports.removeListing = async (req, res, next) => {
  const { staycationId } = req.params;

  try {
    const id = parseInt(staycationId, 10);

    // Check if staycation exists
    const staycation = await prisma.staycation.findUnique({
      where: { id },
      include: { rooms: true },
    });

    if (!staycation) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // If you want to remove rooms first (if no cascade rule exists in schema)
    if (staycation.rooms.length > 0) {
      await prisma.room.deleteMany({
        where: { staycationId: id },
      });
    }

    // Remove the staycation itself
    await prisma.staycation.delete({
      where: { id },
    });

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    next(error);
  }
};

exports.socialMedia = async (req, res, next) => {

  const { staycationId } = req.params;
  const { name, code } = req.body

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

exports.editor = async (req, res, next) => {
  const { staycationId } = req.params;
  const { name, features, prices, location, type, numberOfRoom } = req.body;

  try {
    const staycation = await prisma.staycation.findUnique({
      where: { id: parseInt(staycationId, 10) },
      include: { rooms: true },
    });

    if (!staycation) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // sync rooms count if needed
    const newNumberOfRoom = await syncRooms(prisma, staycation, type, numberOfRoom);

    // overwrite the staycation fully
    await prisma.staycation.update({
      where: { id: staycation.id },
      data: {
        name,
        features,
        prices,
        location,
        type,
        numberOfRoom: newNumberOfRoom,
      },
      include: {
        rooms: true,
      },
    });

    const refreshedStaycation = await prisma.staycation.findUnique({
      where: { id: staycation.id },
      include: { rooms: true },
    });

    return res.status(200).json({
      message: "Staycation updated successfully",
      staycation: refreshedStaycation,
    });
  } catch (error) {
    console.error("Error updating staycation:", error);
    next(error);
  }
};

exports.editorImage = [
  upload.array("images"), // multer handles new files
  async (req, res, next) => {
    try {
      const { staycationId } = req.params;

      // 1. Find existing staycation
      const staycation = await prisma.staycation.findUnique({
        where: { id: parseInt(staycationId, 10) },
      });

      if (!staycation) {
        return res.status(404).json({ message: "Staycation not found" });
      }

      // 2. Parse current images (from DB) and new ones (from client)
      const oldImages = staycation.images || [];

      // New images from client (string paths for kept ones)
      const keptImages = req.body.existingImages
        ? JSON.parse(req.body.existingImages)
        : [];

      // Newly uploaded files
      const uploadedImages = req.files.map(
        (file) => `/assets/staycations/${file.filename}`
      );

      const finalImages = [...keptImages, ...uploadedImages];

      // 3. Delete files that are in oldImages but not in finalImages
      const toDelete = oldImages.filter((img) => !finalImages.includes(img));
      toDelete.forEach((imgPath) => {
        const filePath = path.join(__dirname, "..", imgPath);
        fs.unlink(filePath, (err) => {
          if (err) console.warn("Failed to delete:", imgPath, err.message);
        });
      });

      // 4. Update DB
      await prisma.staycation.update({
        where: { id: staycation.id },
        data: { images: finalImages },
      });

      const refreshedStaycation = await prisma.staycation.findUnique({
        where: { id: staycation.id },
        include: { rooms: true },
      });

      res.status(200).json({
        message: "Images updated successfully",
        staycation: refreshedStaycation,
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Image update failed" });
    }
  },
];

exports.editorRoomImage = [
  upload.array("images"),
  async (req, res, next) => {
    try {

      const { staycationId, roomId } = req.params;
      const { name } = req.body;

      // 1. Make sure staycation exists
      const staycation = await prisma.staycation.findUnique({
        where: { id: parseInt(staycationId, 10) },
        include: { rooms: true },
      });

      if (!staycation) {
        return res.status(404).json({ message: "Staycation not found" });
      }

      // 2. Find the room inside staycation
      const room = staycation.rooms.find(
        (r) => r.id === parseInt(roomId, 10)
      );

      if (!room) {
        return res.status(404).json({ message: "Room not found in staycation" });
      }

      // 3. Handle images
      const oldImages = room.images || [];
      const keptImages = req.body.existingImages
        ? JSON.parse(req.body.existingImages)
        : [];
      const uploadedImages = req.files.map(
        (file) => `/assets/staycations/${file.filename}`
      );

      const finalImages = [...keptImages, ...uploadedImages];

      // Delete files no longer used
      const toDelete = oldImages.filter((img) => !finalImages.includes(img));
      toDelete.forEach((imgPath) => {
        const filePath = path.join(__dirname, "..", imgPath);
        fs.unlink(filePath, (err) => {
          if (err) console.warn("Failed to delete:", imgPath, err.message);
        });
      });

      // 4. Update room
      const updatedRoom = await prisma.room.update({
        where: { id: room.id },
        data: { images: finalImages, name },
      });

      // 5. Refresh staycation with rooms
      const refreshedStaycation = await prisma.staycation.findUnique({
        where: { id: staycation.id },
        include: { rooms: true },
      });

      res.status(200).json({
        message: "Room images updated successfully",
        staycation: refreshedStaycation,
        room: updatedRoom,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Room image update failed" });
    }
  },
];




