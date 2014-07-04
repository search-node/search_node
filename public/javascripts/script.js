document.addEventListener('DOMContentLoaded', function() {

  var socket = undefined;

  function connect() {
    socket = io.connect();
    socket.on('error', function (reason) {
    });

    socket.on('connect', function () {
      //addMessage('Info: Connected to the server.');

      $('.js--search-field').keyup(function () {
        socket.emit('search', { search: $(this).val(), fields: ['title'], sort: 'orientation' });
      });
    });

    socket.on('disconnect', function () {
    });

    socket.on('reconnecting', function () {
    });

    socket.on('result', function (data) {
    });
  }

  connect();
});
