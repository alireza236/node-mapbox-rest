const request = require("request-promise")

const HttpError = require("../models/http-error")

   const getCoordsForAddress = async (address) => {
      try {
        
          const response =  await request({
             uri: `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.MAPBOX_API_KEY}&cachebuster=1584019481444&autocomplete=true&country=id&types=address%2Cpoi%2Cplace%2Cregion%2Cdistrict`,
              headers: {
                    'User-Agent': 'Request-Promise'
                },
              json: true // Automatically parses the JSON string in the response
            })
            
             let [ lng, lat ] = response.features[0].geometry.coordinates
            
             let coordinates = {
               lng,
               lat 
              }
              console.log("RESPON COORDINATES", coordinates )
              
             return coordinates;

          } catch (error) {
             throw new HttpError(error.message)
          }
  }  

  module.exports = getCoordsForAddress;