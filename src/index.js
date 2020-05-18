const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersinroom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, '../public')

app.use(express.static(publicDirPath))

// socket.emit - to specific client
// io.emit - to everyone connected
// socket.broadcast.emit - to everyone except the specific client
// io.to.emit - to everyone in a specific room
// socket.broadcast.to.emit - to everyone except specific client, limited to a chatroom

let count = 0
io.on('connection', (socket) => {
  console.log('New WebSocket connection')
  

  socket.on('join', ({username, room}, callback) => {
    const {error, user} = addUser({id: socket.id, username, room})
    if(error) {
      return callback(error)
    }
    socket.join(user.room)

    socket.emit('message', generateMessage('Admin','Welcome!'))
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersinroom(user.room)
    })

    callback()
    
  })

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id)
    const filter = new Filter()
    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed!')
    }
    io.to(user.room).emit('message', generateMessage(user.username, message))
    callback('Delivered!')
  })

  socket.on('sendLocation', (coords, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q= ${coords.latitude}, ${coords.longitude}`))
    callback()
  })
  socket.on('disconnect', () => {
    const user = removeUser(socket.id)
    if(user) {
      io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`))
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersinroom(user.room)
      })
    }
    
  })

})

server.listen(port, () => {
  console.log('Server is up on port' + port)
})