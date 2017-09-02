// image_review.js

var eventId; 
var image_history = [];
var current_image = {};

function init_review_map() {
      // Map views always need a projection.  Here we just want to map image
      // coordinates directly to map coordinates, so we create a projection that uses
      // the image extent in pixels.
      var extent = [0, 0, 1024, 968];
      var projection = new ol.proj.Projection({
        code: 'xkcd-image',
        units: 'pixels',
        extent: extent
      });

      var map = new ol.Map({
        layers: [
          new ol.layer.Image({
            source: new ol.source.ImageStatic({
              attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
              url: 'https://imgs.xkcd.com/comics/online_communities.png',
              projection: projection,
              imageExtent: extent
            })
          })
        ],
        target: 'map',
        view: new ol.View({
          projection: projection,
          center: ol.extent.getCenter(extent),
          zoom: 2,
          maxZoom: 8
        })
      });

}

function init_overview_map() {
      // Map views always need a projection.  Here we just want to map image
      // coordinates directly to map coordinates, so we create a projection that uses
      // the image extent in pixels.
      var extent = [-120, 24, -60, 48];
      var projection = new ol.proj.Projection({
        code: 'EPSG:3857',
        units: 'meters',
        extent: extent
      });

	var osm = new ol.layer.Tile({ source: new ol.source.OSM() });
   var map = new ol.Map({
        layers: [ osm ],
        target: 'overview_map',
        view: new ol.View({
          projection: 'EPSG:3857',
          center: [-10909310.09774, 4300621.372044],
          zoom: 3,
          maxZoom: 14
        })
      });
}

function init_map() {
	init_review_map();
	init_overview_map();
	eventId = "9073";
	next_image();
}

function next_image() {
	console.log("event:" + eventId )

   $.ajax({
  url: "http://imageryuploader.geoplatform.gov/ImageEventsService/PublicAPI.svc/VOTE/"+eventId+"/getImage",
  crossDomain: true, // set this to ensure our $.ajaxPrefilter hook fires
  processData: false // We want this to remain an object for  $.ajaxPrefilter
}).success(function(data) { // Use the jQuery promises interface
    var jsonData = JSON.parse(data); // Assume it returns a JSON string
    console.log(jsonData); // Do whatever you want with the data
    alert( "Data Loaded: " + data );
});
}

function previous_image() {
	
}

function save_next_image() {
	
}
	
$.ajaxPrefilter( function( options ) {
  if ( options.crossDomain ) {
    var newData = {};
    // Copy the options.data object to the newData.data property.
    // We need to do this because javascript doesn't deep-copy variables by default.
    newData.data = $.extend({}, options.data);
    newData.url = options.url;

    // Reset the options object - we'll re-populate in the following lines.
    options = {};

    // Set the proxy URL
    options.url = "http://0.0.0.0:8888";
    options.data = $.param(newData);
    options.crossDomain = false;
  }
});

