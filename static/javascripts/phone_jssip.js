'use strict';

const sipUser = '1000';
const sipUri = $.cookie('sipUri');
const sipWsUri = $.cookie('sipWsUri');
const stunUri = $.cookie('stunUri');

const localVideo = $('.local_video');
const remoteVideo = $('.remote_video');

let session;

const callOptions = {
  pcConfig:
      {
        hackStripTcp: true, // Важно для хрома, чтоб он не тупил при звонке
        rtcpMuxPolicy: 'negotiate', // Важно для хрома, чтоб работал multiplexing. Эту штуку обязательно нужно включить на астере.
        iceServers: []
      },
  mediaConstraints: {
    audio: true,
    video: true
  }
};

const socket = new JsSIP.WebSocketInterface('wss://sipwebrtc2.ddns.net:7443');
const bwPhone = new JsSIP.UA({
  'uri': `${sipUser}@${sipUri}`,
  'password': `sippass-90210x${sipUser}`,
  'sockets': [socket],
  //'stun': stunUri
});
bwPhone.start();

bwPhone.on("registered", function () {
  console.log('registered')
});

bwPhone.on("newRTCSession", function (data) {
  const newsession = data.session; // outgoing call session here

  if (session) {
    //session.terminate();
  }
  session = newsession;

  newsession.on("ended", function () {
    console.log('the call has ended');
  });
  newsession.on("failed", function (e) {
    console.log(`unable to establish the call: ${e}`);
  });
  newsession.on('addstream', function (e) {
    // set remote audio stream (to listen to remote audio)
    // remoteAudio is <audio> element on page
    //remoteVideo.src = window.URL.createObjectURL(e.stream);
    remoteVideo.srcobject = e.stream;
    remoteVideo.play();
  });

  if (newsession.direction === "incoming") {
    // Incoming call
    // incoming call here
    newsession.on("accepted", function () {
      // the call has answered
    });
    newsession.on("confirmed", function () {
      // this handler will be called for incoming calls too
    });
    // Answer call
    session.answer(callOptions);
    // Reject call (or hang up it)
    //session.terminate();
  }
  else {
// Outgoing call
    newsession.on("confirmed", function () {
      //the call has connected, and audio is playing
      //const localStream = session.connection.getLocalStreams()[0];
      //dtmfSender = session.connection.createDTMFSender(localStream.getAudioTracks()[0])
      localVideo.src = window.URL.createObjectURL(newsession.connection.getLocalStreams()[0]);
      localVideo.play();
    });

  }
//   //play a DTMF tone (session has method `sendDTMF` too but it doesn't work with Catapult server right)
//   dtmfSender.insertDTMF("1");
//   dtmfSender.insertDTMF("#");
// ​
//   //mute call
//   session.mute({audio: true});​
//   //unmute call
//   session.unmute({audio: true});​
//   //to hangup the call
//   session.terminate();​

});

$('.call_button').on('click', function (AData) {
  console.log('call_button');
  const callNumber = $('.text_number')[0].value;
  console.log(`call to: ${callNumber}`);
  bwPhone.call(callNumber, callOptions);
});

$('.hangup_button').on('click', function (AData) {
  console.log('hangup_button');
  newsession.terminate();
});