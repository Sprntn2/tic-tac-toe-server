const {sockets, games} = require('./localDB')

const createCode = () => {
    let str = Math.floor(Math.random() * 999999).toString()
    while (str.length < 6){
        str = "0" + str
    }
    return str
}

const checkVictory = (board, index) => {
    const currentSign = board[index]
    //check column
    if(board[(index + 3) % 9] == currentSign && board[(index + 6) % 9] == currentSign){
        return [index, (index + 3) % 9, (index + 6) % 9]
    }
    //check row
    if(board[Math.floor(index / 3) * 3 + (index + 1) %  3] == currentSign && board[Math.floor(index / 3) * 3 + (index + 2) %  3] == currentSign){
        return [index, Math.floor(index / 3) * 3 + (index + 1) %  3, Math.floor(index / 3) * 3 + (index + 2) %  3]
    }
    //check 0,4,8 diagonal
    if([0,4,8].includes(index) && board[(index + 4) % 12] == currentSign && board[(index + 8) % 12] == currentSign){
        return [0,4,8]
    }
    //check 2,4,6 diagonal
    if([2,4,6].includes(index) && board[index % 6 + 2] == currentSign && board[(index + 2) % 6 + 2] == currentSign){
        return [2,4,6]
    }
    return null
}



module.exports = (io) => {

    //v2
    const playWithFriend = io.of('/playWithFriend');
    const playSolo = io.of('/playSolo');

    playSolo.on('connection', (socket) => {

        const board = [0,0,0,0,0,0,0,0,0]
        let userSign = 0;
        let robotSign = 0;
        let moves = 0;
        let userWins = 0;
        let robotWins = 0;

        console.log('A user connected to play with a friend:', socket.id);
        socket.emit('welcome',{socketId:socket.id})

        const handleNewSoloGame = (sign) => {
            userSign = sign;
            robotSign = sign % 2 + 1
            
            socket.emit('solo-game-added')
        }

        const handleSoloMove = (index) => {
            if(index < 0 || index > 9 || board[index] != 0){
                socket.emit('illegal-move')
                return
            }
            
            board[index] = userSign
            moves += 1

            const userVictory = moves > 4 && checkVictory(board, index)
            if(userVictory){
                userWins ++;
                return socket.emit('victory', {indexes: userVictory, sign: userSign})
            }
            
            if(moves == 9){
                socket.emit('draw', {index, sign: userSign})
                return
            }

            //for now, add algorithm later
            const empties = []
            for(let i in board){
                if(board[i] == 0)
                    empties.push(i)
            }
            // const empties = board.map((v,i) => {
            //     if(v == 0) return i
            //     return -1
            // }).filter(v => v != -1)
            
            console.log("empties: ",empties)
            const robotMoveIndex = Number(empties[Math.floor(Math.random() * empties.length)])
            //console.log("robotMoveIndex type:", typeof(robotMoveIndex))
            board[robotMoveIndex] = robotSign
            console.log("board now:", board)
            moves += 1
            //const robotVictory = moves > 4 && checkVictory(board, robotMoveIndex)
            const robotVictory = checkVictory(board, robotMoveIndex)
            console.log("robot victory:", robotVictory, "moves:", moves)
            if(robotVictory){
                console.log("robot victory")
                robotWins++;
                return socket.emit('two-moves-victory', {
                    indexes: robotVictory,
                    winSign: robotSign,
                    userIndex: index,
                    userSign
                    // index1: index, 
                    // sign1: userSign,
                    // index2: robotMoveIndex,
                    // sign2: robotSign
                })
            }

            if(moves == 9){
                socket.emit('two-moves-draw', 
                    {
                        index1: index, 
                        index2: robotMoveIndex , 
                        //sign1: userSign, 
                        //sign2: robotSign
                    })
                return
            }

            socket.emit('robot-move', {robotMove:robotMoveIndex, playerMove: index})
        }

        const handleRestart = () => {
            console.log("restart solo game");
            //board = [0,0,0,0,0,0,0,0,0]
            //for(let v of board) v = 0;
            // moves = 0
            if(userSign == 1){
                moves = 0
                board.forEach((v,i) => board[i] = 0)
                console.log("test restart, board:", board)
                return socket.emit('restart-game')
            }
            moves = 1
            const index = Math.floor(Math.random() * 9)
            board.forEach((v,i) => board[i] = i == index? 1 : 0)
            console.log("test restart, board:", board, "index: ", index)
            socket.emit('restart-game-robot-first', index)
        }

        const handleRobotFirst = () => {

            //for now, add algorithm later
            const index = Math.floor(Math.random() * 9)

            console.log("robot forst move, index:", index)
            board[index] = 1 
            socket.emit('robot-first-move', index)
        }

        socket.on('new-solo-game', (sign) => handleNewSoloGame(sign))

        socket.on('move', (index) => handleSoloMove(index))

        //socket.on('leavl-solo-game', handleLeaveSolo)//האם צריך את זה? אפשר פשוט לסגור את החיבור במקום לייצר אירוע

        socket.on('restart-game', handleRestart)

        socket.on('robot-first', handleRobotFirst)

        socket.on('disconnect', () => {
            console.log('User disconnected from play with friend:', socket.id);
        });
    })





    /////////// play with friend ////////

    playWithFriend.on('connection', (socket) => {

        let currentCode = null

        console.log('A user connected to play with a friend:', socket.id);
        socket.emit('welcome',{socketId:socket.id})

        const handleNewGame = (data) => {
            let code = createCode()
            while(games[code]){
                code = createCode()
            }
            currentCode = code
            games[code] = {
                signTurn: 1,
                moves: 0,
                board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                players: {[socket.id]: {name: data.name, avatar: data.avatar, wins: 0}}
            }
            socket.join(code)
            socket.emit('game-added', code)
        }

        const handleJoin = (data) => {
            if(!games[data.code]){
                socket.emit('game-not-found', `${data.code} not found`)
                return
            }
            if(Object.keys(games[data.code].players).length > 1){
                socket.emit('game-is-full', `${data.code} is full` )
                return
            }
            currentCode = data.code
            socket.join(currentCode)
            const { name, avatar } = data
            games[currentCode].players[socket.id] = {name, avatar, win: 0}
            
            //event for player 1
            socket.to(currentCode).emit('opponent-joined', {name, avatar})

            //event for player 2
            const anotherSocketId = Object.keys(games[currentCode].players).find(id => id != socket.id)
            socket.emit('join-successfully', {
                name: games[currentCode].players[anotherSocketId].name, 
                avatar:  games[currentCode].players[anotherSocketId].avatar
            })
        }

        const handleSign = (sign) => {
            games[currentCode].players[socket.id].sign = sign
            const anotherSocketId = Object.keys(games[currentCode].players).find(id => id != socket.id)
            games[currentCode].players[anotherSocketId].sign = sign % 2 + 1
        
            //for player 2
            socket.to(currentCode).emit('sign-selected', sign % 2 + 1)
            //for player 1
            socket.emit('sign-selected', sign)
        }

        const handleMove = (index) => { 
            
            if(index > 0 && index > 9 && currentCode && games[currentCode].board[index] == 0 && signTurn == games[currentCode].players[socket.id].sign){
                const board = games[currentCode].board;
                const currentSign = games[currentCode].players[socket.id].sign
                board[index] = currentSign
                games[currentCode].moves += 1
                signTurn = signTurn % 2 + 1

                const victory = games[currentCode].moves > 4 && checkVictory(board, index)
                if(victory){
                    games[currentCode].players[socket.id].wins += 1
                    return io.to(currentCode).emit('victory', {indexes: victory, sign: currentSign})
                }

                //check draw
                if(games[currentCode].moves == 9){
                    console.log("draw");
                    io.to(currentCode).emit('draw',{index, sign: games[currentCode].players[socket.id].sign})
                    return
                }

                io.to(currentCode).emit('apply-move',{index, sign: games[currentCode].players[socket.id].sign})
            }
            else{
                socket.emit('illegal-move')
            }
        }

        const handleRestart = () => {
            games[currentCode].board = [0,0,0,0,0,0,0,0,0]
            games[currentCode].moves = 0;
            io.to(currentCode).emit('restart-game')
            // socket.to(currentCode).emit('restart-game')//emit to no one when is solo game
            // socket.emit('restart-game')
        }

        const handleLeave = () => {
            delete games[currentCode]?.players[socket.id]
            if(Object.keys(games[currentCode].players).length == 0){
                delete games[currentCode]
            }
            else{
                socket.to(currentCode).emit('opponent-leave', currentCode)
            }
            socket.leave(currentCode);
        }

        socket.on('new-game', (data) => handleNewGame(data))

        socket.on('join-game', (data) => handleJoin(data))

        socket.on('sign-selcted', (sign) => handleSign(sign))

        socket.on('move', (index) => handleMove(index))

        socket.on('restart-game', handleRestart)

        socket.on('leave-game', handleLeave)

        socket.on('disconnect', () => {
            console.log('User disconnected from play with friend:', socket.id);
            //emit leave event
        });
    })

////////////////////////////      end of v2       ///////////////////////////////////////












 
 
 
 
 
 
 
 
 
 
 
 
    /*
    //v1
    io.on('connection',(socket) => {
        console.log(`socket id ${socket.id} connected`)

        let currentCode = null

        const handleNewGame = (data) => {
            let code = createCode()
            while(games[code]){
                code = createCode()
            }
            currentCode = code
            games[code] = {
                moves: 0,
                board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                players: {[socket.id]: {name: data.name, avatar: data.avatar, win: 0}}
            }
            socket.join(code)
            socket.emit('game-added', code)
        }

        const handleNewSoloGame = (sign) => {
            let code = createCode()
            while(games[code]){
                code = createCode()
            }
            currentCode = code
            games[code] = {
                moves: 0,
                board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                userSign: sign
                //socketId: socket.id
            }
            socket.emit('solo-game-added')
        }

        const handleJoin = (data) => {
            if(!games[data.code]){
                //io.emit('game-not-found', data.code, " not found")
                socket.emit('game-not-found', `${data.code} not found`)
                return
            }
            if(Object.keys(games[data.code].players).length > 1){
                socket.emit('game-is-full', `${data.code} is full` )
                return
            }
            currentCode = data.code

            //sockets[socket.id] = currentCode//כרגע לא ברור מה זה נותן

            socket.join(currentCode)
            const { name, avatar } = data
            games[currentCode].players[socket.id] = {name, avatar, win: 0}
            
            //event for player 1
            socket.to(currentCode).emit('opponent-joined', {name, avatar})

            //event for player 2
            const anotherSocketId = Object.keys(games[currentCode].players).find(id => id != socket.id)
            socket.emit('join-successfully', {
                name: games[currentCode].players[anotherSocketId].name, 
                avatar:  games[currentCode].players[anotherSocketId].avatar
            })
        }

        const handleSign = (sign) => {
            games[currentCode].players[socket.id].sign = sign
            // if(games[currentCode].players[socket.id]){
            //     games[currentCode].players[socket.id].sign = sign
            // }
            // else{
            //     if(games[currentCode].userSign)
            // }
            const anotherSocketId = Object.keys(games[currentCode].players).find(id => id != socket.id)
            games[currentCode].players[anotherSocketId].sign = sign % 2 + 1
        
            //for player 2
            socket.to(currentCode).emit('sign-selected', sign % 2 + 1)
            //for player 1
            socket.emit('sign-selected', sign)
        }

        const handleRobotFirst = () => {
            const index = Math.floor(Math.random() * 9)
            console.log("robot forst move, index:", index)
            games[currentCode].board[index] = 1 
            socket.emit('robot-first-move', index)
        }

        const handleSoloMove = (index) => {
            if(index < 0 || index > 9 || !currentCode || games[currentCode].board[index] != 0){
                socket.emit('illegal-move')
                return
            }
            const board = games[currentCode].board;
            const currentSign = games[currentCode].userSign
            //games[currentCode].board[index] = games[currentCode].userSign
            board[index] = games[currentCode].userSign
            games[currentCode].moves += 1

            const userVictory = games[currentCode].moves > 4 && checkVictory(board, index)
            if(userVictory){
                return socket.emit('victory', {indexes: userVictory, sign: currentSign})
            }
            
            if(games[currentCode].moves == 9){
                socket.emit('draw', {index, sign: currentSign})
                return
            }
            //for now, add algorithm later
            const empties = board.map((v,i) => {
                if(v == 0) return i
                return -1
            }).filter(v => v != -1)
            console.log("empties: ",empties)
            const robotMoveIndex = empties[Math.floor(Math.random() * empties.length)]
            board[robotMoveIndex] = games[currentCode].userSign % 2 + 1
            games[currentCode].moves += 1
            const robotVictory = games[currentCode].moves > 4 && checkVictory(board, robotMoveIndex)
            if(robotVictory){
                return socket.emit('victory', {indexes: robotVictory, sign: currentSign % 2 + 1})
            }

            socket.emit('robot-move', {robotMove:robotMoveIndex, playerMove: index})
        }

        const checkVictory = (board, index) => {
            const currentSign = board[index]
            //check column
            if(board[(index + 3) % 9] == currentSign && board[(index + 6) % 9] == currentSign){
                return [index, (index + 3) % 9, (index + 6) % 9]
            }
            //check row
            if(board[Math.floor(index / 3) * 3 + (index + 1) %  3] == currentSign && board[Math.floor(index / 3) * 3 + (index + 2) %  3] == currentSign){
                return [index, Math.floor(index / 3) * 3 + (index + 1) %  3, Math.floor(index / 3) * 3 + (index + 2) %  3]
            }
            //check 0,4,8 diagonal
            if([0,4,8].includes(index) && board[(index + 4) % 12] == currentSign && board[(index + 8) % 12] == currentSign){
                return [0,4,8]
            }
            //check 2,4,6 diagonal
            if([2,4,6].includes(index) && board[index % 6 + 2] == currentSign && board[(index + 2) % 6 + 2] == currentSign){
                return [2,4,6]
            }
            return null
        }

        const handleMove = (index) => { 
            // console.log("current code: ",currentCode)
            if(currentCode && games[currentCode].board[index] == 0){
                const board = games[currentCode].board;
                const currentSign = games[currentCode].players[socket.id].sign
                //games[currentCode].board[index] = currentSign
                board[index] = currentSign
                games[currentCode].moves += 1

                //check if victory and emit victory 
                const victory = checkVictory(board, index)
                if(victory){
                    return io.to(currentCode).emit('victory', {indexes: victory, sign: currentSign})
                }

                //check column
                // if(board[(index + 3) % 9] == currentSign && board[(index + 6) % 9] == currentSign){
                //     return io.to(currentCode).emit('victory', {indexes: [index, (index + 3) % 9, (index + 6) % 9], sign: currentSign})
                // }
                // //check row
                // if(board[Math.floor(index / 3) * 3 + (index + 1) %  3] == currentSign && board[Math.floor(index / 3) * 3 + (index + 2) %  3] == currentSign){
                //     return io.to(currentCode).emit('victory', {indexes: [index, Math.floor(index / 3) * 3 + (index + 1) %  3, Math.floor(index / 3) * 3 + (index + 2) %  3], sign: currentSign})
                // }
                // //check 0,4,8 diagonal
                // if([0,4,8].includes(index) && board[(index + 4) % 12] == currentSign && board[(index + 8) % 12] == currentSign){
                //     return io.to(currentCode).emit('victory', {indexes: [0,4,8], sign: currentSign})
                // }
                // //check 2,4,6 diagonal
                // if([2,4,6].includes(index) && board[index % 6 + 2] == currentSign && board[(index + 2) % 6 + 2] == currentSign){
                //     return io.to(currentCode).emit('victory', {indexes: [2,4,6], sign: currentSign})
                // }

                //check draw
                if(games[currentCode].moves == 9){
                    console.log("draw");
                    //return io.to(currentCode).emit('draw')
                    io.to(currentCode).emit('draw',{index, sign: games[currentCode].players[socket.id].sign})
                    return
                }

                
                // if((board[(index + 3) % 9] == currentSign && 
                //     board[(index + 6) % 9] == currentSign) || 
                //     (board[Math.floor(index / 3) * 3 + (index + 1) %  3] == currentSign &&
                //     board[Math.floor(index / 3) * 3 + (index + 2) %  3] == currentSign) && 
                //     ([0,4,8].includes(index) && board[(index + 4) % 12] == currentSign && 
                //     board[(index + 8) % 12] == currentSign) || 
                //     ([2,4,6].includes(index) && board[index % 6 + 2] == currentSign &&
                //     games[currentCode].board[(index + 2) % 6 + 2] == currentSign)){
                    
                //     console.log("victory")
                //     io.to(currentCode).emit('victory', {index, sign: currentSign})
                //     return
                // }
                games[currentCode].players[socket.id].win += 1
                io.to(currentCode).emit('apply-move',{index, sign: games[currentCode].players[socket.id].sign})
            }
            else{
                //io.to(currentCode).emit('illegal-move')
                socket.emit('illegal-move')
            }
        }

        // const handleRestart = () => {
        //     games[currentCode].board = [0,0,0,0,0,0,0,0,0]

        //     //must to check if is solo game because computer is first case

        //     //io.to(currentCode).emit('restart-game')
        //     socket.to(currentCode).emit('restart-game')//emit to no one when is solo game
        //     socket.emit('restart-game')
        // }

        const handleLeave = () => {
            delete games[currentCode]?.players[socket.id]
            if(Object.keys(games[currentCode].players).length == 0){
                delete games[currentCode]
            }
            else{
                socket.to(currentCode).emit('opponent-leave', currentCode)
            }
            socket.leave(currentCode);
        }

        const handleLeaveSolo = () => {
            console.log("leaving solo game")
            delete games[currentCode]
        }

        socket.emit('welcome',{socketId:socket.id})

        socket.on('new-game', (data) => handleNewGame(data))

        socket.on('join-game', (data) => handleJoin(data))

        socket.on('sign-selcted', (sign) => handleSign(sign))

        socket.on('move', (index) => handleMove(index))

        socket.on('restart-game', handleRestart)

        socket.on('leave-game', handleLeave)

        socket.on('leavl-solo-game', handleLeaveSolo)

        socket.on('new-solo-game', (sign) => handleNewSoloGame(sign))

        socket.on('solo-move', (index) => handleSoloMove(index))

        socket.on('robot-first', handleRobotFirst)
    })
    */
}