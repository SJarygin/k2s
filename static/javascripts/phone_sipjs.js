'use strict';

const sipUser = '1000';
const sipUri = $.cookie('sipUri');
const sipWsUri = $.cookie('sipWsUri');
const stunUri = $.cookie('stunUri');

const localVideo = $('#local_video')[0];
const remoteVideo = $('#remote_video')[0];

const options = {
  media: {
    local: {
      video: localVideo
    },
    remote: {
      video: remoteVideo,
      audio: remoteVideo,
      // This is necessary to do an audio/video call as opposed to just a video call
      //audio: document.getElementById('remoteVideo')
    }
  },
  ua: {
    uri: `${sipUser}@${sipUri}`,
    password: `sippass-90210x${sipUser}`,
    wsServers: 'wss://sipwebrtc2.ddns.net:7443',
    stunServers: stunUri,
    displayName: `SipJs.SoftPhone.${sipUser}`,
    autostart: true,
    register: true
  }
};
SIP.Web.SessionDescriptionHandler.prototype.addDefaultIceServers = function (rtcConfiguration) {
  if (!rtcConfiguration.iceServers) {
    rtcConfiguration.iceServers = [{ urls: stunUri }];
  }
  return rtcConfiguration;
};

const simpleUa = new SIP.Web.Simple(options);

simpleUa.on('registered', function (AData) {
  console.log(`registered: `);
});
simpleUa.on('unregistered', function (AData) {
  console.log(`unregistered: `);
});
simpleUa.on('new', function (AData) {
  console.log(`new: `);
});
simpleUa.on('connecting', function (AData) {
  console.log(`connecting: `);
});
simpleUa.on('connected', function (AData) {
  console.log(`connected: `);
});
simpleUa.on('ended', function (AData) {
  console.log(`ended: `);
});

simpleUa.on('ringing', function (AData) {
  console.log(`ringing: `);
  simpleUa.answer();
});

$('#call_button').on('click', function (AData) {
  console.log('call_button');
  const callNumber = $('.text_number')[0].value;
  console.log(`call to: ${callNumber}`);
  simpleUa.call(callNumber);

});

$('#hangup_button').on('click', function (AData) {
  console.log('hangup_button');
  simpleUa.hangup();
});