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