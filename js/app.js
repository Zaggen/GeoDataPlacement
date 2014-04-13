var mapReach = {
    init: function(mapId, canvasId) {
        var myLatlng = new window.google.maps.LatLng(30,0); // Add the coordinates
        var mapOptions = {
            zoom: 3, // The initial zoom level when your map loads (0-20)
            minZoom: 3, // Minimum zoom level allowed (0-20)
            maxZoom: 17, // Maximum soom level allowed (0-20)
            zoomControl:true, // Set to true if using zoomControlOptions below, or false to remove all zoom controls.
            zoomControlOptions: {
                style:window.google.maps.ZoomControlStyle.DEFAULT // Change to SMALL to force just the + and - buttons.
            },
            center: myLatlng, // Centre the Map to our coordinates variable
            mapTypeId: window.google.maps.MapTypeId.ROADMAP, // Set the type of Map
            scrollwheel: false, // Disable Mouse Scroll zooming (Essential for responsive sites!)
            mapTypeControl:false, // Disable Map/Satellite switch
            scaleControl:false, // Set to false to hide scale
            streetViewControl:false, // Set to disable to hide street view
            overviewMapControl:false, // Set to false to remove overview control
            rotateControl:false // Set to false to disable rotate control
        };
        var mapStyles = [
            {
                "featureType": "landscape.natural",
                "stylers": [
                    { "visibility": "on" },
                    { "color": "#08304b" }
                ]
            },{
                "featureType": "water",
                "stylers": [
                    { "color": "#011018" }
                ]
            },{
                "featureType": "administrative.country",
                "elementType": "geometry",
                "stylers": [
                    { "visibility": "on" },
                    { "weight": 0.5 },
                    { "color": "#124b5e" }
                ]
            },{
                "featureType": "administrative",
                "stylers": [
                    { "weight": 0.1 },
                    { "color": "#ffffff" },
                    { "visibility": "on" }
                ]
            },{
                "featureType": "administrative.province",
                "stylers": [
                    { "visibility": "off" }
                ]
            },{
                "featureType": "landscape.natural.terrain",
                "stylers": [
                    { "visibility": "off" }
                ]
            },{
                "featureType": "poi",
                "stylers": [
                    { "visibility": "off" }
                ]
            },{
                "featureType": "administrative.locality",
                "stylers": [
                    { "visibility": "off" }
                ]
            },{
                "featureType": "road",
                "stylers": [
                    { "visibility": "off" }
                ]
            },{
                "featureType": "administrative.neighborhood",
                "stylers": [
                    { "visibility": "off" }
                ]
            }
        ];

        this.map = new window.google.maps.Map(document.getElementById('map-canvas'), mapOptions); // Render our map within the empty div
        this.map.setOptions({styles: mapStyles});
        this.nodes = [];
        this.$mapCanvas = $('#'+ mapId);
        this.canvas = document.getElementById(canvasId);


    },

    /**
     * Gets the current boundaries of the google map view-port in latitude and longitude
     * @return {} top-rigth & bottom-left lat,lon values.
     */

    getCurrentBounds: function (){
        var lng0 = this.map.getBounds().getNorthEast().lng(); // top-right x
        var lat0 = this.map.getBounds().getNorthEast().lat(); // top-right y
        var lng1 = this.map.getBounds().getSouthWest().lng(); // bottom-left x
        var lat1 = this.map.getBounds().getSouthWest().lat(); // bottom-left y

        return {topRight: {lat: lat0, lng: lng0}, bottomLeft: {lat: lat1, lng: lng1}};
    },

    /**
     * Adds nodes to be drawn on the canvas that overlays the map
     * @param {number} lat the latitude (y) geoposition of the node
     * @param {number} lng the longitude (x) geoposition of the node
     * @param {number} quantity number of nodes on the same location
     * @return {} top-rigth & bottom-left lat,lon values.
     */

    add: function (lat, lng, quantity){ // lat y , lon x
        this.nodes.push({lat: lat, lng: lng, q: quantity});
    },

    canvasSetUp: function () {
        if(!this.isCanvasSetted){
            this.width = this.canvas.width =  this.$mapCanvas.width();
            this.height = this.canvas.height = this.$mapCanvas.height();
            this.isCanvasSetted = true;
            console.log('width:' + this.width );
            console.log('height:' + this.height );
        }
    },

    getBoundsProjection: function(){

        var bounds,
            maxX, minX, minXDefault, maxXDefault,
            maxY, minY,	northEast, southWest;

        bounds = this.getCurrentBounds();

        minXDefault = -180;
        maxXDefault =  180;

        maxX = bounds.topRight.lng;
        minX = bounds.bottomLeft.lng;
        /*
         When the map is shown on a hi-res screen at zoom lvl 3 (this won't work if lvl is zoom lvl is below 3 )
         it might have to tile up on the x axis and since the google map API returns the bounds from the top-right and
         bottom-left it might return	the longitude of the tiled copy and not the real starting point, so we take that
         into account by	setting the minX to the minXDefault in case that is greater that the maxX value, and we need to
         the difference between our maxDefault (180) and this "minX" when this one is actually greater than the maxX.
         After finding the offset we now can change the value of minX like i said before and take that offset and add it
         to the lng of the point we are trying to get the x,y position.
         */

        this.xOffset = (maxX < minX) ? maxXDefault - minX : 0; // When map is tiled it will use this offset.
        minX = (maxX > minX) ? minX : minXDefault;

        maxY = bounds.topRight.lat;
        minY = bounds.bottomLeft.lat;

        northEast = new window.google.maps.LatLng(maxY, maxX);
        southWest = new window.google.maps.LatLng(minY, minX);

        return {
            topRight: this.map.getProjection().fromLatLngToPoint(northEast),
            bottomLeft: this.map.getProjection().fromLatLngToPoint(southWest),
            scale: Math.pow(2, this.map.getZoom())
        }
    },

    fromLatLngToPoint: function (lat, lng) {

        var point = new window.google.maps.LatLng(lat, lng + this.xOffset);
        var worldPoint = this.map.getProjection().fromLatLngToPoint(point);

        return new window.google.maps.Point((worldPoint.x - this.bounds.bottomLeft.x) *
            this.bounds.scale, (worldPoint.y - this.bounds.topRight.y) * this.bounds.scale);
    },

    /**
     * Draws the nodes in place
     * @return void
     */

    placeNodes: function () {
        var ctx  = this.canvas.getContext('2d');

        ctx.clearRect(0, 0, this.width, this.height);

        this.bounds = this.getBoundsProjection();

        for (var i in this.nodes) {
            ctx.save();
            var color = (this.nodes[i].q === 1)? '#ffff00' : 'rgba(255, 0, 0, 0.9)';

            ctx.fillStyle = color;

            var pos = this.fromLatLngToPoint(this.nodes[i].lat, this.nodes[i].lng);
            var radius = 3 * this.nodes[i].q;

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI*2, true);
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fill();
            ctx.closePath();

        }
    }
};


var places = [
    ["Bogota", 3]
    ["San Francisco",1],
    ["Jakarta, Indonesia",1],
    ["Bangkok thailand",1],
    ["Indonesia",4],
    ["Argentina, Buenos Aires ",1],
    ["New York City", 1],
    ["Kelapa Gading, Jakarta Utara", 2],
    ["India", 3],
    ["Hollywood, CA", 1],
    ["United Kingdom",1],

    ["Barcelona",1],
    ["Deutschland",1],
    ["Bandung",1],
    ["Darul Kasino Royale",1],
    ["Depok - madeenah",1],
    ["US",1],
    ["Bangalore",1],
    ["Tenerife",1],
    ["Madrid",1],
    ["Campana",1],

    ["Pretoria",1],
    ["Erzurum",1],
    ["Birmingham",1],
    ["Slovakia",1],
    ["Capelle aan den ijssel",1],
    ["Singapore",1],
    ["Fanbase",2],
    ["pemalang",2]
];



jQuery(document).ready(function($){
    'use strict';
    window.mapReach.init('map-canvas', 'activity-reach');

    var address = encodeURIComponent(places[0][0]);
    var index = 0;
    var baseDelay = 1000; // 1s
    var delay = 0;
    var delayIndex = 0;
    places.forEach(function(place,i){

        if(i % 10 === 0){
            delay = baseDelay * delayIndex;
            delayIndex++;
            window.console.log('delay:' + delay);
            if(i > 0){
               // mapReach.placeNodes();
                //console.log(mapReach.map);
            }
        }

        setTimeout(function(){
            var url = 'http://maps.googleapis.com/maps/api/geocode/json?address=' + place[0] + '&sensor=false';

            console.log(i);
            $.ajax({
                url: url,
                dataType: 'json',
                async: false
            }).done(function( data ) {
                    window.console.log(data);
                    if(data.status === 'OK'){
                        var location = data.results[0].geometry.location;
                        window.console.assert(data.results[0].geometry.location !== 'undefined', 'There is a location in the data');
                        mapReach.add(location.lat, location.lng, places[index][1]);
                        index++;
                    }
                });

        },delay);




    });

    window.google.maps.event.addListenerOnce(mapReach.map, 'tilesloaded', function(){
        mapReach.canvasSetUp();
        mapReach.placeNodes();
    });

    window.google.maps.event.addListener(mapReach.map, 'bounds_changed',
        function() {
            mapReach.placeNodes();
        });

});
