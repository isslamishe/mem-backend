
const mongoose = require("mongoose");

const mongoURI =
  "mongodb+srv://isslam:isslam20092004@cluster0.xg8la.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";




  mongoose
  .connect(mongoURI, {})
  .then(() => console.log("Connected to MongoDB Atlas!"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));










function run_shemas(){

const userSchema = new mongoose.Schema({
    FIRST_NAME: { type: String, required: true },
    LAST_NAME: { type: String, required: true },
    PASSWORD: { type: String, required: true },
    ROLE: { type: Number, required: true },
    EMAIL: { type: String, required: true, unique: true },
  });
const USERS = mongoose.model('USERS',userSchema)
             






}

module.exports = run_shemas