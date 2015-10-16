(function(window){
    // gets the path of the application bootstrap script
    var app = document.getElementById('loader').getAttribute('data-app');

    // sets the RequireJS config
    requirejs.config({
        // all javascripts are located inside the folder public/js
        baseUrl: 'js',
        // shorten some paths using a translation map
        paths: {
            'jquery': 'jquery-2.1.4.min',
            'socket.io': '../socket.io/socket.io'
        }
    });

    // loads the application
    require([app], function(){
        //todo: run app as a controller
    });
})(this);

