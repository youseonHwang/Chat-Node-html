$(function () {

  var socket = io.connect();
  var $userWrap = $('#userWrap');
  var $contentWrap = $('#contentWrap');
  var $loginForm = $('#loginForm');
  var $joinForm = $('#joinForm');
  var $chatForm = $('#chatForm');
  var $roomSelect = $('#roomSelect');
  var $memberSelect = $('#memberSelect');
  var $chatLog = $('#chatLog');
  var roomId = 1;
  var socketId = "";

  // 버튼 클릭시 function
  $("#loginBtn").click(function (e) {
    e.preventDefault();
    $loginForm.show();
    $joinForm.hide();
  });

  $("#joinBtn").click(function (e) {
    e.preventDefault();
    $joinForm.show();
    $loginForm.hide();
  });

  $("#logoutBtn").click(function (e) {
    e.preventDefault();
    socket.emit('logout'); // 로그아웃 이벤트 발생(서버로)
    socketId = "";
    alert("로그아웃되었습니다.");
    $userWrap.show();
    $contentWrap.hide();
  });

  // 로그인폼 제출시
  $loginForm.submit(function (e) {
    e.preventDefault();
    let id = $("#loginId");
    let pw = $("#loginPw");
    if (id.val() === "" || pw.val() === "") { // 유효성 간단 체크
      alert("check validation");
      return false;
    } else {
      socket.emit('loginUser', { //로그인 이벤트 발생
        id: id.val(),
        pw: pw.val()
      }, function (res) {
        if (res.result) {
          alert(res.data);
          socketId = socket.id; //로그인 시 socketId 변수에 본인의 아이디 실음
          roomId = 1;
          id.val("");
          pw.val("");
          $userWrap.hide();
          $contentWrap.show();
          $('#chatHeader').html("Everyone"); //default 채팅방 => Everyone이기때문에
        } else {
          alert(res.data);
          id.val("");
          pw.val("");
          $("#joinBtn").click();
        }
      });
    }
  });

  $joinForm.submit(function (e) {
    e.preventDefault();
    let id = $("#joinId");
    let pw = $("#joinPw");
    if (id.val() === "" || pw.val() === "") {
      alert("check validation");
      return false;
    } else {
      socket.emit('joinUser', { id: id.val(), pw: pw.val() }, function (res) {
        if (res.result) {
          alert(res.data);
          id.val("");
          pw.val("");
          $("#loginBtn").click();
        } else {
          alert(res.data);
          return false;
        }
      });
    }
  });

  /* 새로운 방 클릭시 */
  $roomSelect.on("click", "div", function () {
    if (roomId !== $(this).data('id')) {
      roomId = $(this).data('id');
    }
    $(this).parents().children().removeClass("active");
    $(this).addClass("active");
    $chatLog.html(""); // 채팅 기록을 지우는 코드
    $('#chatHeader').html(`${$(this).html()}`);

    socket.emit('joinRoom', { // joinRoom 이벤트 발생
      roomId
    });
  });

  /* 서버로부터 받은 userlist 이벤트 발생시 
      memberWrap 에 있는 데이터를 서버한테 받은 데이터로 갱신 */
  socket.on('userlist', function (data) {
    let html = "";
    data.forEach((el) => {
      if (el.socketId === socketId) { //본인일 경우
        html += `<div class="memberEl">${el.name} (me)</div>`
      } else {
        html += `<div class="memberEl">${el.name}</div>`
      }
    });
    $memberSelect.html(html);
  });

  /* 유저가 떠날때 공지 */
  socket.on('leftedRoom', function (data) {
    $chatLog.append(`<div class="notice"><strong>${data}</strong> lefted the room</div>`)
  });

  /* 유저가 들어올때 공지 */
  socket.on('joinedRoom', function (data) {
    $chatLog.append(`<div class="notice"><strong>${data}</strong> joined the room</div>`)
  });

  //------------------메세지 보내기------------------------------------------------------------
  $chatForm.submit(function (e) {
    e.preventDefault();
    let msg = $("#message");
    if (msg.val() === "") {
      return false;
    } else {
      let data = {
        roomId: roomId,
        msg: msg.val()
      };
      socket.emit("sendMessage", data);
      msg.val("");
      msg.focus();
    }
  });

  socket.on('newMessage', function (data) {
    if (data.socketId === socketId) { // 이 메세지가 자신이 보낸 것인지 판별
      $chatLog.append(`<div class="myMsg msgEl"><span class="msg">${data.msg}</span></div>`)
    } else {
      $chatLog.append(`<div class="anotherMsg msgEl"><span class="anotherName">${data.name}</span><span class="msg">${data.msg}</span></div>`)
    }
    $chatLog.scrollTop($chatLog[0].scrollHeight - $chatLog[0].clientHeight); // $chatLog 의 스크롤을 가장 하단으로 움직이는 코드
  });

});