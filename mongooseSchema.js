const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
})
const friendSchema = new mongoose.Schema({
  username: String,
  imgUrl: String,
  messages: [messageSchema]
})
const notificationSchema = new mongoose.Schema({
  sender: String,
  imgUrl: String,
  text: String,
  type: String,
  id:String,
  totalRounds: Number,
  gameMode: String
})
const currentActiveGameSchema = new mongoose.Schema({
  myScore: Number,
  opponentsScore: Number,
  mode: String,
  me: String,
  opponent: String,
  roundsPlayed: Number,
  totalRounds: Number,
  myChoice: String,
  opponentsChoice: String,
})


const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  hash: String,
  salt: String,
  url: String,
  profileAwsPath: String,
  score: Number,
  friends: [friendSchema],
  notifications: [notificationSchema],
  currentChallenge: currentActiveGameSchema,
  friendRequestsSent: [String], 
  friendRequestsReceived: [String], 
})

const User = mongoose.model("user",userSchema)
module.exports = User
