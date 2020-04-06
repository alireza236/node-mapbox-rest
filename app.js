const express = require("express")
const http = require("http")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const app = express()
const mongoose = require("mongoose")
const parseError = require("parse-error");

const server = http.createServer(app)

const bodyParser = require("body-parser")

const HttpError = require("./models/http-error")

const placeRoutes = require("./routes/places-routes")

const usersRoutes = require("./routes/users-routes");
const logger = require("./util/logger");

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.use('/uploads/images', express.static(path.join('uploads','images')))


app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

//app.use(cors());    

app.get("/",(req,res) => {
   res.status(200).json("API Success")
})

app.use("/api/places",placeRoutes)
app.use("/api/users",usersRoutes)
 
app.use((error,req,res,next) => {
    if (req.file) {
       fs.unlink(req.file.path, (err)=>{
           console.error(err)
       }) 
    }
    if (res.headerSent) {
        return next(error)
    }
    res.status(error.code || 500).json({
        message: error.message || "An unknown error occured"
    })
    logger.error('Internal error:', error.message)
    return next()
})



const PORT = 5000;
const URL = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-ogk05.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(URL,{ useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }).then(()=>{
    server.listen(PORT,() => { console.log(`*Server listen on port ${PORT}\n*connect to the database successful`) })
}).catch(error=> { console.error(error) })

process.on('unhandledRejection', error => {
    console.error('Uncaught Error', parseError(error));
});