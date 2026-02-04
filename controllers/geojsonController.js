const geoip = require("geoip-lite");
const logger = require("../utils/logger");

exports.islandGeoJSON = async (req, res, next) => {
  try {
    const response = await fetch(
      "https://data.opendevelopmentmekong.net/dataset/999c96d8-fae0-4b82-9a2b-e481f6f50e12/resource/234169fb-ae73-4f23-bbd4-ff20a4fca401/download/diaphantinh.geojson"
    );
    const data = await response.json();

    const filteredGeoData = {
      ...data,
      features: data.features.filter(
        (feature) =>
          feature.properties.ten_tinh === "Khánh Hòa" ||
          feature.properties.ten_tinh === "Đà Nẵng"
      ),
    };

    res.status(200).json(filteredGeoData);
  } catch (error) {
    next(error); // để middleware error xử lý
  }
};

// Helper: normalize string (remove diacritics, lowercase)
const normalize = (str) => str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Helper: find city coords from table
const getCityCoords = (city) => {
  if (!city) return null;

  // Direct match first
  if (VIETNAM_CITY_CENTERS[city]) {
    const c = VIETNAM_CITY_CENTERS[city];
    return [c.lat, c.lng];
  }

  // Normalized match (handles diacritics like Huế → Hue)
  const normalizedCity = normalize(city);
  const match = Object.keys(VIETNAM_CITY_CENTERS).find(
    key => normalize(key) === normalizedCity
  );

  if (match) {
    const c = VIETNAM_CITY_CENTERS[match];
    return [c.lat, c.lng];
  }

  return null;
};

exports.getLocationFromIP = (req, res) => {
  let ip =
    req.query.ip ||
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  // Normalize localhost
  if (ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "127.0.0.1") {
    ip = "125.235.174.227"; // Vietnam IP for local testing
    logger.debug(`Mapping localhost IP to ${ip} for geo-testing`);
  }

  const geo = geoip.lookup(ip);

  logger.info(`GeoIP lookup for ${ip}: ${geo ? geo.country + " - " + geo.city : "NULL"}`);

  if (!geo || geo.country !== "VN") {
    return res.json({
      source: "IP",
      confidence: "LOW",
      city: null,
    });
  }

  // Look up city in our table, fallback to GeoIP coords
  const coords = getCityCoords(geo.city);

  // Debug logging - will help diagnose city matching issues
  if (coords) {
    logger.debug(`City "${geo.city}" matched in lookup table → [${coords[0]}, ${coords[1]}]`);
  } else {
    logger.warn(`City "${geo.city}" NOT found in lookup table, falling back to GeoIP coords: ${geo.ll}`);
  }

  res.json({
    source: "IP",
    confidence: "LOW",
    city: geo.city || null,
    region: geo.region || null,
    location: coords || geo.ll || null,
  });
};

// ========== DEBUG/TEST ENDPOINT ==========
// Use this to test city matching without needing actual IPs
// Example: GET /api/geojson/test-location?ip=183.80.181.33&city=Hanoi
exports.testLocationLookup = (req, res) => {
  const { ip, city } = req.query;

  // Test city lookup
  if (city) {
    const coords = getCityCoords(city);
    return res.json({
      test: "CITY_LOOKUP",
      input: city,
      normalizedInput: normalize(city),
      found: !!coords,
      coords: coords,
      allCities: Object.keys(VIETNAM_CITY_CENTERS).slice(0, 10), // Show first 10 for reference
      tip: coords ? "✅ City matched!" : "❌ City not found in lookup table"
    });
  }

  // Test IP lookup
  if (ip) {
    const geo = geoip.lookup(ip);
    const coords = geo?.city ? getCityCoords(geo.city) : null;

    return res.json({
      test: "IP_LOOKUP",
      input: ip,
      geoResult: geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        ll: geo.ll
      } : null,
      cityLookup: {
        city: geo?.city,
        found: !!coords,
        coords: coords,
        fallback: geo?.ll
      },
      finalLocation: coords || geo?.ll || null,
      tip: geo ? (coords ? "✅ City matched in table!" : "⚠️ Using GeoIP fallback coords") : "❌ GeoIP lookup failed"
    });
  }

  return res.json({
    test: "HELP",
    usage: [
      "GET /api/geojson/test-location?city=Hanoi - Test city name matching",
      "GET /api/geojson/test-location?ip=183.80.181.33 - Test IP lookup"
    ],
    availableCities: Object.keys(VIETNAM_CITY_CENTERS)
  });
};


const VIETNAM_CITY_CENTERS = {
  // ===== 5 Centrally-controlled municipalities =====
  "Ho Chi Minh City": { lat: 10.7769, lng: 106.7009 },
  "Hanoi": { lat: 21.0285, lng: 105.8542 },
  "Da Nang": { lat: 16.0544, lng: 108.2022 },
  "Hai Phong": { lat: 20.8449, lng: 106.6881 },
  "Can Tho": { lat: 10.0452, lng: 105.7469 },

  // ===== Northern Vietnam (25 provinces) =====
  // Red River Delta
  "Bac Ninh": { lat: 21.1861, lng: 106.0763 },
  "Ha Nam": { lat: 20.5835, lng: 105.9230 },
  "Hai Duong": { lat: 20.9373, lng: 106.3146 },
  "Hung Yen": { lat: 20.6464, lng: 106.0511 },
  "Nam Dinh": { lat: 20.4200, lng: 106.1683 },
  "Ninh Binh": { lat: 20.2506, lng: 105.9745 },
  "Thai Binh": { lat: 20.4463, lng: 106.3365 },
  "Vinh Phuc": { lat: 21.3609, lng: 105.5474 },

  // Northeast
  "Bac Giang": { lat: 21.2868, lng: 106.1946 },
  "Bac Kan": { lat: 22.1472, lng: 105.8348 },
  "Cao Bang": { lat: 22.6657, lng: 106.2522 },
  "Ha Giang": { lat: 22.8233, lng: 104.9836 },
  "Lang Son": { lat: 21.8537, lng: 106.7615 },
  "Lao Cai": { lat: 22.4856, lng: 103.9707 },
  "Phu Tho": { lat: 21.3227, lng: 105.4019 },
  "Quang Ninh": { lat: 21.0064, lng: 107.2925 },
  "Thai Nguyen": { lat: 21.5928, lng: 105.8442 },
  "Tuyen Quang": { lat: 21.8233, lng: 105.2181 },
  "Yen Bai": { lat: 21.7168, lng: 104.8986 },

  // Northwest
  "Dien Bien": { lat: 21.3860, lng: 103.0230 },
  "Hoa Binh": { lat: 20.8171, lng: 105.3378 },
  "Lai Chau": { lat: 22.3964, lng: 103.4583 },
  "Son La": { lat: 21.3256, lng: 103.9188 },

  // ===== Central Vietnam (19 provinces) =====
  // North Central Coast
  "Ha Tinh": { lat: 18.3559, lng: 105.8877 },
  "Nghe An": { lat: 18.6796, lng: 105.6813 }, // Vinh city
  "Quang Binh": { lat: 17.4690, lng: 106.6222 },
  "Quang Tri": { lat: 16.7943, lng: 107.0718 },
  "Thanh Hoa": { lat: 19.8067, lng: 105.7852 },
  "Thua Thien Hue": { lat: 16.4637, lng: 107.5909 }, // Hue

  // South Central Coast
  "Binh Dinh": { lat: 13.7765, lng: 109.2237 }, // Quy Nhon
  "Binh Thuan": { lat: 10.9289, lng: 108.1021 }, // Phan Thiet
  "Khanh Hoa": { lat: 12.2388, lng: 109.1967 }, // Nha Trang
  "Ninh Thuan": { lat: 11.5752, lng: 108.9829 }, // Phan Rang
  "Phu Yen": { lat: 13.0882, lng: 109.0929 }, // Tuy Hoa
  "Quang Nam": { lat: 15.5394, lng: 108.0191 }, // Tam Ky
  "Quảng Ngãi": { lat: 15.1214, lng: 108.8044 },

  // Central Highlands
  "Dak Lak": { lat: 12.6676, lng: 108.0383 }, // Buon Ma Thuot
  "Dak Nong": { lat: 12.0045, lng: 107.6884 }, // Gia Nghia
  "Gia Lai": { lat: 13.9833, lng: 108.0000 }, // Pleiku
  "Kon Tum": { lat: 14.3498, lng: 108.0004 },
  "Lam Dong": { lat: 11.9404, lng: 108.4583 }, // Da Lat

  // ===== Southern Vietnam (17 provinces) =====
  // Southeast
  "Ba Ria Vung Tau": { lat: 10.3460, lng: 107.0843 }, // Vung Tau
  "Binh Duong": { lat: 10.9804, lng: 106.6519 }, // Thu Dau Mot
  "Binh Phuoc": { lat: 11.7511, lng: 106.7234 }, // Dong Xoai
  "Dong Nai": { lat: 10.9574, lng: 106.8426 }, // Bien Hoa
  "Tay Ninh": { lat: 11.3351, lng: 106.1099 },

  // Mekong Delta
  "An Giang": { lat: 10.3864, lng: 105.4352 }, // Long Xuyen
  "Bac Lieu": { lat: 9.2850, lng: 105.7216 },
  "Ben Tre": { lat: 10.2434, lng: 106.3756 },
  "Ca Mau": { lat: 9.1769, lng: 105.1524 },
  "Dong Thap": { lat: 10.4938, lng: 105.6882 }, // Cao Lanh
  "Hau Giang": { lat: 9.7579, lng: 105.6413 }, // Vi Thanh
  "Kien Giang": { lat: 10.0125, lng: 105.0809 }, // Rach Gia
  "Long An": { lat: 10.5410, lng: 106.4133 }, // Tan An
  "Soc Trang": { lat: 9.6039, lng: 105.9800 },
  "Tien Giang": { lat: 10.3600, lng: 106.3600 }, // My Tho
  "Tra Vinh": { lat: 9.9347, lng: 106.3456 },
  "Vinh Long": { lat: 10.2537, lng: 105.9722 },

  // ===== Major cities (alternative names / GeoIP variations) =====
  "Vinh": { lat: 18.6796, lng: 105.6813 },
  "Huế": { lat: 16.4637, lng: 107.5909 },
  "Nha Trang": { lat: 12.2388, lng: 109.1967 },
  "Vung Tau": { lat: 10.3460, lng: 107.0843 },
  "Bien Hoa": { lat: 10.9574, lng: 106.8426 },
  "Buon Ma Thuot": { lat: 12.6676, lng: 108.0383 },
  "Qui Nhon": { lat: 13.7765, lng: 109.2237 },
  "Da Lat": { lat: 11.9404, lng: 108.4583 },
  "Phan Thiet": { lat: 10.9289, lng: 108.1021 },
  "Rach Gia": { lat: 10.0125, lng: 105.0809 },
  "Long Xuyen": { lat: 10.3864, lng: 105.4352 },
  "Thu Duc City": { lat: 10.8562, lng: 106.7520 },
  "Pleiku": { lat: 13.9833, lng: 108.0000 },
  "My Tho": { lat: 10.3600, lng: 106.3600 },
  "Cao Lanh": { lat: 10.4938, lng: 105.6882 },
  "Phan Rang": { lat: 11.5752, lng: 108.9829 },
  "Tam Ky": { lat: 15.5394, lng: 108.0191 },
  "Tuy Hoa": { lat: 13.0882, lng: 109.0929 },
};