const axios = require("axios")

const getUserInfoWithGoogle = async(client_id, client_secret, redirect_uri, code)  => {

  const data = await getAccessToken(client_id, client_secret, redirect_uri, code)
  const userInfo = await getUserInfo(data)
  return userInfo
}

const getAccessToken = async(client_id, client_secret, redirect_uri, code) => {
  try {
    const { data } = await axios({
      withCredentials: true,
      url: `https://oauth2.googleapis.com/token`,
      method: "post",
      data:{
       client_id,
       client_secret,
       redirect_uri,
       grant_type: "authorization_code",
       code
      }
    })
    return data
  } catch (error) {
    console.log(error)
  }
}

const getUserInfo = async(data) => {
  try {
    const userInfo = await axios({
      withCredentials: true,
      url: `https://www.googleapis.com/oauth2/v2/userinfo`,
      method: "get",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      }
    })
    return   userInfo.data
    } catch (error) {
      console.log(error)
    }
}

module.exports = getUserInfoWithGoogle