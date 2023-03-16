const express = require("express")
require("dotenv").config()
const cors = require("cors")
const mongoose = require("mongoose")
const User = require("./mongooseSchema")
const router = require("./Routes")
const cookieParser = require("cookie-parser")
mongoose.set('strictQuery', true);
const { getNotifications, getCurrentChallenge, clearCurrentChallenges, getUpdatedFriends } = require("./utils/socketRequests")

const app = express();
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(cors({
  origin:["https://rockpaperscissorsapp.onrender.com", process.env.GOOGLE_REDIRECT_URI],
  credentials: true
}))
app.use(router)

mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(()=>console.log("connected to mongoose"))
.catch((err) => console.log(err))

const server = require("http").createServer(app)
const io = require("socket.io")(server, {cors:{origin:"https://rockpaperscissorsapp.onrender.com"}})
io.on("connect", (socket) => {
  socket.on("joinRoom", async(room)=>{
    socket.join(room)
  })
  socket.on("newNotification", async(user)=>{
    const notifications = await getNotifications(user)
    socket.to(user).emit("updateNotifications", notifications)
  })
  socket.on("optionSelected", async(user, opponent, verdict, opponentsChoice, myScore, opponentsScore)=>{
    const currentChallengeUser = await getCurrentChallenge(user)
    const currentChallengeOpponent = await getCurrentChallenge(opponent)
    socket.to(user).emit("challengeUpdated", currentChallengeUser)
    if(verdict){
      // change the verdict before sending it to the other player
      let newVerdict = verdict
      if(verdict === "won"){
        newVerdict = "lost"
      }
      if(verdict === "lost"){
        newVerdict = "won"
      }
      socket.to(opponent).emit("challengeUpdated", currentChallengeOpponent,newVerdict, opponentsChoice, myScore, opponentsScore)
      if(currentChallengeUser.roundsPlayed === currentChallengeUser.totalRounds){
        clearCurrentChallenges(currentChallengeUser.me, currentChallengeUser.opponent)
      }
      return
    }
    socket.to(opponent).emit("challengeUpdated", currentChallengeOpponent)
  })
  socket.on("challengeAccepted", async(opponent)=>{
    const currentChallenge = await getCurrentChallenge(opponent)
    socket.to(opponent).emit("startMultiplayerGame", currentChallenge)
  })
  socket.on("sentNewMessage", async(username, friend)=>{
    const updatedFriends = await getUpdatedFriends(username, friend)
    socket.to(friend).emit("receiveNewMessage", updatedFriends)
  })
})

server.listen(process.env.PORT, ()=>console.log(`server has started on port ${5000}`))