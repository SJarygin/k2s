'use strict';
const _kurento = require('kurento-client');
const _childProcess = require('child_process');
const _jsSIP = require('jssip');
const _nodeWebSocket = require('jssip-node-websocket');
const _os = require('os');

class SipMedia {
  constructor(AOptions, ARegisteredEvent) {
    const self = this;

    this.options = AOptions;
    this.kurentoClient = null;
    this.ua = null;
    this.pipeline = null;
    this.playerUri = '';
    this.RegisteredEvent = ARegisteredEvent;
    this.history = [];
    this.userStatus = [];

    // const list = [];
    // list.push({ number: 1008, title: 'sipmedia' });
    // console.log(list);
    // console.log(this.fillHistory(list));
    //
    // list.push({ number: 1001, title: 'linphone' });
    // console.log(list);
    // console.log(this.fillHistory(list));
    //
    // list.push({ number: 1000, title: 'sipml' });
    // console.log(list);
    // console.log(this.fillHistory(list));
    //
    // list.pop();
    // console.log(list);
    // console.log(this.fillHistory(list));
    //
    // list.pop();
    // console.log(list);
    // console.log(this.fillHistory(list));

    //------------------------------------------------------------------------------
    console.log(`Detected ${this.getIpAddress()} IP`);

    const kurentoTransport = this.options.Secure ? 'wss' : 'ws';
    const kurentoAddr = this.options.Kurento.Addr;
    const kurentoPort = this.options.Kurento.WsPort;
    const kurentoPath = this.options.Kurento.Path === undefined ? 'kurento' : this.options.Kurento.Path;
    this.KurentoUri = `${kurentoTransport}://${kurentoAddr}:${kurentoPort}/${kurentoPath}`;
    console.log(`kurentoUri: ${this.KurentoUri}`);

    const sipWsTransport = this.options.Secure ? 'wss' : 'ws';
    const sipWsAddr = this.options.Sip.Addr;
    const sipWsPort = this.options.Sip.WsPort;
    this.SipWsUri = `${sipWsTransport}://${sipWsAddr}:${sipWsPort}`;
    console.log(`sipWsUri: ${this.SipWsUri}`);

    const sipUriUser = this.options.Sip.User.Name;
    const sipUriTransport = this.options.Secure ? 'tls' : 'tcp';
    const sipUriAddr = this.options.Sip.Addr;
    const sipUriPort = this.options.Sip.Port;
    const sipUri = `sip:${sipUriUser}@${sipUriAddr}:${sipUriPort};transport=${sipUriTransport}`;
    console.log(`sipUri : ${sipUri}`);
    this.SipUriForCall = `${sipUriAddr}:${sipUriPort};transport=${sipUriTransport}`;

    this.StunUri = this.options.Sip.StunUri;
    console.log(`StunUri : ${this.StunUri}`);

    const sipWs = new _nodeWebSocket(this.SipWsUri);

    const configuration = {
      uri: sipUri,
      password: `${this.options.Sip.User.Password}x${sipUriUser}`,
      display_name: `SipMedia.${sipUriUser}`,
      authorization_user: sipUriUser,
      sockets: [sipWs],
      //ws_servers: _sipWsStr,
      realm: sipUriAddr,
      stun_servers: this.options.Sip.StunUri,
      //trace_sip: true
    };

    const callEventHandlers = {
      'progress': function (AData) {
        console.log('call in progress');
      },
      'confirmed': function (AData) {
        console.log('call confirmed');
        self.startMedia(self.callOptions.pipeline);
      }
    };
    this.callOptions = {
      'eventHandlers': callEventHandlers,
      'extraHeaders': ['X-Foo: foo', 'X-Bar: bar'],
      'mediaConstraints': { 'audio': true, 'video': true },
      mandatory: [{
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
      }, { 'DtlsSrtpKeyAgreement': true }]
    };

    this.ua = new _jsSIP.UA(configuration);

    this.ua.on('registered', function (e) {
      console.log('registered');
      if (self.RegisteredEvent)
        self.RegisteredEvent();
      // create new Kurento pipeline for call
      // createPipeline(callOptions).then(
      //     result => {
      //       console.log('outgoing call pipeline created');
      //       console.log('initiated call');
      //       this.ua.call(`sip:${this.callNumber}@${this.sipUriForCall}`, callOptions);
      //     },
      //     reject => {
      //       console.log('Error creating pipeline');
      //       call.terminate();
      //       return;
      //     }
      // );
    });
    this.ua.on('registrationFailed', function (err) {
      console.log('registrationFailed: ' + err.cause);
    });
    this.ua.on('connecting', function () {
      console.log('connecting to SIP server');
    });
    this.ua.on('connected', function () {
      console.log('connected to SIP server');
    });
    this.ua.on('failed', function (e) {
      console.log('failed: ' + e);
    });
    this.ua.on('disconnected', function (e) {
      console.log('disconnected from SIP server');
      self.ua.start();
    });
    this.ua.on('newMessage', function () {
      console.log('newMessage');
    });
    this.ua.on('newRTCSession', function (AData) {
      console.log(`new ${AData.session.direction} call`);
      const call = AData.session;
      if (AData.originator === 'remote') { // incoming call
        console.log(`Call from: ${call.request.headers.From[0].parsed.uri.toAor()}`);
        // create new Kurento pipeline for call
        self.createPipeline(call).then(
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
        call.pipeline = self.callOptions.pipeline;
        self.callOptions.call = call;
        this.outgoing = true;
      }
      call.on('ended', function (AData) {
        if (call.pipeline)
          call.pipeline.release();
        console.log('Call ended: ' + AData.cause);
        //if (outgoing) {
        this.ua.stop();
        //   process.exit(0);
        // }
      });
      call.on('failed', function (AData) {
        console.log('Call failed: ' + AData.cause);
        if (call.pipeline)
          call.pipeline.release();
        console.log('Call ended: ' + AData.cause);
        //if (outgoing) {
        this.ua.stop();
        //   process.exit(0);
        // }
      });
      call.on('reinvite', function (AData) {
        console.log('Got SIP reINVITE');
      });
      call.on('update', function (AData) {
        console.log('Got SIP UPDATE');
      });
      call.on('sdp', function (AData) {
        if (AData.originator === 'remote') {
          if (call.pipeline.sip_offer) {
            call.pipeline.sip_offer = null;
            console.log('Renegotiate requested');
            // recreate the RTPEndpoint, attach recorder to it and start media again
            self.callOptions.pipeline.PlayerEndpoint.stop();
            self.callOptions.pipeline.RtpEndpoint.release();
            self.callOptions.pipeline.create('RtpEndpoint', function (error, ARtpEndpoint) {
              self.callOptions.pipeline.RtpEndpoint = ARtpEndpoint;

              ARtpEndpoint.on('MediaStateChanged', function (event) {
                console.log('reINVITE: MediaStateChanged to ' + event.newState);
                if (event.oldState !== event.newState && event.newState === "CONNECTED")
                  self.startMedia(call.pipeline);
              });
              ARtpEndpoint.on('ConnectionStateChanged', function (event) {
                console.log('reINVITE: ConnectionStateChanged to ' + event.newState);
              });
              self.callOptions.pipeline.PlayerEndpoint.connect(ARtpEndpoint);
              ARtpEndpoint.generateOffer(function (error, kurento_offer) {
                call.pipeline.kurento_offer = self.replaceIp(kurento_offer, self.options.Kurento.Addr);
                call.renegotiate();
              });

            });
            return;
          }
//      console.log('first remote sdp: ' + data.sdp);
          call.pipeline.sip_offer = AData.sdp;
          self.sendAnswerToKurento(call.pipeline).then(
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

    this.ua.start();
  }

  // async waitingA(ms) {
  //   await this.waiting(ms)
  // }
  //
  // waiting(ms) {
  //   return new Promise(resolve => setTimeout(resolve, ms));
  // }

  Start(ACallNumber, APlayerUri) {
    this.callNumder = ACallNumber;
    this.playerUri = APlayerUri;
    console.log(`callNumder: ${this.callNumder}`);
    console.log(`playerUri : ${this.playerUri}`);

    const callNumber = `${this.callNumder}000`;
    this.ClearConnections();
    this.createPipeline(this.callOptions).then(
        result => {
          console.log('outgoing call pipeline created');
          console.log('initiated call');
          this.ua.call(`sip:${callNumber}@${this.SipUriForCall}`, this.callOptions);
        },
        reject => {
          console.log('Error creating pipeline');
          this.ua.terminate();
          return;
        }
    );
  }

  Stop() {
    this.ClearConnections();
  }

  ClearConnections() {
    if (!this.options.Debug && this.callNumder) {
      const stdout = _childProcess.execSync(`fs_cli -rRS -x "conference list"`).toString();
      console.log('stdout: ' + stdout);
      const stdoutSplitted = stdout.split("\n");
      const selfUserLines = stdoutSplitted.filter(AItem => AItem.includes(`/${this.options.Sip.User.Name}@${this.options.Sip.Addr}`));
      console.log(`selfUserLines=${selfUserLines}`);
      selfUserLines.forEach(AItem => {
        const itemSpitted = AItem.split(";");
        const cmdLine = `fs_cli -rRS -x "conference ${this.callNumder}-${this.getIpAddress()} kick ${itemSpitted[0]}"`;
        console.log(`[${cmdLine}]`);
        _childProcess.execSync(cmdLine);
      });
    }
  }

  Status() {
    const result = {
      date: new Date(),
      message: 'ready',
      conf: '',
      conf_full: '',
      list: [],
      history: []
    };
    if (this.options.Debug) {
      result.message = 'debug mode';
    }
    else {
      const stdout = _childProcess.execSync(`fs_cli -rRS -x "conference list"`).toString();

      // const stdout ='+OK Conference 3500-165.22.143.0 (1 member rate: 48000 flags: running|answered|enforce_min|dynamic|exit_sound|enter_sound|video_floor_only|video_rfc4579|livearray_sync|video_floor_lock|transcode_video|video_muxing|minimize_video_encoding|json_status)\n' +
      //     '443;sofia/internal/1008@sipwebrtc2.ddns.net:5560;9ed42836-772e-4c80-94ba-87a29789877b;1008;1008;hear|speak|video|floor|vid-floor;0;0;200';
      const callNumber = this.callNumder ? this.callNumder : '<unknown>';
      console.log('stdout: ' + stdout);
      const stdoutSplitted = stdout.split("\n");
      const userLines = stdoutSplitted.filter(AItem => AItem.includes(`@${this.options.Sip.Addr}`));

      result.message = 'ready';
      result.conf = callNumber;
      result.conf_full = `${callNumber}-${this.getIpAddress()}`;

      userLines.forEach(AItem => {
        const itemSpitted = AItem.split(";");
        result.list.push({ number: itemSpitted[4], title: itemSpitted[3] });
      });
    }
    result.date = new Date;
    result.history = this.fillHistory(result.list);
    return result;
  }

  //===============================================================
  fillHistory(AList) {
    AList.forEach(AItem => {
      const userStatusItems = this.userStatus.filter(AUserStatusItem => AItem.number === AUserStatusItem.number);
      if (userStatusItems === undefined || userStatusItems === null || userStatusItems.length === 0) {
        this.userStatus.push(AItem);
        const newItem = JSON.parse(JSON.stringify(AItem));
        newItem.Status = 'connect';
        newItem.date = new Date;
        this.history.push(newItem);
      }
    });

    this.userStatus.forEach(AUserStatusItem => {
      const items = AList.filter(AItem => AItem.number === AUserStatusItem.number);
      if ((items === undefined || items === null || items.length === 0)) {
        const newItem = JSON.parse(JSON.stringify(AUserStatusItem));
        newItem.Status = 'disconnect';
        newItem.date = new Date;
        this.history.push(newItem);
      }
    });
    return this.history;
  }

  getKurentoClient(ACallback) {
    const self = this;
    if (this.kurentoClient !== null) {
      return ACallback(null, this.kurentoClient);
    }
    console.log(`Get kurento client: ${this.KurentoUri}`);
    _kurento(this.KurentoUri, function (AError, AKurentoClient) {
      if (AError) {
        return ACallback(`Could not find media server at address ${self.KurentoUri}. Exiting with error ${AError}`);
      }
      self.kurentoClient = AKurentoClient;
      ACallback(null, self.kurentoClient);
    });
  }

  getIpAddress() {
    //return '165.22.143.0';
    const interfaces = _os.networkInterfaces();
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

  replaceIp(ASdp, AIP) {
    if (!AIP)
      AIP = this.getIpAddress();
    let temp = ASdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + AIP);
    //temp = sdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + ip);
    //temp = sdp.replace(new RegExp("IN IP4 .*", "g"), "IN IP4 " + ip);
    return temp;
  }

  createPipelineInt(ACallback) {
    const self = this;
    this.getKurentoClient(function (AError, AKurentoClient) {
      if (AError) {
        return ACallback(AError);
      }
      AKurentoClient.create('MediaPipeline', function (AError, APipeline) {
        if (AError) {
          return ACallback(AError);
        }
        self.pipeline = APipeline;
        APipeline.create('PlayerEndpoint', {
          uri: self.playerUri,
          useEncodedMedia: false
        }, function (AError, APlayerEndpoint) {
          if (AError) {
            return ACallback(AError)
          }
          self.pipeline.PlayerEndpoint = APlayerEndpoint;
          APlayerEndpoint.on('EndOfStream', function () {
            console.log('*** END OF STREAM');
            self.pipeline.release();
            self.ua.stop();
            process.exit(0);
          });
          console.log('PlayerEndpoint created');
          APipeline.create('RtpEndpoint', function (AError, ARtpEndpoint) {
            self.pipeline.RtpEndpoint = ARtpEndpoint;
            // ARtpEndpoint.on('MediaStateChanged', function (AEvent) {
            //   console.log('MediaStateChanged to ' + AEvent.newState);
            //   if (_waitForCall && (AEvent.oldState !== AEvent.newState && AEvent.newState === "CONNECTED"))
            //     startMedia(APipeline);
            // });
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
        }); // create('PlayerEndpoint')
      }) // create('MediaPipeline')
    }); // getKurentoClient

  }

  startMedia(APipeline) {
    APipeline.PlayerEndpoint.play(function (AError) {
      if (AError) {
        reject('play error');
      }
      console.log('Kurento is playing');
    });
  }

  createPipeline(ACall) {
    const self = this;
    return new Promise(function (AResolve, AReject) {
      self.createPipelineInt(function (AError, AKurentoOffer) {
        if (AError) {
          AReject(AError);
        } else {
          ACall.pipeline = self.pipeline;
          ACall.pipeline.kurento_offer = self.replaceIp(AKurentoOffer, self.options.Kurento.Addr);
          AResolve(AKurentoOffer);
        }
      });
    });
  }

  sendAnswerToKurento(APipeline) {
    return new Promise(function (AResolve, AReject) {
      APipeline.RtpEndpoint.processAnswer(APipeline.sip_offer, function (AError, ASdpAnswer) {
        if (AError) {
          AReject(`Kurento processAnswer error:' ${AError}`);
        }
        AResolve(ASdpAnswer);
      }); // processAnswer
    });
  }

  //===============================================================
}

exports.SipMedia = SipMedia;
