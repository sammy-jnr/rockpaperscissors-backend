const S3 = require("aws-sdk/clients/s3")
require("dotenv").config()
const fs = require("fs")
const util = require("util")



const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey
})

const deleteFilesAfterUpload = util.promisify(fs.unlink)

const uploadFile = (file) => {
  const fileStream = fs.createReadStream(file.path)
  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename
  }
  return s3.upload(uploadParams).promise()
}

const deleteOldProfilePicture = async(path) => {
  if(!path)return
  s3.deleteObject({Bucket: bucketName, Key:path},(err) => {
      if(err) console.log(err)
    })
}

module.exports = {
  uploadFile,
  deleteFilesAfterUpload,
  deleteOldProfilePicture
}