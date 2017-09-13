// image_review.js
/*********** 
* TODO: 
- Create "buildPayload" function for 'save' (Will need Session ID, timestamp, and Token)
- Use payload archive to enable 'Previous Image' functionality
- Create tooltip for each btn_DamageMarker
- Cancel imageOverlay load upon "previous", "next", or "submit"
- Set overview zoom based on altitude
- Read in variables from js file for urls
- Enable users marking overview map to georectify image to map; 2x locations each
- Allow users to submit comments with their assessment (question: comment per marker or per image?)
- Skip images without lat/lng
***********/
// GLOBALS
var $ = window.$;
var L = window.L;
var OVR_ZOOM = 14;
var IMG_ZOOM = 1;
var IMG_ZOOM_MIN = 0;
var IMG_ZOOM_MAX = 14;
var IMG_DEFAULT_SIZE = [0, 0, 1600, 1200];
var IMG_CENTER = [-IMG_DEFAULT_SIZE[3] / 4, IMG_DEFAULT_SIZE[2] / 4];
var IMG_CENTER;
var IMG_HISTORY_LEN = 5;
var Icons = createIcons();
var eventId;
var imageID;
var image_history = [];
var current_image = {};
var sample_image_json =
	'{"Altitude":342.00,"AverageVoteLevel":null,"CalculatedHeading":-1.00,"DatePointTimeOffset":0,"EXIFFocalLength":200.00,"EXIFPhotoDate":"/Date(1504194601000+0000)/","EventId":9073,"EventName":"CAP - Hurricane Harvey","Filename":"DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Heading":-1.00,"Id":"e84a2184-76e4-4e64-8340-95439efea971","ImageArchived":false,"ImageEventImagesId":null,"ImageMissionId":613531,"ImageTypeId":1,"ImageURL":"https://fema-cap-imagery.s3.amazonaws.com/Images/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Latitude":27.674026,"Longitude":-97.538701,"MaxVoteLevel":null,"MinVoteLevel":null,"MissionName":"S0831A","NMEAPoint_Id":0,"NumberOfVotes":0,"OffsetHeading":0.00,"OffsetSeconds":null,"PhotoUSNG":"14R PR 4461","Shape":{"Geography":{"CoordinateSystemId":4326,"WellKnownText":"POINT (-97.5387016666667 27.6740266666667)"}},"TargetUSNG":null,"TeamName":"HARVEY CSR","ThumbnailURL":"https://fema-cap-imagery.s3.amazonaws.com/Thumbs/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","VirtualID":"bd24b7ca-36cc-49c1-afb5-00045e3665fa"}';
var map;
var bounds;
var overview_map;
var overview_features;
var assessment_features;
var imageLyr;
var damageMarkers = { // Marker = Severity: 'hex color'
	"affected": '#ffffcc',
	"minor": '#ffc000',
	"major": '#ff7c80',
	"destroyed": '#9966ff'
};
var setDrawingOptions; // exposing function globally

activate();

// Functions

function activate() {
	$.ajaxPrefilter(function (options) {
		if (options.crossDomain && window.location.host === "localhost:8888") {
			// var newData = {};
			// // Copy the options.data object to the newData.data property.
			// // We need to do this because javascript doesn't deep-copy variables by default.
			// newData.data = $.extend({}, options.data);
			// newData.url = options.url;

			// Reset the options object - we'll re-populate in the following lines.
			// options = {};

			// Set the proxy URL
			if (options.url[0] === "/") options.url = "http://127.0.0.1:8888" + options.url;

			// options.data = $.param(newData);
		} else {
			options.crossDomain = false; // ********** NOT SURE IF PRODUCTION SERVER NEEDS crossDomain TO BE true **********
		}
	});
	$("input[name=btn_DamageMarker]:checked").each(function (element) {
		element.prop("checked", false);
	}, this);
}

function apply_image_info(data) {
	var jsonData;
	if (typeof data == "string") {
		jsonData = JSON.parse(data);
	} else {
		jsonData = data;
	}

    imageID = jsonData["id"];
	set_info("#eventname", jsonData["imageeventname"]);
	set_info("#missionname", jsonData["imagemissionname"]);
	set_info("#teamname", jsonData["imageteamname"]);
	set_info("#photo_date", convert_mssql_date(jsonData["exifphotodate"]));
	set_info("#photo_altitude", jsonData["altitude"]);

	set_review_image(jsonData);
}

function buildLeafletDrawToolbar(map) {
	assessment_features = new L.FeatureGroup();
	map.addLayer(assessment_features);

	var drawControl = new L.Control.Draw({
		position: 'topleft',
		edit: {
			featureGroup: assessment_features
		},
		draw: {
			polygon: false,
			polyline: false,
			rectangle: false,
			circle: false,
			circlemarker: {
				repeatMode: true
			},
			marker: false
		}
	});
	map.addControl(drawControl);

	map.on(L.Draw.Event.DRAWSTART, function () {
		if ($("input[name=btn_DamageMarker][value=eraser]:checked").length === 1 || $("input[name=btn_DamageMarker]:checked").length === 0) {
			$("input[name=btn_DamageMarker][value=BLDG_A]").prop("checked", "checked");
			setDrawingOptions('affected');
		}
	});

	map.on(L.Draw.Event.CREATED, function (e) {
		$("input[name=btn_GeneralMarker][value=impct]").prop("checked", "checked");
		var layer = e.layer;
		layer.properties = {
			"severity": layer.options.attribution
		};
		assessment_features.addLayer(layer);
	});

	map.on(L.Draw.Event.EDITED, function (e) {
		var layers = e.layers;
		var countOfEditedLayers = 0;
		layers.eachLayer(function () {
			countOfEditedLayers++;
		});
		console.log("Edited " + countOfEditedLayers + " layers");
	});

	setDrawingOptions = function (severity) {
		drawControl.setDrawingOptions({
			circlemarker: {
				attribution: severity,
				color: damageMarkers[severity]
			}
		});
	}
}

function checkProtocol() {
	if (window.location.protocol === "https:") {
		setTimeout(function () {
			window.location.href = "http:" + window.location.href.substring(window.location.protocol.length);
		}, 5000);
		return false;
	}
	return true;
}

function convert_mssql_date(data) {
	var dt_str;
	if (!data) {
		dt_str = "";
	} else {
		dt_str = data.slice(6, 19);
	}

	if ( dt_str > '' ) {
        var date = new Date(parseInt(dt_str));
        dt_str = date.toISOString().slice(0, 19);
    }
	return dt_str;
}

function createIcons() {
	return {
		"camera": L.icon({
			iconUrl: 'img/camera.png',
			iconSize: [30, 30],
			iconAnchor: [14, 29]
		})
	};
}

function featuresToGeoJSON(featureCollection) {
	return {
		"features": Object.keys(featureCollection).map(function (feature) {
			var data = featureCollection[feature];
			return {
				"geometry": {
					"coordinates": [data._latlng.lng, data._latlng.lat],
					"type": "Point"
				},
				"properties": $.extend({}, data.properties, {
					"Point": data._point
				}),
				"type": "Feature"
			}
		}),
		"type": "FeatureCollection"
	};
}

function init_map() {
	if (!checkProtocol()) {
		$("#myModal").modal({
			"remote": "templates/redirectModal.html"
		});
		return;
	}
	init_review_map();
	init_overview_map();
	eventId = "9073";
	next_image();
}

function init_overview_map() {
	overview_map = L.map("overview_map").setView([39, -97.5], 4);
	L.esri.basemapLayer("Imagery").addTo(overview_map);
	overview_features = new L.FeatureGroup();
	overview_map.addLayer(overview_features);
}

function init_review_map() {
	// dimensions of the image
	var url = 'https://imgs.xkcd.com/comics/online_communities.png';

	// Using leaflet.js to pan and zoom an image.
	// create the map

	map = L.map('map', {
		minZoom: IMG_ZOOM_MIN,
		maxZoom: IMG_ZOOM_MAX,
		center: IMG_CENTER,
		zoom: IMG_ZOOM,
		crs: L.CRS.Simple // Coordinates in CRS.Simple take the form of [y, x] instead of [x, y], in the same way Leaflet uses [lat, lng] instead of [lng, lat].
	});

	// calculate the edges of the image, in coordinate space
	var southWest = map.unproject([0, IMG_DEFAULT_SIZE[3]], map.getMinZoom() + 1);
	var northEast = map.unproject([IMG_DEFAULT_SIZE[2], 0], map.getMinZoom() + 1);
	bounds = new L.LatLngBounds(southWest, northEast);

	// add the image overlay, 
	// so that it covers the entire map
	L.imageOverlay(url, bounds).addTo(map);

	// tell leaflet that the map is exactly as big as the image
	map.setMaxBounds(bounds);

	buildLeafletDrawToolbar(map);
}

function next_image() {
	if (1 == 2) {
		apply_image_info(sample_image_json);
	} else {
		$.ajax({
			//url: "/ImageEventsService/PublicAPI.svc/VOTE/" + eventId + "/getImage",
			url: "http://0.0.0.0:8889/api/Image",
			processData: false,
			crossDomain: true,
            headers: {'X-Requested-With': 'XMLHttpRequest'}
		}).success(apply_image_info);
	}
}

function previous_image() {
	console.log("previous_image");
	return;
}

function save_status(data) {
    console.log(data);   
    next_image();
}

function save_next_image() {
	var geoJSON = featuresToGeoJSON(assessment_features._layers);
    geoJSON.imageID = imageID;
	console.log("geoJSON", geoJSON);

	$.ajax({
        type: "POST",
        url: "http://0.0.0.0:8889/api/Save",
        data: geoJSON,
        success: save_status,
        failure: save_status,
        dataType: 'json',
        crossDomain: true
        });
	//next_image();
}

function set_general(severity) {
	return;
}

function set_info(slctr, newText) {
	$(slctr).text(newText);
}

function set_markertool(severity) {
	if (severity != "eraser") {
		setDrawingOptions(severity);
		$('a[title="Draw a circlemarker"] span').click();
	} else {
		$("input[name=btn_GeneralMarker][value=non-impct]").prop("checked", true);
		assessment_features.clearLayers();
		// $('a[title="Cancel drawing"]').click();	// Doesn't work		
	}
}

function set_overview_image(image) {
	overview_features.clearLayers();
	var marker = L.marker([parseFloat(image["latitude"]), parseFloat(image["longitude"])], {
		icon: Icons['camera']
	})
	overview_features.addLayer(marker);
	
	overview_map.setView(
		[parseFloat(image["latitude"]), parseFloat(image["longitude"])],
		calcZoom(image["altitude"])
	);
}

function set_review_image(image) {
	assessment_features.clearLayers();
	if (imageLyr) imageLyr.remove();
	map.setView(IMG_CENTER, IMG_ZOOM);
	var imageThumbnailLyr = L.imageOverlay(image["thumbnailurl"], bounds).addTo(map);
	imageThumbnailLyr.on("load", function () {
		imageLyr = L.imageOverlay(image["imageurl"], bounds).addTo(map);
		imageLyr.on("load", function () {
			imageThumbnailLyr.remove();
		});
	});
	// imageThumbnailLyr.on("error", function () {
	// 	imageLyr = L.imageOverlay(image["imageurl"], bounds).addTo(map);
	// 	imageLyr.on("load", function () {
	// 		imageThumbnailLyr.remove();
	// 	});
	// 	imageLyr.on("error", function () {
	// 		imageLyr.remove();
	// 		next_image();
	// 	});

	// });
	set_overview_image(image);
}

function calcZoom(altitude) {
	var index = decToBase2Exponent(altitude * 10);
	return OVR_ZOOM + (OVR_ZOOM - index);	
}

function decToBase2Exponent(d) {
	return parseInt(d).toString(2).length - 1;
}
