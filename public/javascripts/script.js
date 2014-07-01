document.addEventListener('DOMContentLoaded', function() {

  var socket = undefined;

  function addMessage(msg) {
    var list = document.querySelectorAll('.message ul');
    if (list.length) {
      var li = document.createElement('li');
      var text = document.createTextNode(msg);
      li.appendChild(text);
      list[0].appendChild(li);
    }
  }

  function connect() {
    socket = io.connect('localhost:3000');
    socket.on('error', function (reason) {
      addMessage(reason);
    });

    socket.on('connect', function () {
      addMessage('Info: Connected to the server.');

      setInterval(function(){
        socket.emit('ping', { });
      }, 1000);
    });

    socket.on('disconnect', function () {
      addMessage('Info: Disconnect from the server.');
    });

    socket.on('reconnecting', function () {
      addMessage('Info: Trying to re-connecting to the server.');
    });

    socket.on('pong', function (data) {
      addMessage('Pong received: ' + data.msg);
    });
  }

  connect();
});
