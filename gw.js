// Quick & dirty Kurento to SIP gateway

// process.env.DEBUG = 'rtcninja*';

// const _kurento = require('kurento-client');
// const _childProcess = require('child_process');
// const _jsSIP = require('jssip');
// const _nodeWebSocket = require('jssip-node-websocket');
const _minimist = require('minimist');
const _sipMedia = require('./SipMedia.js');
//const _fs = require('mz/fs');
const _nconf = require('nconf');

const hostName = 'sipwebrtc2.ddns.net';
const playFileUri = "https://cameras.inetcom.ru/hls/camera12_2.m3u8";

const callNumber = _minimist(process.argv.slice(2), opts = { string: 'call' })['call'];
const config = _minimist(process.argv.slice(2))['config'];
const debug = _minimist(process.argv.slice(2))['debug'];

_nconf.file({ file: config });

const sipMediaConfig = _nconf.get('config');

// const sipMediaConfig = {
//   Secure: 0,
//   Kurento: {
//     Addr: hostName,
//     WsPort: 8888
//   },
//   Sip: {
//     Addr: hostName,
//     Port: 5560,
//     WsPort: 5066,
//     User: {
//       Name: "1008",
//       Password: "sippass-90210"
//     },
//     StunUri: hostName
//   }
// };
//_fs.writeFileSync('./simple.json', JSON.stringify(sipMediaConfig,null,'\t'), 'utf8');

sipMediaConfig.Debug = debug;

const sipMedia = new _sipMedia.SipMedia(sipMediaConfig, () => {
  sipMedia.Start(callNumber, playFileUri)
});

/*
console.log(`Detected ${GetIpAddress()} IP`);

const _kurentoAddr = 'sipwebrtc2.ddns.net';//'127.0.0.1';
//const _kurentoAddr = '165.22.143.0';//'127.0.0.1';
//const _kurentoUri = `wss://fe80::5405:8bff:fef4:3c28/64:8433/kurento`;
//const _playFileUri = "rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov";
//const _playFileUri = "rtsp://freja.hiof.no:1935/rtplive/_definst_/hessdalen03.stream";
const _playFileUri = "https://cameras.inetcom.ru/hls/camera12_2.m3u8";
//var playFileUri = "file:///video/demo.webm";
const _recordFileUri = "file:///video/record.webm";

const _secure = _minimist(process.argv.slice(2))['sec'];
const _waitForCall = _minimist(process.argv.slice(2))['wait'];
const _confCall = _minimist(process.argv.slice(2))['conf'];
const _debug = _minimist(process.argv.slice(2))['debug'];
let _callNumber = _waitForCall ? undefined : _minimist(process.argv.slice(2), opts = { string: 'call' })['call'];

// use local asterisk
const _sipAddr = _kurentoAddr;//'sipwebrtc2.ddns.net';//'127.0.0.1';
const _sipPort = _secure ? '5561' : '5560';
const _sipWsStr = _secure ? `wss://${_sipAddr}:7443` : `ws://${_sipAddr}:5066`;
const _kurentoUri = _secure ? `wss://${_kurentoAddr}:8433/kurento` : `ws://${_kurentoAddr}:8888/kurento`;
const _regSipUser = '1008';
const _regSipUserPass = `sippass-90210x${_regSipUser}`;

let _kurentoClient = null;
let _ua;

if (!_callNumber && !_waitForCall) {
  console.log('Usage: nodejs gw.js [--sec] [--call phone_number] [--wait]');
  process.exit(0);
}

    // stdout = "+OK Conference 3500-165.22.143.0 (3 members rate: 48000 flags: running|answered|enforce_min|dynamic|exit_sound|enter_sound|video_floor_only|video_rfc4579|livearray_sync|video_floor_lock|transcode_video|video_muxing|minimize_video_encoding|json_status)\n" +
    //     "391;sofia/internal/1008@sipwebrtc2.ddns.net:5560;8b3dca93-54c5-4536-b143-467dd6b01775;1008;1008;hear|speak|video|vid-floor;0;0;200\n" +
    //     "390;sofia/internal/1004@sipwebrtc2.ddns.net:5560;9988a1ad-6854-42c2-9901-bd3642c9dd3d;1008;1008;hear|speak|video;0;0;200\n" +
    //     "389;sofia/internal/1008@sipwebrtc2.ddns.net:5560;d7dec80a-afa5-449f-95a8-9a8cf8d1c546;1008;1008;hear|speak|video|floor;0;0;200";



const _fsExecName = _debug ? "./fs_cli" : "fs_cli";

//if(!_waitForCall)
{
  const stdout = _childProcess.execSync(`${_fsExecName} -rRS -x "conference list"`).toString();
  console.log('stdout: ' + stdout);
  const stdoutSplitted = stdout.split("\n");
  selfUserLines = stdoutSplitted.filter(AItem => AItem.includes(`/${_regSipUser}@${_kurentoAddr}`));
  console.log(`selfUserLines=${selfUserLines}`);
  selfUserLines.forEach(AItem => {
    const itemSpitted = AItem.split(";");
    const cmdLine = `${_fsExecName} -rRS -x "conference ${_callNumber}-${GetIpAddress()} kick ${itemSpitted[0]}"`;
    console.log(`[${cmdLine}]`);
    _childProcess.execSync(cmdLine);
  });
}

if (_callNumber && _confCall) {
  _callNumber = `${_callNumber}000`;
}

//process.exit(0);

function CallMediaPipeline() {
  this.pipeline = null;
}

function getKurentoClient(ACallback) {
  if (_kurentoClient !== null) {
    return ACallback(null, _kurentoClient);
  }
  _kurento(_kurentoUri, function (error, AKurentoClient) {
    if (error) {
      const message = `Could not find media server at address ${_kurentoUri}`;
      return ACallback(`${message}. Exiting with error ${error}`);
    }
    _kurentoClient = AKurentoClient;
    ACallback(null, _kurentoClient);
  });
}

function GetIpAddress() {
  //return '165.22.143.0';
  const interfaces = require('os').networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];

    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && alias.address !== '172.17.0.1' && !alias.internal)
        return alias.address;
    }
  }
  return '0.0.0.0';
}

function ReplaceIp(ASdp, AIP) {
  if (!AIP)
    AIP = GetIpAddress();
  let temp = ASdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + AIP);
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
      }, function (AError, APlayerEndpoint) {
        if (AError) {
          return ACallback(AError)
        }
        self.pipeline.PlayerEndpoint = APlayerEndpoint;
        APlayerEndpoint.on('EndOfStream', function () {
          console.log('*** END OF STREAM');
          self.pipeline.release();
          _ua.stop();
          process.exit(0);
        });
        console.log('PlayerEndpoint created');
        const recordParams = {
          stopOnEndOfStream: true,
          mediaProfile: 'WEBM_AUDIO_ONLY',
          uri: _recordFileUri
        };
        //APipeline.create('RecorderEndpoint', recordParams, function (AError, ARecorderEndpoint) {
        APipeline.create('RtpEndpoint', function (AError, ARtpEndpoint) {
          self.pipeline.RtpEndpoint = ARtpEndpoint;
          //self.pipeline.RecorderEndpoint = ARecorderEndpoint;
          // connect to myRTPEndpoint (rx to us)
          // ARtpEndpoint.connect(ARecorderEndpoint, function (AError) {
          //   console.log('recorder endpoint connected');
          // });
          ARtpEndpoint.on('MediaStateChanged', function (AEvent) {
            console.log('MediaStateChanged to ' + AEvent.newState);
            if (_waitForCall && (AEvent.oldState !== AEvent.newState && AEvent.newState === "CONNECTED"))
              startMedia(APipeline);
          });
          ARtpEndpoint.on('ConnectionStateChanged', function (AEvent) {
            console.log('ConnectionStateChanged to ' + AEvent.newState);
          });
          // connect to myRTPEndpoint (tx from us)
          APlayerEndpoint.connect(ARtpEndpoint, function (AError) {
            console.log('player endpoint connected');
          });
          ARtpEndpoint.generateOffer(function (AError, AOffer) {
            // this is offer for receiving side (recorder.sdp)
            // that we will send to asterisk as local offer
            ACallback(null, AOffer);
          }); // generateOffer
        }); // create('RtpEndpoint')
        //}); // create('RecorderEndpoint')
      }); // create('PlayerEndpoint')
    }) // create('MediaPipeline')
  }); // getKurentoClient
};// CallMediaPipeline.prototype.createPipeline
//***********************************************************************************************

const _sipWs = new _nodeWebSocket(_sipWsStr);

const _uri = `sip:${_regSipUser}@${_sipAddr}:${_sipPort};transport=tls`;
console.log(`uri    : ${_uri}`);
console.log(`socket : ${_sipWsStr}`);

const configuration = {
  uri: _uri,
  password: _regSipUserPass,
  //display_name: reg_sip_user,
  authorization_user: _regSipUser,
  sockets: [_sipWs],
  //ws_servers: _sipWsStr,
  realm: _sipAddr,
  stun_servers: 'sipwebrtc2.ddns.net',
  //trace_sip: true
};

try {
  const ua = new _jsSIP.UA(configuration);
  _ua = ua;
} catch (AError) {
  console.log(AError);
  return;
}

//***********************************************************************************************

function startMedia(APipeline) {
  APipeline.PlayerEndpoint.play(function (AError) {
    if (AError) {
      reject('play error');
    }
    console.log('Kurento is playing');
  });
//  APipeline.RecorderEndpoint.record(() => console.log('Kurento is recording'));
}

const callEventHandlers = {
  'progress': function (data) {
    console.log('call in progress');
  },
  'confirmed': function (data) {
    console.log('call confirmed');
    startMedia(callOptions.pipeline);
  }
};
const callOptions = {
  'eventHandlers': callEventHandlers,
  'extraHeaders': ['X-Foo: foo', 'X-Bar: bar'],
  'mediaConstraints': { 'audio': true, 'video': true },
  mandatory: [{
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
  }, { 'DtlsSrtpKeyAgreement': true }]
};

_ua.on('registered', function (e) {
  console.log('registered');
  if (_callNumber) {
    // create new Kurento pipeline for call
    createPipeline(callOptions).then(
        result => {
          console.log('outgoing call pipeline created');
          console.log('initiated call');
          _ua.call(`sip:${_callNumber}@${_sipAddr}:${_sipPort}`, callOptions);
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
_ua.on('failed', function (e) {
  console.log('failed: ' + e);
});
_ua.on('disconnected', function (e) {
  console.log('disconnected from SIP server: ' + e.reason);
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
        ACall.pipeline.kurento_offer = ReplaceIp(AKurentoOffer, _kurentoAddr);
        //ACall.pipeline.kurento_offer = AKurentoOffer.replace('a=setup:actpass', 'a=setup:passive');
        AResolve(AKurentoOffer);
      }
    });
  });
}

function SendAnswerToKurento(APipeline) {
  return new Promise(function (AResolve, AReject) {
    APipeline.RtpEndpoint.processAnswer(APipeline.sip_offer, function (AError, ASdpAnswer) {
      if (AError) {
        AReject(`Kurento processAnswer error:' ${AError}`);
      }
      AResolve(ASdpAnswer);
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
    call.pipeline = callOptions.pipeline;
    callOptions.call = call;
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
  call.on('sdp', function (AData) {
    if (AData.originator === 'remote') {
      if (call.pipeline.sip_offer) {
        call.pipeline.sip_offer = null;
        console.log('Renegotiate requested');
        // recreate the RTPEndpoint, attach recorder to it and start media again
        callOptions.pipeline.RecorderEndpoint.stop();
        callOptions.pipeline.PlayerEndpoint.stop();
        callOptions.pipeline.RtpEndpoint.release();
        callOptions.pipeline.create('RtpEndpoint', function (error, ARtpEndpoint) {
          callOptions.pipeline.RtpEndpoint = ARtpEndpoint;
          ARtpEndpoint.connect(callOptions.pipeline.RecorderEndpoint, function (error) {
            ARtpEndpoint.on('MediaStateChanged', function (event) {
              console.log('reINVITE: MediaStateChanged to ' + event.newState);
              if (event.oldState !== event.newState && event.newState === "CONNECTED")
                startMedia(call.pipeline);
            });
            ARtpEndpoint.on('ConnectionStateChanged', function (event) {
              console.log('reINVITE: ConnectionStateChanged to ' + event.newState);
            });
            callOptions.pipeline.PlayerEndpoint.connect(ARtpEndpoint);
            ARtpEndpoint.generateOffer(function (error, kurento_offer) {
              call.pipeline.kurento_offer = ReplaceIp(kurento_offer, _kurentoAddr);
              call.renegotiate();
            });
          });
        });
        return;
      }
//      console.log('first remote sdp: ' + data.sdp);
      call.pipeline.sip_offer = AData.sdp;
      SendAnswerToKurento(call.pipeline).then(
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
    if (AData.originator === 'local') {
      AData.sdp = call.pipeline.kurento_offer;
      // console.log('local sdp: ' + data.sdp);
    }
  });
});

try {
  _ua.start();
} catch (AError) {
  console.log(AError);
  return;
}
*/