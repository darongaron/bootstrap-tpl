var jquery = require('jquery');
window.$ = jquery;
window.jQuery = jquery;
require('bootstrap-sass');

$(document).ready(function() {
  jquery('.jumbotron h1').css('color', 'red');
  var print = function(ms) {
    console.log(ms);
  };
  print('text');
});
