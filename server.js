const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
process.env.MONGO_URI="mongodb+srv://FCC-mongo-pj:fccmongopj@cluster0-lktoh.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(process.env.MONGO_URI);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const Schema = mongoose.Schema;

const ExerciseSchema = new Schema({ description: String ,duration: Number, date: Date}, { _id: false });
const UserSchema = new Schema({ username: String, exercise: [ExerciseSchema] });

const User = mongoose.model('User', UserSchema);

const ObjectId = mongoose.Types.ObjectId;

// adds the user
app.post("/api/exercise/new-user", function (req, res) {
  
  User.create({username:req.body.username},function (err,user){
    if(err){console.error(err)}
    return res.json({ username:user["username"], id:user["_id"] });
  });

})
// adds the exercise
app.post("/api/exercise/add", function (req, res) {
  
  if (req.body.date==""){
    req.body.date=new Date()}
  
  User.findById(req.body.userId, function (err,user){
    if(err){console.error(err)}
    user.exercise.push(req.body);
    user.save();    
    return res.json(user);
  });

  //5e0e7f21e77d0a6a1f202612
  
})
// gets all users
app.get("/api/exercise/users", function (req, res) {
    
  User.find({},"username _id", function (err,users){
    if(err){console.error(err)}  
    return res.json(users);
  });

  
  
})
// gets all exercises
app.get("/api/exercise/log/", function (req, res) {
    
  let userId = req.query.userId;
  let from = (typeof req.query.from === 'undefined') ? new Date("1900-01-03T19:11:14.819Z") : new Date(req.query.from);
  let to = (typeof req.query.to === 'undefined') ? new Date() : new Date(req.query.to);
  let limit = Number(req.query.limit);
    
  
    
  
  User.aggregate([{$match:{_id: ObjectId(userId)}},{$project:{_id: false,"count": {$size: "$exercise"}}}]).exec( function (err,amount){
    if(err){console.error(err)}
    if (isNaN(limit)){limit=amount[0].count}
    
    User.aggregate([
    {$match:{_id: ObjectId(userId)}},
    {$unwind:"$exercise"},
    {$match:{$and:[{"exercise.date":{$lte:to}},{"exercise.date":{$gte:from}}]} },
    {$group:{
      _id:"$_id",
      username:{$first:"$username"},
      "count": {$sum: 1},
      exercise:{$push:{date:"$exercise.date",description:"$exercise.description"}}}},
    {$project:{
      _id:1,
      username:1,
      count:1,
      exercise:{$slice:["$exercise",limit]}
    }}
  ]).exec( function (err,daterange){
    if(err){console.error(err)}
    
    
    return res.json(daterange);
  })
    
    /*
    User.findOne({_id:userId},"username exercise").slice('exercise',[0,limit]).lean().exec( function (err,exercises){
      if(err){console.error(err)}
      exercises.count = amount[0].count;

      return res.json(exercises);
    })
    */
  })  
  
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
