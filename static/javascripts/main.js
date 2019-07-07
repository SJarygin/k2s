'use strict';

const log = $('.text_log')[0];

$('.btn_start').on('click', function (AData) {
  ApiSend('start', $('.text_uri')[0].value, AResult => {
    LogJson(AResult);
  });
});

$('.btn_stop').on('click', function (AData) {
  ApiSend('stop', '', AResult => {
    LogJson(AResult);
  });
});

(function () {
  //const element = $(".panel__timedate>span");

  window.intervalTimer = setInterval(function () {
    ApiSend('status', '', AResult => {
      LogJson(AResult);
    });
  }, 3000);
})();

function ApiSend(ACommand, AData, ACallback) {
  const url = `/api/${ACommand}`;
  const data = { data: AData };
  $.ajax({
    type: 'post',
    url: url,
    data: data,
    // dataType: json
  })
      .done(AResult => {
        ACallback(AResult);
      })
      .fail(AError => {
        ACallback(AError);
      });
}

function LogJson(AJsonData) {
  console.log(AJsonData);
  log.value = JSON.stringify(AJsonData, null, '\t');
  // const xx =
  //     {
  //       "date":
  //           "2019-07-07T11:49:39.145Z",
  //       "message":
  //           "ready",
  //       "conf":
  //           "3500",
  //       "conf_full":
  //           "3500-165.22.143.0",
  //       "list":
  //           [{
  //             "number": "1000",
  //             "title": "sipml.client.1000",
  //           },],
  //       "history":
  //           [
  //             {
  //               "number": "1000",
  //               "title": "sipml.client.1000",
  //               "Status": "connect",
  //               "date": "2019-07-07T11:25:28.281Z"
  //             },
  //             {
  //               "number": "1008",
  //               "title": "SipMedia.1008",
  //               "Status": "connect",
  //               "date": "2019-07-07T11:25:42.187Z"
  //             }]
  //     }
  // log.value = JSON.stringify(xx, function (k, v) {
  //   console.log(`[${k}]=[${v}] ${typeof v}`);
  //   if (typeof v === 'object' && k) {
  //     var jsv=JSON.stringify(v, null, ' ');
  //     jsv=jsv.replace('\n', '');
  //     jsv=jsv.replace('\\"', '"');
  //     jsv=jsv.replace('\"', '"');
  //     return jsv;
  //   }
  //   return k ? "" + v : v;
  // }, '\t');
}