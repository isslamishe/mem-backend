

require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs')
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { type } = require('os');
const authMiddleware = require('./authent');
const app = express();
const port = 5000 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://172.16.0.2:3000']
}));
app.use(express.static(path.join(__dirname, '../frontend')));

const jwt_key = "la flame";
const jwt_key_second_auth = "traviss kalot";  
const salt = crypto.randomBytes(16);  
const key = crypto.pbkdf2Sync(
  jwt_key_second_auth, 
  salt,
  100000,
  32,
  'sha256' // Hash algorithm
);

app.use(cors());
const httpServer = createServer(app);
const mongoURI =
  "mongodb+srv://isslam:isslam20092004@cluster0.xg8la.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";



mongoose
  .connect(mongoURI, {})
  .then(() => console.log("Connected to MongoDB Atlas!"))
  .catch((err) => console.error("Error connecting to MongoDB:"));



const anonsment = new mongoose.Schema({
  text: String,
  sender: String,
  createdAt: { type: Date, default: Date.now }
});
const Anonsment = mongoose.model('Anonsment', anonsment);



const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
});
const PrivetMassages = mongoose.model('PRIVETMassages', messageSchema);




// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://172.16.0.2:3000'],
    methods: ['GET', 'POST']
  }
});


function encryptID(id, key) {
  const iv = crypto.randomBytes(16); // Generate a random 16-byte IV
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(id.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedID: encrypted };
}
function decryptID(encryptedData, key) {
  console.log('start')
  const iv = Buffer.from(encryptedData.iv, 'hex');
  console.log('start')
  const decipher = crypto.createDecipheriv('aes-256-cbc',key, iv);
  console.log('start')
  let decrypted = decipher.update(encryptedData.encryptedID, 'hex', 'utf8');
  console.log('start')
  decrypted += decipher.final('utf8');
  return parseInt(decrypted); 
}


const checkuser=(token)=>{


  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token,jwt_key); 
 
   return decoded

  } catch (error) {
    return error 
  }
}




const activeUsers = new Map(); // { userId: socketId }


io.on('connection', (socket) => {
 
 





  socket.on('send-id',async (data)=>{

   
    try{ 
      
    const user = await checkuser(data.token)
    
    const id = user.userId
    const ROLE = user.ROLE
      const newId = await encryptID(data,key)
      const iv = newId.iv
    activeUsers.set(iv,id, socket.id);
    
    socket.emit('your-id',({newId ,ROLE}))
  }
  catch(err){
    console.error('ur  id  not valid',err );
    socket.emit('error', 'Failed to load history');
  }
      });

      socket.on('send-private-message', async (data) => { 
       
       
       
        try {

         const senderId = jwt.verify( data.senderID,jwt_key).userId; 
          const recipientId = jwt.verify( data.token,jwt_key).contactId
         const senderUser = await USERS.findOne({ _id: senderId }).exec();
         const senderName = senderUser.FIRST_NAME


           const recipientUser = await USERS.findOne({ _id: recipientId }).exec();
           const recipientName = recipientUser.FIRST_NAME
          const { text } = data;
           console.log(recipientName)
          const newMessage = new PrivetMassages({
            text,
            sender: senderId,
            recipient: recipientId,
            createdAt: new Date()
          });
         
          await newMessage.save();
    
         

         
          const recipientSocketId = activeUsers.get(recipientId);
          const targetSocket = io.sockets.sockets.get(recipientSocketId);
          if (targetSocket) {
            io.sockets.sockets.get(recipientSocketId).emit('new-private-message', 
               {
                text,
                sender:senderName,
                recipientId:'you'
              }
             );
              console.log('kiki love me ')
          }
          
          socket.emit('new-private-message',    {
            ...newMessage.toObject(),
             text,
            sender:'me',
            recipientId:recipientName
          });
    
        } catch (err) {
          console.error('Private message error:');
          socket.emit('error', 'Failed to send private message');
        }
      });
      socket.on('request-private-history', async (data) => {
    
   
        try {
          const pageSize = 50;
          const skip = (1 - 1) * pageSize;
         
          const history = await PrivetMassages.find({
            $or: [
              { sender: data.userId, recipient: data.otherUserId },
              { sender: data.otherUserId, recipient: data.userId }
            ]
          }).sort({ createdAt: 1 });
          // Newest first for pagination
        
    
          socket.emit('private-message-history', history); // Oldest first in UI
        } catch (err) {
          console.error('Atlas query error:' );
          socket.emit('error', 'Failed to load history');
        }
      });



 /* socket.on('request-history', async () => {
    try {
    
      const history = await Anonsment.find()
        .sort({ createdAt: 1 }) // Get oldest first
        .limit(50);
      socket.emit('message-history', history);
    
    } catch (err) {
      console.error('History error:', err);
      socket.emit('error', 'Failed to load history');
    }
  });
  socket.on('send-message', async (msg) => {
    try {
   
      const newMessage = new Anonsment({
        text: msg.text,
        sender: msg.senderID,
        createdAt: new Date()
      });
      
      await newMessage.save();
      io.emit('new-message', {
        ...newMessage.toObject(),
        sender: msg.senderID
      });
    } catch (err) {
      console.error('Save error:', err);
    }
  })*/
});

// Start Server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`io socket running on port ${PORT}`);
});




















const userSchema = new mongoose.Schema({
    FIRST_NAME: { type: String , required: true },
    LAST_NAME: { type: String , required: true },
    PASSWORD: { type: String , required: true },
    ROLE: { type: String , required: true },
    EMAIL: { type: String , required: true, unique: true },
    Contacts: [{
      type: String,
      trim: true,
     
    }]
  });
const USERS = mongoose.model('USERS',userSchema)
     

const pics = new mongoose.Schema({
  pic_id: { type: String, required: true },
  pic_data: { type: String, required: true },
  PASSWORD: { type: String, required: true },

});
const PICS = mongoose.model('PICS',pics)
























app.get('/',(req ,res)=>{


        res.sendFile(path.join(__dirname, '../frontend', 'HTMLPAGES/next_tut/app/page.js'));
 
   

})
app.get('/GetRole',authMiddleware,(req ,res)=>{


  const user = req.user 
  const newId = encryptID(user.userId,key)
const role=user.ROLE

  res.json({newId,role})

 
   

})

app.get('/login',async (req,res)=>{
  
   let {password ,email} = req.query
   
   let user = await USERS.findOne({ EMAIL: email })
  console.log(user)
             const ismatch = await bcrypt.compare(password,user.PASSWORD)
              if(!ismatch){
                  
                  return res.status(401).json({ error: 'Invalid email or password' });

              }
      
         const token = jwt.sign({userId:user.id,userRole:user.ROLE},jwt_key,{ expiresIn: "7d" })
         
   
    res.json({token})
             
})

app.get('/signin',async(req,res)=>{
   
   let {PASSWORD ,EMAIL,LAST_NAME,FIRST_NAME,ROLE} = req.query
  
   let hashedpass  = await bcrypt.hash(PASSWORD,10)
   
   
   let newuser = new USERS({
    ROLE,
    FIRST_NAME,
    PASSWORD:hashedpass,
    LAST_NAME,
    EMAIL,

   })
  await newuser.save()
  res.send('done')
})

app.get('/API/contacts-with-messages',authMiddleware, async (req, res) => {

  try {
    const uuser = req.user 
    const userId = uuser.userId 
    
    const contectstokens= []
    
    const user = await USERS.findOne({ _id: userId }); 
    const contacts=  user.Contacts
   
    const contactsWithMessages = await Promise.all(
      contacts.map(async (contactId) => {
        const history = await PrivetMassages.find({
          $or: [
            { sender: userId, recipient: contactId },
            { sender: contactId, recipient: userId },
          ],
        }).sort({ createdAt: 1 });
     const  history2 = history.map((h)=>{
        if(h.sender.toString() === user._id.toString()){
          const createdAt = h.createdAt
          const recipient  ='other'
          const sender = 'you'
          const status = h.status
          const text = h.text
          const _id = h._id
          return {createdAt,_id,text,recipient,sender,status}
        }else{
          const createdAt = h.createdAt
          const recipient  ='you'
          const sender = 'other'
          const status = h.status
          const text = h.text
          const _id = h._id
          return {createdAt,_id,text,recipient,sender,status}
        }
        
       })
        const hashedContactId = jwt.sign({contactId:contactId},jwt_key,{ expiresIn: "1d" })
        const recipientUser = await USERS.findOne({ _id: contactId }).exec();
           const recipientName = recipientUser.FIRST_NAME
        contectstokens.push({hashedContactId,recipientName})
        return { recipientName, messages: history2 };
      })
    );
   

    res.json({ contectstokens, messages: contactsWithMessages });
  } catch (err) {
    res.json({ error: ' there is a Server error' });
  }
});


app.get('/getpic',(req ,res)=>{
  const imgPath = path.join(__dirname, '../frontend', '/imgs/annie-spratt-QckxruozjRg-unsplash.jpg');
  res.sendFile(imgPath);

})









app.listen(port,()=>{
    

    console.log('this shit start working  ')

})