const { v4: uuidv4 } = require('uuid');

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { validationResult } = require("express-validator")

const logger = require("../util/logger")

const HttpError = require("../models/http-error")

const User = require("../models/user")

 
const getUsers = async ( req, res, next ) => {
  let users;
    try {
        users = await User.find({},'-password')
    } catch (err) {
        const error = new HttpError('Fetching  users failed , please try again later',500)
        return next(error)
    }

    console.log(JSON.stringify(users.map(user => user.toObject({ getters: true })),null,2))
  
    logger.info('GET USERS')

  res.status(200).json({ users: users.map( user => user.toObject({ getters: true }) ) })
}

const signup = async (req, res, next) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        console.log(JSON.stringify(errors, null,2) )
        return next( new HttpError('Invalid Input passes,  please check your data', 422))
    }


    const { name, email, password } = req.body
    
    let existingUser;

    try {
       existingUser = await User.findOne({ email: email}) 
    } catch (err) {
        const error = new HttpError('Signing Up failed, Please Try again Later', 500)
        return next(error)
    }

    if (existingUser) {
        const error = new HttpError('User Already Exist, Please Login Instead', 422);
        return next(error)
    }

    let hashedPassword;
    try {
       hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError('Could not create user, Please try again later', 500)
         return next(error);
    }

    const createduser = new User({
        name,
        email,
        image : req.file.path,
        password: hashedPassword,
        places: []
    })  
  
    try {
        await createduser.save()
    } catch (err) {
        const error = new HttpError('Sign Up Failed , please try again', 500)
        return next(error)
    } 

    let token;
    try {
        token = jwt.sign({ userId: createduser.id, email: createduser.email }, process.env.JWT_KEY, { expiresIn: '1h'})

    } catch (err) {
        const error = new HttpError('Signup failed,please try agan later', 500)
        return next(error)
    }

    res.status(201).json({ userId: createduser.id, email: createduser.email, token: token });
}

const login = async ( req, res, next ) => {

    const { email, password } = req.body

    let existingUser;

    try {
       existingUser = await User.findOne({ email: email}) 
       console.log(JSON.stringify( existingUser,null,2))
    } catch (err) {
        const error = new HttpError('Signing Up failed, Please Try again Later', 500)
        return next(error)
    }

    if (!existingUser) {
        const error = new HttpError('Invalid credentials, could not log you in', 403);
        return next(error)
    }

    let isValidPassword = false;

    try {
     isValidPassword = await bcrypt.compare(password, existingUser.password)    
    } catch (err) {
        const error = new HttpError('Could not you log in, Please try again later', 500);
        return next(error)
    }

    if (!isValidPassword) {
        const error = new HttpError('Invalid credential, could not you log in', 403)
        return next(error)
    }

    let token;
    try {
      token = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
          process.env.JWT_KEY,
        { expiresIn: "1h" }
      );
    } catch (err) {
      const error = new HttpError("Logging failed, please try again later", 500);
      return next(error);
    }

    res.status(200).json({ userId: existingUser.id, email: existingUser.email, token: token })
}


exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

