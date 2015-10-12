(function(window){
    var app = document.getElementById('loader').getAttribute('data-app');
    requirejs.config({
        baseUrl: 'js',
        paths: {
            'jquery': 'jquery-2.1.4.min',
            'socket.io': '../socket.io/socket.io'
        }
    });

    require([app], function(){
        //todo: run app as a controller
    });
})(this);

