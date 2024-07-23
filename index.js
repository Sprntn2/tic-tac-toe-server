const express = require("express"),
    app = express(),
    PORT = 2500,
    cors = require("cors");

app.use(cors({ origin: '*' }));
app.use(express.json())

const http = require('http')
const server = http.createServer(app)

const socketIO = require("socket.io")
const io = new socketIO.Server(server, {
    cors: {
        origin: '*'
    }
})

require('./socket')(io)





// const sockets = {}
// const games = {}

// const handleNewGame = (data) => {
//     let code = createCode()
//     while(games[code]){
//         code = createCode()
//     }

//     games[code] = {}
// }

// const createCode = () => {
//     // let str = ""
//     // for (let index = 0; index < 6; index++) {
//     //     str += Math.floor(Math.random() * 10)
//     // }
//     // return str
//     let str = Math.floor(Math.random() * 999999).toString()
//     while (str.length < 6){
//         str = "0" + str
//     }
//     return str
// }

// io.on('connection',(socket) => {
//     console.log(`socket id ${socket.id} connected`)

//     let currentCode = null

//     const handleNewGame = (data) => {
//         let code = createCode()
//         while(games[code]){
//             code = createCode()
//         }
//         currentCode = code
    
//         //sockets[socket.id] = code//assign socket to room//כרגע לא ברור מה זה נותן

//         games[code] = {
//             //sockets: [socket.id],
//             rounds: 0,
//             board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
//             //player1: {socketId: socket.id, name: data.name, avatar: data.avatar, win: 0}
//             //player1: { name: data.name, avatar: data.avatar, win: 0},
//             players: {[socket.id]: {name: data.name, avatar: data.avatar, win: 0}}
//         }

//         console.log(games[currentCode].players)

//         console.log("new code:", code)
//         socket.join(code)
//         socket.emit('game-added', code)
//     }

//     const handleJoin = (data) => {
//         console.log("join to game: ", data)
//         if(!games[data.code]){
//             console.log(data.code, "not found")
//             io.emit('game-not-found', data.code, " not found")
//         }else{
//             currentCode = data.code

//             //sockets[socket.id] = currentCode//כרגע לא ברור מה זה נותן

//             socket.join(currentCode)
//             const { name, avatar } = data
//             //games[currentCode].player2 = {name, avatar, win: 0}
//             games[currentCode].players[socket.id] = {name, avatar, win: 0}
//             //games[currentCode].sockets.push(socket.id)
//             console.log(games);
//             //games[currentCode].player2 = {name: data.name, avatar: data.avatar, win: 0}//assign player 2

//             //io.to(games[code].player1.socketId).emit('second-joined')
//             //socket.to(games[currentCode].player1.socketId).emit('opponent-joined', {})
            
//             //event for player 1
//             socket.to(currentCode).emit('opponent-joined', {name, avatar})
//             //games[currentCode].player1.socketId.emit()

//             //event for player 2
//             //first get the another cocketId
//             // const anotherSocketId = Array.from(io.sockets.adapter.rooms.get(currentCode))
//             //     .find(id => id != socket.id)
//             //const anotherSocketId = games[currentCode].sockets.find(id => id != socket.id)
//             const anotherSocketId = Object.keys(games[currentCode].players).find(id => id != socket.id)
//             socket.emit('join-successfully', {
//                 name: games[currentCode].players[anotherSocketId].name, 
//                 avatar:  games[currentCode].players[anotherSocketId].avatar
//             })


//             //io.to(code).emit('start-game')
//             //io.to(games[code].player1.socket)
//             //socket.emit('joined', code)
//             //socket.to(games[code].player1.socket).emit('second-player-joined')
//         }
//     }

//     const handleSign = (sign) => {

//         //console.log("sign is: ", sign, "sign of player 2 is: ", (sign % 2) + 1)
//         //const p2sign = sign % 2 + 1
//         //const p2sign = sign.sign == 1 ? 2 : 1;
//         // games[currentCode].player1.sign = sign
//         // games[currentCode].player2.sign = sign % 2 + 1
//         games[currentCode].players[socket.id].sign = sign
//         //const anotherSocketId = games[currentCode].sockets.find(id => id != socket.id)
//         const anotherSocketId = Object.keys(games[currentCode].players).find(id => id != socket.id)
//         games[currentCode].players[anotherSocketId].sign = sign % 2 + 1
//         //emit event from each player with his sign
        

//         console.log('emit 2 events of sign')
//         //for player 2
//         socket.to(currentCode).emit('sign-selected', sign % 2 + 1)
//         //for player 1
//         socket.emit('sign-selected', sign)
        
        


//         //socket.broadcast.to(roomName).emit('userJoined', {message: `${userName} has joined the room`, userName});
//         //
//         //emit event of start game
//     }

//     const handleMove = (index) => {
//         //1 by socketid find x or o (1 or 2) 
//         //2 check if is empty
//         //3 check if it's there a victory, if it's emit victory
//         //4 emit apply-move
//         if(games[currentCode].board[index] == 0){
//             console.log("apply move");
//             games[currentCode].board[index] = games[currentCode].players[socket.id].sign
//             io.to(currentCode).emit('apply-move',{index, sign: games[currentCode].players[socket.id].sign})
//         }
//         else{
//             io.to(currentCode).emit('illegal-move')
//         }
//     }

//     socket.emit('welcome',{socketId:socket.id})

//     socket.on('new-game', (data) => handleNewGame(data))

//     socket.on('join-game', (data) => handleJoin(data))

//     socket.on('sign-selcted', (sign) => handleSign(sign))

//     socket.on('move', (index) => handleMove(index))
// })



server.listen(PORT, () => console.log(`listening in port ${PORT}`))