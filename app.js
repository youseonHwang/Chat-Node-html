var express = require('express'),
  port = process.env.PORT || 3000,
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io')(server), // socket.io 를 사용하기 위한 io 객체 생성
  users = { 'test': { id: 'test', pw: 'test' } }, // 기본 회원이 담기는 object (일단 test 계정 만들어놓음)
  onlineUsers = {}; // 현재 online인 회원이 담기는 object

app.use(express.static('public')) //정적 파일 path지정

app.get('/', function (req, res) {
  res.redirect('/chat')
})

app.get('/chat', function (req, res) {
  res.sendFile(__dirname + '/chat.html')
}) // chat 경로는 chat.html랜더링

server.listen(port, () => {
  console.log(`server open ${port}`);
}); // 3000 포트로 서버 open


// 서버에서 이벤트를 보낼때
io.sockets.on('connection', function (socket) { // connection 됐을 경우

  // 해당 사용자가 users 에 있는지 검사
  function joinCheck(data) {
    if (users.hasOwnProperty(data.id)) {
      return true;
    } else {
      return false;
    }
  }

  // 로그인 체크
  function loginCheck(data) {
    if (users.hasOwnProperty(data.id) && users[data.id].pw === data.pw) {
      return true;
    } else {
      return false;
    }
  }

  // 회원가입 요청받았을 경우 
  socket.on("joinUser", function (data, cb) {

    // 존재하는 회원인지 여부 체크
    if (joinCheck(data)) {
      cb({ result: false, data: "이미 존재하는 회원입니다." });
      return false;
    } else {
      users[data.id] = { id: data.id, pw: data.pw };
      cb({ result: true, data: "회원가입에 성공하였습니다." });
    }
  });

  // 로그인 요청받았을 경우
  socket.on("loginUser", function (data, cb) {
    if (loginCheck(data)) { // 일단 유효한지 확인하고 true면
      onlineUsers[data.id] = {
        roomId: 1,
        socketId: socket.id
      };
      socket.join('room1');
      cb({
        result: true,
        data: "로그인에 성공하였습니다."
      });
      updateUserList(0, 1, data.id); // 유저 목록 업데이트
    } else {
      cb({
        result: false,
        data: "등록된 회원이 없습니다. 회원가입을 진행해 주세요."
      });
      return false;
    }
  });

  // joinRoom이벤트가 발생하면 기존 방 떠나고 새로운 방 join
  socket.on('joinRoom', function (data) {
    let id = getUserBySocketId(socket.id);
    let prevRoomId = onlineUsers[id].roomId;
    let nextRoomId = data.roomId;
    socket.leave('room' + prevRoomId);
    socket.join('room' + nextRoomId);
    onlineUsers[id].roomId = data.roomId;
    updateUserList(prevRoomId, nextRoomId, id);
  });

  // member list 업데이트 이벤트 발생 userlist
  // in({지정한 방이름}).emit("이벤트명", "보낼 데이터")
  function updateUserList(prev, next, id) {
    if (prev !== 0) {
      //이전 방에 이벤트 발생시킴
      io.sockets.in('room' + prev).emit("userlist", getUsersByRoomId(prev));
      io.sockets.in('room' + prev).emit("leftedRoom", id);
      console.log("prev" + prev);
    }
    if (next !== 0) {
      //들어온 방에 이벤트 발생시킴
      io.sockets.in('room' + next).emit("userlist", getUsersByRoomId(next));
      io.sockets.in('room' + next).emit("joinedRoom", id);
      console.log("next" + next);
    }
  }

  // 현재 접속중인 user 들중 roomId가 일치하는 사람들의 배열
  function getUsersByRoomId(roomId) {
    let userstemp = [];
    Object.keys(onlineUsers).forEach((el) => { // foreach를 통해 roomId 검증
      if (onlineUsers[el].roomId === roomId) {
        userstemp.push({
          socketId: onlineUsers[el].socketId,
          name: el
        });
      }
    });
    return userstemp;
  }

  //-------------------------메세지 보내기--------------------------------------
  socket.on("sendMessage", function (data) {
    io.sockets.in('room' + data.roomId).emit('newMessage', {
      name: getUserBySocketId(socket.id),
      socketId: socket.id,
      msg: data.msg
    });
  });


  //---------------------------로그아웃--------------------------------------
  // logout이벤트 받으면
  socket.on('logout', function () {
    if (!socket.id) return;
    let id = getUserBySocketId(socket.id);
    let roomId = onlineUsers[id].roomId;
    delete onlineUsers[getUserBySocketId(socket.id)];
    updateUserList(roomId, 0, id);
  });

  // 연결 끊어질때
  socket.on('disconnect', function () {
    if (!socket.id) return;
    let id = getUserBySocketId(socket.id);
    if (id === undefined || id === null) {
      return;
    }
    let roomId = onlineUsers[id].roomId || 0;
    delete onlineUsers[getUserBySocketId(socket.id)];
    updateUserList(roomId, 0, id);
  });

  function getUserBySocketId(id) {
    return Object.keys(onlineUsers).find(key => onlineUsers[key].socketId === id);
  }

});
