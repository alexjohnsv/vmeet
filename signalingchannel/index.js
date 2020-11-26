const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://127.0.0.1:5500'
  }
});
const crypto = require('crypto');

const generateSessionId = async () => {
  const bytes = await crypto.randomBytes(48);
  return bytes.toString('hex');
};

io.on('connection', (socket) => {
  socket.on('create session', async (callback) => {
    const sessionId = await generateSessionId();

    socket.join(sessionId);

    socket.session = {
      id: sessionId,
      isHost: true,
    }

    callback(socket.session);
  })

  socket.on('end session', () => {
    const sessionId = socket.session.id;
    socket.session = null;
    socket.to(sessionId).emit('session ended');
  });

  socket.on('join session', async (sessionId, callback) => {
    socket.join(sessionId);

    socket.session = {
      id: sessionId,
      isHost: false,
    }

    callback(socket.session);

    socket.to(sessionId).emit('initiate call');
  })

  socket.on('message', async (message) => {
    if (message.offer) {
      socket.to(socket.session.id).emit('message', message);
    }

    if (message.answer) {
      socket.to(socket.session.id).emit('message', message);
    }
  });

  socket.on('icecandidate', (message) => {
    socket.to(socket.session.id).emit('icecandidate', message);
  });

});

httpServer.listen(3000);
