'use strict';

$('.btn_start').on('click', function (AData) {
  const result = ApiSend('start', $('.text_uri')[0].value, AResult => {
    console.log(AResult);
  });
});

$('.btn_stop').on('click', function (AData) {
  const result = ApiSend('stop', 'stop', AResult => {
    console.log(AResult);
  });
});

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