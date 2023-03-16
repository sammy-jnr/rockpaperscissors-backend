const User = require("../mongooseSchema") 


const getNotifications = async(username) => {
  const { notifications } = await User.findOne({username})
  return notifications
}

const getCurrentChallenge = async(username) => {
  const { currentChallenge } = await User.findOne({username})
  return currentChallenge
}

const clearCurrentChallenges = async(username, opponentsUsername) => {
  await User.findOneAndUpdate({username}, {$unset: {currentChallenge: 1}})
  await User.findOneAndUpdate({username: opponentsUsername}, {$unset: {currentChallenge: 1}})
}

const getUpdatedFriends = async(username, friend) => {
  const {friends} = await User.findOne({username: friend})
  return friends
}

module.exports = {
  getNotifications,
  getCurrentChallenge,
  clearCurrentChallenges,
  getUpdatedFriends
}