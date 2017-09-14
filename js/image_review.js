// image_review.js
/*********** 
* TODO: 
- Load all image data into history first, then use current image as pointer
- Tie editing/submitting functionality to image_submitted variable
- Create "buildPayload" function for 'save' (Will need Session ID, timestamp, and Token)
- Change "submit" and "skip next" navigation buttons to "New Image" and "" when viewing previous images
- Create tooltip for each btn_DamageMarker
- Read in variables from js file for urls
- Enable users marking overview map to georectify image to map; 2x locations each
- Allow users to submit comments with their assessment
- Skip images without lat/lng

* QUESTIONS:
- Should users comment per marker or per image?
- Should users be able to later submit images using "previous" if skipped over?
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
var Icons = create_icons();
var eventId;
var image_history = [];
var image_index = 0; // tracks whether user is viewing an image from history or working on new images
var image_submitted = false;
var current_image = {};
var sample_image_json =
	'{"Altitude":342.00,"AverageVoteLevel":null,"CalculatedHeading":-1.00,"DatePointTimeOffset":0,"EXIFFocalLength":200.00,"EXIFPhotoDate":"/Date(1504194601000+0000)/","EventId":9073,"EventName":"CAP - Hurricane Harvey","Filename":"DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Heading":-1.00,"Id":"e84a2184-76e4-4e64-8340-95439efea971","ImageArchived":false,"ImageEventImagesId":null,"ImageMissionId":613531,"ImageTypeId":1,"ImageURL":"https://fema-cap-imagery.s3.amazonaws.com/Images/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Latitude":27.674026,"Longitude":-97.538701,"MaxVoteLevel":null,"MinVoteLevel":null,"MissionName":"S0831A","NMEAPoint_Id":0,"NumberOfVotes":0,"OffsetHeading":0.00,"OffsetSeconds":null,"PhotoUSNG":"14R PR 4461","Shape":{"Geography":{"CoordinateSystemId":4326,"WellKnownText":"POINT (-97.5387016666667 27.6740266666667)"}},"TargetUSNG":null,"TeamName":"HARVEY CSR","ThumbnailURL":"https://fema-cap-imagery.s3.amazonaws.com/Thumbs/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","VirtualID":"bd24b7ca-36cc-49c1-afb5-00045e3665fa"}';
var map;
var bounds;
var overview_map;
var overview_features;
var assessment_features;
var imageLyr;
var imageThumbnailLyr;
var damage_markers = { // Marker = Severity: 'hex color'
	"affected": '#ffffcc',
	"minor": '#ffc000',
	"major": '#ff7c80',
	"destroyed": '#9966ff'
};
var set_drawing_options; // exposing function globally
var xhr;


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

function add_image_to_history(image, submit) {
	console.log("add_image_to_history - imageLyr", imageLyr);
	image_history.push({
		assessment: {
			geoJSON: features_to_geoJSON(assessment_features._layers)
		},
		// overview: {

		// },
		image: image,
		// imageLyr: $.extend({}, imageLyr),
		imageLyr: imageLyr,
		// assessment_features: assessment_features,
		// overview_features: overview_features,
		cookie: document.cookie,
		sessionID: "",
		submitted: submit,
		timestamp: Date()
	});
	if (submit) {
		// use payload and send
	}
	console.log("image_history", image_history);
}

function apply_image_info_wrapper(data) {
	var jsonData;
	if (typeof data == "string") {
		jsonData = JSON.parse(data);
	} else {
		jsonData = data;
	}
	current_image = jsonData;
	set_info("#eventname", current_image["EventName"]);
	set_info("#missionname", current_image["MissionName"]);
	set_info("#teamname", current_image["TeamName"]);
	set_info("#photo_date", convert_mssql_date(current_image["EXIFPhotoDate"]));
	set_info("#photo_altitude", current_image["Altitude"]);

	// set_review_image(current_image);
	return current_image;
}

function apply_image_info(data) {
	set_review_image(apply_image_info_wrapper(data));
}

function build_leaflet_draw_toolbar(map) {
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
			set_drawing_options('affected');
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

	set_drawing_options = function (severity) {
		drawControl.setDrawingOptions({
			circlemarker: {
				attribution: severity,
				color: damage_markers[severity]
			}
		});
	}
}

// function buildPayload() {
// 	return {
// 		assessment: {
// 			geoJSON: features_to_geoJSON(assessment_features._layers)
// 		},
// 		overview: {

// 		},
// 		cookie: document.cookie,
// 		sessionID: "",
// 		timestamp: Date()
// 	}
// }

function calc_zoom(altitude) {
	var index = dec_to_base2_exponent(altitude * 10);
	return OVR_ZOOM + (OVR_ZOOM - index);
}

function check_protocol() {
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
	var date = new Date(parseInt(dt_str));
	return date.toISOString().slice(0, 19);
}

function create_icons() {
	return {
		"camera": L.icon({
			iconUrl: 'img/camera.png',
			iconSize: [30, 30],
			iconAnchor: [14, 29]
		})
	};
}

function dec_to_base2_exponent(d) {
	return parseInt(d).toString(2).length - 1;
}

function disabled_button(id) {
	var button = $("button#" + id);
	if (button.length) button.addClass("disabled").prop("disabled", true);
}

function enabled_button(id) {
	var button = $("button#" + id + ".disabled");
	if (button.length) button.removeClass("disabled").prop("disabled", false);
}

function features_to_geoJSON(featureCollection) {
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

function image_history_next() {
	console.log("image_history_next");
	return;
}

function init_map() {
	if (!check_protocol()) {
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
	// var url = 'https://imgs.xkcd.com/comics/online_communities.png';
	var url = 'img/online_communities.png';

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

	build_leaflet_draw_toolbar(map);
}

function next_image() {
	if (1 == 2) {
		next_image_wrapper(sample_image_json);
	} else {
		if (xhr && xhr.readyState != 4) {
			xhr.abort();
		}
		xhr = $.ajax({
			url: "/ImageEventsService/PublicAPI.svc/VOTE/" + eventId + "/getImage",
			processData: false,
			crossDomain: true
		}).success(next_image_wrapper);
	}
}

function next_image_wrapper(data) {
	image_index = image_history.length;
	// $("button#previous_image.disabled")[0].toggleClass("disabled").prop("disabled", false);
	if (image_history.length) enabled_button("previous_image");
	apply_image_info(data);
}

function update_nav() {
	if (image_index === image_history.length) {} // show submit and skip; hide new and next
	if (image_index + 1 === image_history.length) {} // show submit and skip; hide new and next

}

function previous_image() {
	console.log("previous_image");
	if (image_index < 0) {
		console.warn("function previous_image() -> image_index = " + image_index + " and should not be < 0");
		image_index = 0;
		return;
	}
	if (--image_index < 0) return;
	if (image_index === 0) {
		// $("button#previous_image")[0].toggleClass("disabled").prop("disabled", true);
		disabled_button("previous_image");
	} else {
		// $("button#previous_image.disabled")[0].toggleClass("disabled").prop("disabled", false);
		enabled_button("previous_image");
	}
	if (image_index < image_history.length) {
		// do something with the current contents of map if image is last from server and not saved/submitted
		// if (image_index + 1 === image_history.length) add_image_to_history(current_image, false);		
		var image = image_history[image_index];
		apply_image_info_wrapper(image.image); // sets current_image
		imageLyr.remove();
		imageLyr = image.imageLyr;
		imageLyr.addTo(map);
		assessment_features.clearLayers();
		assessment_features = L.geoJSON(image.assessment.geoJSON);
		assessment_features.addTo(map);
		// map.addLayer(assessment_features);	
		set_overview_image(image.image);
	}
}

function save_next_image() {
	// console.log("payload", buildPayload());
	add_image_to_history(current_image, true);
	next_image();
}

function set_general(severity) {
	return;
}

function set_info(slctr, newText) {
	$(slctr).text(newText);
}

function set_markertool(severity) {
	if (severity != "eraser") {
		set_drawing_options(severity);
		$('a[title="Draw a circlemarker"] span').click();
	} else {
		$("input[name=btn_GeneralMarker][value=non-impct]").prop("checked", true);
		assessment_features.clearLayers();
		// $('a[title="Cancel drawing"]').click();	// Doesn't work		
	}
}

function set_overview_image(image) {
	overview_features.clearLayers();
	var marker = L.marker([parseFloat(image["Latitude"]), parseFloat(image["Longitude"])], {
		icon: Icons['camera']
	})
	overview_features.addLayer(marker);

	overview_map.setView(
		[parseFloat(image["Latitude"]), parseFloat(image["Longitude"])],
		calc_zoom(image["Altitude"])
	);
}

function set_review_image(image) {
	assessment_features.clearLayers();
	if (imageThumbnailLyr) imageThumbnailLyr.remove();
	if (imageLyr) imageLyr.remove();
	map.setView(IMG_CENTER, IMG_ZOOM);
	imageThumbnailLyr = L.imageOverlay(image["ThumbnailURL"], bounds).addTo(map);
	imageThumbnailLyr.on("load", function () {
		imageLyr = L.imageOverlay(image["ImageURL"], bounds).addTo(map);
		imageLyr.on("load", function () {
			imageThumbnailLyr.remove();
		});
	});
	// imageThumbnailLyr.on("error", function () {
	// 	imageLyr = L.imageOverlay(image["ImageURL"], bounds).addTo(map);
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

function skip_image() {
	add_image_to_history(current_image, false);
	next_image();
}