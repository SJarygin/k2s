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
}