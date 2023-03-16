require("dotenv").config()
const jwt = require("jsonwebtoken")

const generateAccessToken = (id) => {
  return jwt.sign({
    id: id
  },
  process.env.ACCESS_TOKEN_SECRET_KEY,
  {expiresIn: "1d"},
  )
} 
const generateRefreshToken = (id) => {
  return jwt.sign({
    id: id,
  },
  process.env.REFRESH_TOKEN_SECRET_KEY,
  {expiresIn: "7d"},
  )
}

const generateNewTokens = (refreshToken, id) => {
  let newAccessToken
  let newRefreshToken 
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY, (err, user) => {
    if(err) return res.status(400).json({msg: "invalid refresh token"})
    newAccessToken = generateAccessToken(id)
    newRefreshToken = generateRefreshToken(id)
  })
  return {newAccessToken, newRefreshToken}
}

module.exports ={ 
  generateAccessToken,
  generateRefreshToken,
  generateNewTokens
}