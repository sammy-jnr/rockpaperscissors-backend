const express = require("express")
const verifyUser = require("./Middleware/verify")
const {genPassword, validPassword} =  require("./config/password-config")
const multer = require("multer") 
const upload = multer({dest: "uploads/"})
const crypto = require("crypto")
const User = require("./mongooseSchema")
const { generateAccessToken, generateRefreshToken, generateNewTokens} = require("./utils/generateTokens")
const { gameVerdict } = require("./utils/calculateVerdict")
const router = express.Router()
const {  uploadFile, deleteFilesAfterUpload, deleteOldProfilePicture } = require("./utils/aws-s3")
const getUserInfoWithGoogle = require("./utils/google")
require("dotenv").config()


router.post("/register",async (req,res) => {
  const { password, username, email } = req.body

  const salt = crypto.randomBytes(32).toString("hex")
  const hash = genPassword(password,salt)

  const user = await User.findOne({username: username})
  if(user) {
    return res.status(400).json({msg: "username unavailable"}); 
  }

  const usedEmail = await User.findOne({email: email})
  if(usedEmail) {
    return res.status(400).json({msg: "email has been used please login"}); 
  }
  User.create({
    username,
    hash,
    salt,
    email,
    friends: [],
    score: 0,
    notifications: [],
    currentChallenge: undefined,
    friendRequestsSent: [],
    friendRequestsReceived: []
  })
  .then(async()=>{
    try {
      const user = await User.findOne({username: username})
      const id = user.id
      const accessToken = generateAccessToken(id)
      const refreshToken = generateRefreshToken(id)
      res.json({
        username,
        accessToken,
        refreshToken,
    })
    } catch (error) {
      console.log("jwt failed")
    }
  })
  .catch(err => {
    res.status(500).json({msg: "an error occurred while creating user"})
  })
})

router.post("/login", async(req,res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({email: email})

    if(!user){
      return res.status(400).json({msg: "user not found"})
    }

    const { hash, salt, id, username } = user
    
    if(!validPassword(password, hash, salt)){
      return res.status(400).json({msg: "wrong password"})
    }

    const accessToken = generateAccessToken(id)
    const refreshToken = generateRefreshToken(id)
    res.json({
      username,
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.log("jwt failed")
    res.status(500).json({msg: "an error occurred while trying to login."})
  }

})


router.post("/registerGoogle", async(req,res) => {
  const { code } = req.body
    getUserInfoWithGoogle(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_REGISTER,
    code)
    .then(async(userData)=>{
      const existingUser = await User.findOne({username: userData.given_name})
      const usedEmail = await User.findOne({email: userData.email})

      if(usedEmail) {
      return res.status(400).json({msg: "email has been used please login"}); 
      }
      if(existingUser) {
        userData.given_name = `${userData.given_name.substring(4)}${Math.floor(Math.random() * 1000)}}`
      }
  
      await User.create({
        username: userData.given_name,
        email: userData.email,
        friends: [],
        score: 0,
        url: userData.picture,
        notifications: [],
        currentChallenge: undefined,
        friendRequestsSent: [],
        friendRequestsReceived: []
      })

      const user = await User.findOne({username: userData.given_name})
      console.log(user)
        const id = user.id
        const accessToken = generateAccessToken(id)
        const refreshToken = generateRefreshToken(id)
        res.json({
          username: userData.given_name,
          accessToken,
          refreshToken,
      })
    })
    .catch(err => console.log(err))
})


router.post("/loginGoogle", async(req,res) => {
  const { code } = req.body
  try {
    const userData = await getUserInfoWithGoogle(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_LOGIN,
    code
  )

    const existingUser = await User.findOne({email: userData.email})

    if(!existingUser){
      return res.status(400).json({msg: "user not found"})
    }
    const { id } = existingUser
    const accessToken = generateAccessToken(id)
      const refreshToken = generateRefreshToken(id)
      res.json({
        username: userData.given_name,
        accessToken,
        refreshToken,
      })
  } catch (error) {
    console.log(error)
    res.status(500).json({msg: "couldn't login with google"})
  }
  
})



router.post("/newAccessToken", async(req,res) => {
  const {refreshToken, username} = req.body
  const user = await User.findOne({username:username})
  if(!user) return console.log("user not found")

  const {newAccessToken, newRefreshToken} = generateNewTokens(refreshToken, user.id)
  res.json({
    newAccessToken,
    newRefreshToken
  })
})

router.post("/user",verifyUser,  async(req,res) => {
  const user = req.user
  if(!user) console.log("user not found")
  const {username, url, score, friends, notifications, currentChallenge, friendRequestsSent, friendRequestsReceived} = user
  res.json({
    username,
    url,
    score,
    friends,
    notifications: notifications.reverse(),
    currentChallenge,
    friendRequestsSent,
    friendRequestsReceived
  })
})

router.post("/changeName",verifyUser, async(req,res) => {
    const { newName } = req.body
    const { id, friends, username } = req.user
    console.log(id)
    try {
      const existingUser = await User.findOne({username: newName})
    if(existingUser){
      return res.status(400).json({msg: "a user with that username already exist"})
    }
    await User.findByIdAndUpdate({_id: id},{username: newName})
    res.json({newName})
    friends.forEach(async(item) => {
      await User.findOneAndUpdate({username: item.username, "friends.username": username},{ "friends.$.username": newName}) 
    })
    } catch (error) {
      console.log(error)
    }
    
})

router.post("/updateProfilePicture", upload.single("profile"),verifyUser, async(req,res) => {
  const uploadedFile = await uploadFile(req.file)
  const  { username, profileAwsPath, friends } = req.user
  if(profileAwsPath){
    deleteOldProfilePicture(profileAwsPath)
  }
  try {
    await deleteFilesAfterUpload(req.file.path)
    await User.findOneAndUpdate({username}, {url: uploadedFile.Location, profileAwsPath: req.file.path})
    res.json({url: uploadedFile.Location})
  } catch (error) {
    res.status(500).json({msg: "an error occurred"})
    await deleteFilesAfterUpload(req.file.path)
  }
  friends.forEach(async(item) => {
    await User.findOneAndUpdate({username: item.username, "friends.username": username},{ "friends.$.url": uploadedFile.Location}) 
  })
  
})

router.put("/updateScore",verifyUser, async(req,res) => {
    const {score, username} = req.user
    const verdict = req.body.verdict
    let newScore
    switch (verdict) {
      case "won":
        newScore = score + 1
        await User.findOneAndUpdate({username: username}, {score: newScore})
        return res.json({msg: "updated"})
      case "lost":
        if(score < 1)return
        newScore = score - 1
        await User.findOneAndUpdate({username: username}, {score: newScore})
        return res.json({msg: "updated"})
      default:
      break;
    }
})

router.get("/getAllUsers", verifyUser,  async(req,res) => {
  const { friends, username } = req.user
  console.log("verified")
    const users = await User.find();
    let newArr = users
    // remove all friends
    console.log(users)
    friends.forEach((element) => {
      newArr = newArr.filter(item => item.username !== element.username)
    })
    // remove user
    newArr = newArr.filter(item => item.username !== username)
    console.log(newArr)
    let usersArray = []
    newArr.forEach(user => {
      let {imgUrl, username} = user.friends
      usersArray.push({username: user["username"], url: user["url"], friends: {imgUrl, username}}) 
    })
    let sortedUsersArray = usersArray.sort((a,b) => a.username.localeCompare(b.username))
    console.log(sortedUsersArray)
    res.json({msg: sortedUsersArray})
})

router.post("/sendFriendRequest",verifyUser, async(req,res) => {
  const { friendUsername, notificationId } = req.body
  const {friendRequestsSent, id, username, url} = req.user
  try {
    await User.findOneAndUpdate({username: friendUsername},{
      $push: {notifications: {type: "friendRequest",sender: username, id: notificationId, text: "sent you a friend request", imgUrl: url}, friendRequestsReceived: username},
      }) 
    await User.findByIdAndUpdate(id,{$push: { friendRequestsSent: friendUsername }})
    res.json({msg: [...friendRequestsSent, friendUsername]})  
  } catch (error) {
    res.status(500).json({msg: "couldn't send friend request"})
  }
})

router.post("/cancelFriendRequest",verifyUser, async(req,res) => {
  const { friendUsername } = req.body
  const {friendRequestsSent, id, username} = req.user
  try {
    const otherUser = await User.findOne({username: friendUsername})
    // since only one friend request can be made we can filter out the request with the next line of code 
    const newNotificationArray = otherUser.notifications.filter(item => item.type !== "friendRequest" && item.sender !== username)
    await User.findOneAndUpdate({username: friendUsername},{$pull: { friendRequestsReceived: username }, notifications: newNotificationArray}) 
    await User.findByIdAndUpdate(id,{$pull: { friendRequestsSent: friendUsername }})
    res.json({msg: friendRequestsSent.filter(item => item !== friendUsername)})  
  } catch (error) {
    res.status(500).json({msg: "couldn't remove friend request"})
  }
  
})

router.post("/acceptFriendRequest",verifyUser, async(req,res) => {
  const { friendUsername, notificationId } = req.body
  const { id, username, url, notifications} = req.user
  try {
    // update for user's friend
    const friend = await User.findOne({username: friendUsername}) 
    const newRequestsSent_Friend = friend.friendRequestsSent.filter(item => item !== username)
    const newFriendsList_Friend = [...friend.friends, {username, imgUrl: url ?? "", messages: []}]
    await User.findOneAndUpdate({username: friendUsername},{friends: newFriendsList_Friend, friendRequestsSent: newRequestsSent_Friend})

    // update for user
    await User.findByIdAndUpdate(id,{
      $pull: { friendRequestsReceived: friendUsername }, 
      notifications:  notifications.filter(item => item.id !== notificationId), 
      $push: {friends: {username: friend.username, imgUrl: friend.url ?? "", messages: []}}
    })
    res.json({msg: notifications.filter(item => item.id !== notificationId).reverse()})  
  } catch (error) {
    res.status(500).json({msg: "Error while accepting friend request"})
  }
  
})

router.post("/rejectFriendRequest",verifyUser, async(req,res) => {
  const { friendUsername, notificationId } = req.body
  const { id, username, notifications, url} = req.user
  try {
    // update for user's friend
    const friend = await User.findOne({username: friendUsername}) 
    const newRequestsSent_Friend = friend.friendRequestsSent.filter(item => item !== username)
    const newNotifications = [...friend.notifications, {type: "message", sender: username, id: notificationId, text: "rejected your friend request", imgUrl: url}]
    await User.findOneAndUpdate({username: friendUsername},{notifications:newNotifications, friendRequestsSent: newRequestsSent_Friend})

    // update for user
    await User.findByIdAndUpdate(id,{
      $pull: { friendRequestsReceived: friendUsername }, 
      notifications:  notifications.filter(item => item.id !== notificationId), 
    })
    res.json({msg: notifications.filter(item => item.id !== notificationId).reverse()})  
  } catch (error) {
    res.status(500).json({msg: "Error while rejecting friend request"})
  }
  
})

router.post("/removeFriend",verifyUser, async(req,res) => {
  const { friendUsername } = req.body
  const {id, username, friends} = req.user
  try {
    await User.findOneAndUpdate({username: friendUsername},{$pull: { friends: {username: username} }}) 
    await User.findByIdAndUpdate(id,{$pull: { friends: {username: friendUsername} }})
    res.json({msg: friends.filter(item => item.username !== friendUsername)})
  } catch (error) {
    res.status(500).json({msg: "couldn't remove friend"})
  }
  
})

router.post("/sendMessage",verifyUser, async(req,res) => {
  const { friendUsername, message } = req.body
  const {username, friends} = req.user
  const friend = friends.filter(user => user.username === friendUsername)[0]
  const updatedMessages = [...friend.messages,{sender: username, message}]
  try {
    await User.findOneAndUpdate({username: friendUsername, "friends.username": username},{ "friends.$.messages": updatedMessages}) 
    await User.findOneAndUpdate({username, "friends.username": friendUsername},{ "friends.$.messages": updatedMessages}) 
    res.json({msg: updatedMessages})
  } catch (error) {
    res.status(500).json({msg: "couldn't send message"})
  }
  
})

router.post("/sendChallenge",verifyUser, async(req,res) => {
  const { opponentUsername, totalRounds, gameMode, notificationId } = req.body
  const { username, url} = req.user
  try {
    await User.findOneAndUpdate({username: opponentUsername},
      {$push : {notifications: {type: "challenge", sender: username, text: "sent you a challenge", imgUrl:url , gameMode,totalRounds, id: notificationId}}}
    )
    res.json({msg: notificationId})
  } catch (error) {
    res.status(500).json({msg: "couldn't send challenge"})
  }
})

router.post("/cancelChallenge",verifyUser, async(req,res) => {
  const { opponentUsername, challengeId } = req.body
  try {
    await User.findOneAndUpdate({username: opponentUsername},
      {$pull : {notifications: {id: challengeId}}}
    )
    res.json({msg: "successful"})
  } catch (error) {
    res.status(500).json({msg: "couldn't send challenge"})
  }
})

router.post("/acceptChallenge",verifyUser, async(req,res) => {
  const { opponentUsername, gameMode, totalRounds, notificationId } = req.body
  const {id, username} = req.user
  const activeGameMe  = {
    myScore: 0,
    opponentsScore: 0,
    mode: gameMode,
    me: username,
    opponent: opponentUsername,
    roundsPlayed: 0,
    totalRounds,
    myChoice: "",
    opponentsChoice: "",
  }
  const activeGameOpponent  = {
    myScore: 0,
    opponentsScore: 0,
    mode: gameMode,
    me: opponentUsername,
    opponent: username,
    roundsPlayed: 0,
    totalRounds,
    myChoice: "",
    opponentsChoice: "",
  }
  try {
    await User.findOneAndUpdate({username: opponentUsername},{currentChallenge: activeGameOpponent})
    await User.findOneAndUpdate({username}, { $pull :{notifications :{id: notificationId }} , currentChallenge: activeGameMe})
    res.json({msg: "successful"})
  } catch (error) {
    res.status(500).json({msg: "couldn't accept challenge"})
  }
})

router.post("/deleteNotification",verifyUser, async(req,res) => {
  const { notificationId } = req.body
  const {username} = req.user
  try {
    await User.findOneAndUpdate({username},
      {$pull : {notifications: {id: notificationId}}}
    )
    res.json({msg: "successful"})
  } catch (error) {
    console.log(error)
    res.status(500).json({msg: "couldn't delete notification"})
  }
})

router.post("/selectedOption",verifyUser, async(req,res) => {
  const { option, opponentUsername } = req.body
  const {username, currentChallenge} = req.user
  try {
    const opponent = await User.findOne({username: opponentUsername})
    if(opponent.currentChallenge.myChoice === ""){
      await User.findOneAndUpdate({username: opponentUsername}, {"currentChallenge.opponentsChoice": option})
      await User.findOneAndUpdate({username}, {"currentChallenge.myChoice": option})
      return res.json({msg: "successful"})
    }else{
      const verdict = gameVerdict(option, opponent.currentChallenge.myChoice)
      let myScore, opponentsScore
      if(verdict === "won"){
        myScore = currentChallenge.myScore + 1;
        opponentsScore = opponent.currentChallenge.myScore
      }
      if(verdict === "lost"){
        myScore = currentChallenge.myScore;
        opponentsScore = opponent.currentChallenge.myScore + 1;
      }
      if(verdict === "draw"){
        myScore = currentChallenge.myScore;
        opponentsScore = opponent.currentChallenge.myScore;
      }
      await User.findOneAndUpdate({username}, {currentChallenge: {
        mode: currentChallenge.mode,
        me: currentChallenge.me,
        opponent: currentChallenge.opponent,
        totalRounds: currentChallenge.totalRounds,
        myChoice: "", 
        opponentsChoice: "", 
        roundsPlayed: opponent.currentChallenge.roundsPlayed + 1,
        myScore,
        opponentsScore
      }})
      await User.findOneAndUpdate({username: opponentUsername}, {currentChallenge: {
        mode: currentChallenge.mode,
        me: currentChallenge.opponent,
        opponent: currentChallenge.me,
        totalRounds: currentChallenge.totalRounds,
        myChoice: "", 
        opponentsChoice: "", 
        roundsPlayed: opponent.currentChallenge.roundsPlayed + 1,
        myScore: opponentsScore,
        opponentsScore: myScore
      }})
      let frontendVerdict
      if(opponent.currentChallenge.roundsPlayed + 1 === opponent.currentChallenge.totalRounds){
        if(myScore > opponentsScore){
          frontendVerdict = "won"
        }else if( myScore < opponentsScore){
          frontendVerdict = "lost"
        }else{
          frontendVerdict = "draw"
        }
      }else{
        frontendVerdict = "nextround"
      }
      res.json({verdict: frontendVerdict, 
        opponentsChoice:opponent.currentChallenge.myChoice, 
        myScore, 
        opponentsScore, 
        myChoice: option, 
        roundsPlayed: currentChallenge.roundsPlayed + 1
      })
    }
  } catch (error) {
    res.status(500).json({msg: "couldn't send challenge"})
  }
})

router.put("/clearMultiplayerGame", verifyUser, async(req,res)=>{
  const {username} = req.user
  await User.findOneAndUpdate({username},{$unset: {currentChallenge: 1}})
  res.json({msg: "successful"})
})


module.exports = router

