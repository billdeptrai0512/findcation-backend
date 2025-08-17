const fs = require("fs") ;
const axios = require('axios');

const SOURCE_URL = "https://data.opendevelopmentmekong.net/dataset/999c96d8-fae0-4b82-9a2b-e481f6f50e12/resource/234169fb-ae73-4f23-bbd4-ff20a4fca401/download/diaphantinh.geojson";
const OUTPUT_PATH = "./assets/geo/vn_islands.geojson";

async function run() {
  try {
    console.log("⏳ Fetching GeoJSON from source...");
    const res = await axios.get(SOURCE_URL);
    const data = res.data

    console.log(data)

    console.log("⏳ Filtering features...");
    const filteredGeoData = {
      ...data,
      features: data.features.filter(
        (feature) =>
          feature.properties.ten_tinh === "Khánh Hòa" ||
          feature.properties.ten_tinh === "Đà Nẵng"
      ),
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(filteredGeoData, null, 2));
    console.log(`✅ Saved filtered GeoJSON to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("❌ Failed:", err);
  }
}

run();