const peerConnection = new RTCPeerConnection();

const localStream = new MediaStream();
const localVideo = document.querySelector('#localVideo');
localVideo.srcObject = localStream;

const constraints = {
  video: true,
  audio: true
};

navigator.mediaDevices.getUserMedia(constraints)
.then((stream) => {
  stream.getVideoTracks().forEach(videoTrack => localStream.addTrack(videoTrack));
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  main();
}).catch((err) => {
  console.log(err);
});

function getHash() {
  if (window.location.hash) {
    return window.location.hash.substring(1);
  }
  return false;
}

function setHash(value) {
  window.location.hash = value;
}

function main() {
  const socket = io('http://127.0.0.1:3000');

  const createSessionButton = document.querySelector('.create-session');
  const joinSessionButton = document.querySelector('.join-session');
  const closeSessionButton = document.querySelector('.close-session');

  const sessionId = getHash();

  if (sessionId) {
    createSessionButton.classList.add('hide');
    joinSessionButton.classList.remove('hide');
  }

  joinSessionButton.addEventListener('click', (e) => {
    socket.emit('join session', sessionId, (response) => {
      joinSessionButton.classList.add('hide');
      closeSessionButton.classList.remove('hide');
    });
  });

  createSessionButton.addEventListener('click', (e) => {
    socket.emit('create session', (response) => {
      setHash(response.id);
      createSessionButton.classList.add('hide');
      joinSessionButton.classList.add('hide');
      closeSessionButton.classList.remove('hide');
    });
  })

  socket.on('initiate call', () => {
    peerConnection.createOffer({offerToReceiveVideo: 1})
    .then((offer) => {
        peerConnection.setLocalDescription(offer);
        socket.emit('message', { 'offer': offer });
    })
  })

  socket.on('message', async (message) => {
    if (message.offer) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('message', {'answer': answer});
    }
    if (message.answer) {
      const remoteDesc = new RTCSessionDescription(message.answer);
      await peerConnection.setRemoteDescription(remoteDesc);
    }
  });

  peerConnection.onicecandidate = (e) => {
    socket.emit('icecandidate', {'candidate': e.candidate});
  };

  socket.on('icecandidate', (e) => {
    if (e.candidate !== null) {
      peerConnection.addIceCandidate(e.candidate);
    }
  });

  const remoteStream = new MediaStream();
  const remoteVideo = document.querySelector('#remoteVideo');
  remoteVideo.srcObject = remoteStream;

  peerConnection.ontrack = (e) => {
    remoteStream.addTrack(e.track, remoteStream);
  };

  peerConnection.onconnectionstatechange = (e) => {
    if (peerConnection.connectionState === 'connected') {
      remoteVideo.classList.remove('hide');
    }
  }
}
