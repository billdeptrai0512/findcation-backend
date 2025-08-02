const bcrypt = require('bcryptjs')
const axios = require('axios');
const prisma = require('../prisma/client')

exports.map = async (req, res, next) => {
    
    res.json("hello")
};

exports.search = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });
  
    const apiKey = process.env.GOOGLE_API_KEY;
  
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address: query,
            region: "vn",
            key: apiKey,
          },
        }
      );
  
      res.json(response.data);
    } catch (err) {
      console.error("Geocoding failed:", err.message);
      res.status(500).json({ error: "Geocoding API failed" });
    }
};