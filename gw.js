// Quick & dirty Kurento to SIP gateway

// process.env.DEBUG = 'rtcninja*';

var kurento = require('kurento-client');

console.log(`Detected ${getIPAddress()} IP`);

//var kurento_addr = '165.22.143.0';
const _kurentoAddr = 'sipwebrtc2.ddns.net';//'127.0.0.1';
const _kurentoUri = `ws://${_kurentoAddr}:8888/kurento`;
const _playFileUri = "rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov";
//var playFileUri = "file:///video/demo.webm";
const _recordFileUri = "file:///video/record.webm";
const _callNumber = require('minimist')(process.argv.slice(2), opts = { string: 'call' })['call'];
const _waitForCall = require('minimist')(process.argv.slice(2))['wait'];

let _kurentoClient = null;
let _ua;

if (!_callNumber && !_waitForCall) {
  console.log('Usage: nodejs gw.js [--call phone_number] [--wait]');
  process.exit(0);
}

function CallMediaPipeline() {
  this.pipeline = null;
}

function getKurentoClient(ACallback) {
  if (_kurentoClient !== null) {
    return ACallback(null, _kurentoClient);
  }
  kurento(_kurentoUri, function (error, AKurentoClient) {
    if (error) {
      var message = 'Coult not find media server at address ' + _kurentoUri;
      return ACallback(message + ". Exiting with error " + error);
    }
    _kurentoClient = AKurentoClient;
    ACallback(null, _kurentoClient);
  });
}

function getIPAddress() {
  //return '165.22.143.0';
  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && alias.address !== '172.17.0.1' && !alias.internal)
        return alias.address;
    }
  }
  return '0.0.0.0';
}

function replace_ip(sdp, ip) {
  if (!ip)
    ip = getIPAddress();
  let temp = sdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + ip);
  //temp = sdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + ip);
  //temp = sdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + ip);
  return temp;
}

CallMediaPipeline.prototype.createPipeline = function (ACallback) {
  const self = this;
  getKurentoClient(function (AError, AKurentoClient) {
    if (AError) {
      return ACallback(AError);
    }
    AKurentoClient.create('MediaPipeline', function (AError, APipeline) {
      if (AError) {
        return ACallback(AError);
      }
      self.pipeline = APipeline;
      APipeline.create('PlayerEndpoint', {
        uri: _playFileUri,
        useEncodedMedia: false
      }, function (error, playerEndpoint) {
        if (error) {
          return ACallback(error)
        }
        self.pipeline.pe = playerEndpoint;
        playerEndpoint.on('EndOfStream', function () {
          console.log('*** END OF STREAM');
          self.pipeline.release();
          _ua.stop();
          process.exit(0);
        });
        console.log('PlayerEndpoint created');
        var recordParams = {
          stopOnEndOfStream: true,
          mediaProfile: 'WEBM_AUDIO_ONLY',
          uri: _recordFileUri
        };
        APipeline.create('RecorderEndpoint', recordParams, function (error, recorder) {
          APipeline.create('RtpEndpoint', function (error, rtpe) {
            self.pipeline.rtpe = rtpe;
            self.pipeline.rece = recorder;
            // connect to myRTPEndpoint (rx to us)
            rtpe.connect(recorder, function (error) {
              console.log('recorder endpoint connected');
            });
            rtpe.on('MediaStateChanged', function (event) {
              console.log('MediaStateChanged to ' + event.newState);
              if (_waitForCall && (event.oldState !== event.newState && event.newState === "CONNECTED"))
                start_media(APipeline);
            });
            rtpe.on('ConnectionStateChanged', function (event) {
              console.log('ConnectionStateChanged to ' + event.newState);
            });
            // connect to myRTPEndpoint (tx from us)
            playerEndpoint.connect(rtpe, function (error) {
              console.log('player endpoint connected');
            });
            rtpe.generateOffer(function (error, offer) {
              // this is offer for receiving side (recorder.sdp)
              // that we will send to asterisk as local offer
              ACallback(null, offer);
            }); // generateOffer
          }); // create('RtpEndpoint')
        }); // create('RecorderEndpoint')
      }); // create('PlayerEndpoint')
    }) // create('MediaPipeline')
  }); // getKurentoClient
};// CallMediaPipeline.prototype.createPipeline
//***********************************************************************************************
const JsSIP = require('jssip');
const NodeWebSocket = require('jssip-node-websocket');
// use local asterisk
const asterisk_addr = _kurentoAddr;//'sipwebrtc2.ddns.net';//'127.0.0.1';
const asterisk_port = '5560';
const socket = new NodeWebSocket(`ws://${asterisk_addr}:5066`);
var reg_sip_user = '1002';
var reg_sip_user_pass = 'sippass-90210x1002';

var configuration = {
  uri: `sip:${reg_sip_user}@${asterisk_addr}:${asterisk_port}`,
  password: reg_sip_user_pass,
  //display_name: reg_sip_user,
  authorization_user: reg_sip_user,
  sockets: [socket],
  realm: asterisk_addr,
  stun_servers: 'sipwebrtc2.ddns.net'
};

try {
  const ua = new JsSIP.UA(configuration);
  _ua = ua;
} catch (e) {
  console.log(e);
  return;
}

//***********************************************************************************************

function start_media(pipeline) {
  pipeline.pe.play(function (error) {
    if (error) {
      reject('play error');
    }
    console.log('Kurento is playing');
  });
  pipeline.rece.record(() => console.log('Kurento is recording'));
}

const call_eventHandlers = {
  'progress': function (data) {
    console.log('call in progress');
  },
  'confirmed': function (data) {
    console.log('call confirmed');
    start_media(call_options.pipeline);
  }
};
const call_options = {
  'eventHandlers': call_eventHandlers,
  'extraHeaders': ['X-Foo: foo', 'X-Bar: bar'],
  'mediaConstraints': { 'audio': true, 'video': true },
};

_ua.on('registered', function (e) {
  console.log('registered');
  if (_callNumber) {
    // create new Kurento pipeline for call
    createPipeline(call_options).then(
        result => {
          console.log('outgoing call pipeline created');
          console.log('initiated call');
          _ua.call(`sip:${_callNumber}@${asterisk_addr}:${asterisk_port}`, call_options);
        },
        reject => {
          console.log('Error creating pipeline');
          call.terminate();
          return;
        }
    );
  }
});
_ua.on('registrationFailed', function (err) {
  console.log('registrationFailed: ' + err.cause);
});
_ua.on('connecting', function () {
  console.log('connecting to SIP server');
});
_ua.on('connected', function () {
  console.log('connected to SIP server');
});
_ua.on('disconnected', function () {
  console.log('disconnected from SIP server');
});
_ua.on('newMessage', function () {
  console.log('newMessage');
});

function createPipeline(ACall) {
  return new Promise(function (AResolve, AReject) {
    const pipeline = new CallMediaPipeline();
    pipeline.createPipeline(function (AError, AKurentoOffer) {
      if (AError) {
        AReject(AError);
      } else {
        ACall.pipeline = pipeline.pipeline;
        ACall.pipeline.kurento_offer = replace_ip(AKurentoOffer, _kurentoAddr);
        AResolve(AKurentoOffer);
      }
    });
  });
}

function send_answer_to_kurento(pipeline) {
  return new Promise(function (resolve, reject) {
    pipeline.rtpe.processAnswer(pipeline.sip_offer, function (error, sdpAnswer) {
      if (error) {
        reject('Kurento processAnswer error:' + error);
      }
      resolve();
    }); // processAnswer
  });
}

let outgoing = false;

_ua.on('newRTCSession', function (AData) {
  //console.log('new ' + (data.originator === 'remote' ? 'incoming' : 'outgoing') + ' call');
  console.log(`new ${AData.session.direction} call`);
  const call = AData.session;
  if (AData.originator === 'remote') { // incoming call
    console.log(`Call from: ${call.request.headers.From[0].parsed.uri.toAor()}`);
    // create new Kurento pipeline for call
    createPipeline(call).then(
        result => {
          console.log('incoming call pipeline created');
          console.log('answering incoming call');
          call.answer();
        },
        reject => {
          console.log('Error creating pipeline');
          call.terminate();
          return;
        }
    );
  } else {
    console.log(`Call to: ${call.request.headers.To[0]}`);
    call.pipeline = call_options.pipeline;
    call_options.call = call;
    outgoing = true;
  }
  call.on('ended', function (data) {
    if (call.pipeline)
      call.pipeline.release();
    console.log('Call ended: ' + data.cause);
    if (outgoing) {
      _ua.stop();
      process.exit(0);
    }
  });
  call.on('failed', function (data) {
    console.log('Call failed: ' + data.cause);
    if (call.pipeline)
      call.pipeline.release();
    console.log('Call ended: ' + data.cause);
    if (outgoing) {
      _ua.stop();
      process.exit(0);
    }
  });
  call.on('reinvite', function (data) {
    console.log('Got SIP reINVITE');
  });
  call.on('update', function (data) {
    console.log('Got SIP UPDATE');
  });
  call.on('sdp', function (data) {
    if (data.originator === 'remote') {
      if (call.pipeline.sip_offer) {
        call.pipeline.sip_offer = null;
        console.log('Renegotiate requested');
        // recreate the RTPEndpoint, attach recorder to it and start media again
        call_options.pipeline.rece.stop();
        call_options.pipeline.pe.stop();
        call_options.pipeline.rtpe.release();
        call_options.pipeline.create('RtpEndpoint', function (error, rtpe) {
          call_options.pipeline.rtpe = rtpe;
          rtpe.connect(call_options.pipeline.rece, function (error) {
            rtpe.on('MediaStateChanged', function (event) {
              console.log('reINVITE: MediaStateChanged to ' + event.newState);
              if (event.oldState !== event.newState && event.newState === "CONNECTED")
                start_media(call.pipeline);
            });
            rtpe.on('ConnectionStateChanged', function (event) {
              console.log('reINVITE: ConnectionStateChanged to ' + event.newState);
            });
            call_options.pipeline.pe.connect(rtpe);
            rtpe.generateOffer(function (error, kurento_offer) {
              call.pipeline.kurento_offer = replace_ip(kurento_offer, _kurentoAddr);
              call.renegotiate();
            });
          });
        });
        return;
      }
//      console.log('first remote sdp: ' + data.sdp);
      call.pipeline.sip_offer = data.sdp;
      send_answer_to_kurento(call.pipeline).then(
          result => {
            console.log('Answer to Kurento sent');
          },
          reject => {
            console.log('Error sending answer to Kurento');
            call.terminate();
            return;
          }
      );
    }
    if (data.originator === 'local') {
      data.sdp = call.pipeline.kurento_offer;
      // console.log('local sdp: ' + data.sdp);
    }
  });
});

_ua.start();
