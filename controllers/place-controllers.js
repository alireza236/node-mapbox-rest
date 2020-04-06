const  { promises : fs } = require("fs")

const { v4: uuidv4 } = require('uuid');
const mongoose = require("mongoose") 

const { validationResult } = require("express-validator")

const HttpError = require("../models/http-error")

const getCoordsForAddress = require("../util/location")

const Place = require("../models/place")
const User = require("../models/user");
const logger = require('../util/logger');

 

const getPlaceById = async (req, res, next) => {

    const { pid } = req.params;
    
    let place;
    try {
       place = await Place.findById(pid) 
    } catch (err) {
        const error =  new HttpError('Something went wrong, please try again later', 500)
        return next(error)
    }

    if (!place) {
        const error = new HttpError('Could not find a place for the provide Id', 404)
        return next(error)
    }

    console.log(JSON.stringify(place.toObject({ getters: true }),null,2))
    
    res.status(200).json({place: place.toObject({ getters: true })});
    
}

const getPlacesByUserId = async (req, res, next) => {

    const { uid } = req.params;
    
    let userWithPlaces;
    
    try {
        userWithPlaces =  await User.findById( uid ).populate("places")
    } catch (err) {
       const error = new HttpError('Fetching Place failed, please try again later', 500)
       return next( error)   
    }
    
    if (!userWithPlaces || userWithPlaces.length === 0 ) {
        return next(
            new Error('could not find users id provided',404 )
            ) 
        }
     console.log(JSON.stringify(userWithPlaces,null,2))
    
     res.status(200).json({places:userWithPlaces.places.map(place => place.toObject({ getters: true }))});
 }

 const createPlace = async (req, res, next) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        console.log(JSON.stringify(errors, null,2) )
        next(new HttpError('Invalid Input passes,  please check your data', 422)) 
    }

    const { title, description, address } = req.body
    
     let coordinates;
    try {
      coordinates = await getCoordsForAddress(address)
    } catch (error) {
      return next(error)  
    }  
    
    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;
    try {
        console.log("req user id",req.userData.userId)
        user = await User.findById(req.userData.userId)
    } catch (err) {
        const error = new HttpError('Creating place failed, please try again later', 500)
        return next(error) 
    }

    if (!user) {
        const error = new HttpError('Could not find provider Id', 404)
        return next(error)
    }

    console.log("USER",user)
    console.log("USER ID",user.id)

    try {
       
        // Transaction create place mode off
       const sess = await mongoose.startSession();
       sess.startTransaction();
       await createdPlace.save(({ session: sess }));
       user.places.push(createdPlace);
       //console.log("TRANS", sess)
       await user.save({ session: sess });
       await sess.commitTransaction(); 

       /* await createdPlace.save()
       user.places.push(createdPlace)
       await user.save() */  

    } catch (err) {
      console.error(err)  
      const error = new HttpError(`Creating place failed, please try again later ${err}`,500)
      return next(error)  
    }

    res.status(200).json({ place: createdPlace})
}


const updatePlace = async (req,res,next)=>{

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        console.log(JSON.stringify(errors, null,2) )
        return next( new HttpError('Invalid Input passes,  please check your data', 422) )
    }
        const { title, description } = req.body
        const { pid } = req.params

        let place;
        try {
            place = await Place.findById(pid)
        } catch (err) {
            const error = new HttpError('Something went wrong, please try again later', 500)
            return next(error)
        }
       
        console.log("P",place.creator.toString())
        console.log("R",req.userData.userId)

       if (place.creator.toString() !== req.userData.userId) {
            const error = new HttpError('You are not allowed edited this place', 401)
            return next(error)
        }

        place.title = title;
        place.description = description;

        console.log(place)

        try {
            await place.save()
        } catch (err) {
            const error = new HttpError('Something went wrong,cannot be update', 500)
            return next(error)
        }
        logger.info('UPDATE PLACES')
        console.log(place)
        res.status(200).json({ place: place.toObject({ getters: true }) } )
    }


const deletePlace = async (req, res, next ) => {
       
       const { pid } = req.params;

       let place;
       try {
          place = await Place.findById(pid).populate("creator"); 
       } catch (err) {
           const error = new HttpError('Something went wrong', 500)
           return next(error)
       }

       if (!place) {
           const error = new HttpError("Could not find place for this id", 500)
           return next(error)
       }

       if (place.creator.id !== req.userData.userId) {
          const error = new HttpError('You are not allowed deleted this place', 401)
          return next(error)
        }
       const imagePath = place.image
       
       try {

         // Transaction delete mode off
          const sess = await mongoose.startSession()
          sess.startTransaction()
          await place.remove({ session: sess })
          place.creator.places.pull(place)
          await place.creator.save({ session: sess })
          await sess.commitTransaction()  

          /* await place.remove()
          place.creator.places.pull(place)
          await place.creator.save() */
            
       } catch (err) {
          const error = new HttpError(`Something went wrong ${err}`, 500)
          return next(error) 
       }
       
       try {
         await fs.unlink(imagePath)
       } catch (err) {
           console.error(err)
       }
       
   
       logger.info("DELETED PLACES")
       res.status(200).json({ message: "Delete place"})
}

 exports.getPlaceById = getPlaceById;
 exports.getPlacesByUserId = getPlacesByUserId;
 exports.createPlace = createPlace;
 exports.updatePlace = updatePlace;
 exports.deletePlace = deletePlace;