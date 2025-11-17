const fs = require("fs");
const path = require("path");
const prisma = require('../prisma/client');
const imageDir = path.join(__dirname, "../assets/staycations");

(async () => {
  try {
    const listings = await prisma.staycation.findMany({ select: { images: true } });
    const usedImages = new Set(listings.flatMap(l => l.images || []));

    const files = fs.readdirSync(imageDir);
    let deleted = 0;

    for (const file of files) {
      const relPath = `/assets/staycations/${file}`;
      if (!usedImages.has(relPath)) {
        fs.unlinkSync(path.join(imageDir, file));
        deleted++;
      }
    }

    console.log(`✅ Cleanup done. Deleted ${deleted} unused image(s).`);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
})();
