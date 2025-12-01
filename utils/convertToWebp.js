const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const folder = path.join(__dirname, "../assets/staycations");

fs.readdir(folder, async (err, files) => {
    if (err) return console.error(err);

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
            const filePath = path.join(folder, file);
            const webpFilename = path.basename(file, ext) + ".webp";
            const webpPath = path.join(folder, webpFilename);

            try {
                await sharp(filePath)
                    .webp({ quality: 80 })
                    .toFile(webpPath);

                console.log(`Converted: ${file} -> ${webpFilename}`);

                // Delete the original file after conversion
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error(`Failed to convert ${file}:`, err);
            }
        }
    }
});
