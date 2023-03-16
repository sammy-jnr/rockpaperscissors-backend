const jwt = require("jsonwebtoken")
require("dotenv").config()
const User = require("../mongooseSchema")


const verifyUser = (req,res,next) => {
  const authHeader = req.headers.authorization
  if(authHeader){
  const token = authHeader.split(" ")[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, async(err,user)=>{
    if (err){
      return res.status(403).json({data: "token invalid"})
    }
    req.user = await User.findById(user.id)
    next();
  })
    }else{
      res.status(401).json({data: "unAuthenticated"})
    }
}

module.exports = verifyUser