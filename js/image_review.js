// image_review.js
/*********** 
* TODO: 
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
var IMG_RETRY_MAX_ATTEMPTS = 8;
var Icons = create_icons();
var eventId;
var image_history = [];
var image_index = 0; // tracks whether user is viewing an image from history or working on new images
var current_image = {};
var sample_image_json =
	'{"Altitude":342.00,"AverageVoteLevel":null,"CalculatedHeading":-1.00,"DatePointTimeOffset":0,"EXIFFocalLength":200.00,"EXIFPhotoDate":"/Date(1504194601000+0000)/","EventId":9073,"EventName":"CAP - Hurricane Harvey","Filename":"DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Heading":-1.00,"Id":"e84a2184-76e4-4e64-8340-95439efea971","ImageArchived":false,"ImageEventImagesId":null,"ImageMissionId":613531,"ImageTypeId":1,"ImageURL":"https://fema-cap-imagery.s3.amazonaws.com/Images/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Latitude":27.674026,"Longitude":-97.538701,"MaxVoteLevel":null,"MinVoteLevel":null,"MissionName":"S0831A","NMEAPoint_Id":0,"NumberOfVotes":0,"OffsetHeading":0.00,"OffsetSeconds":null,"PhotoUSNG":"14R PR 4461","Shape":{"Geography":{"CoordinateSystemId":4326,"WellKnownText":"POINT (-97.5387016666667 27.6740266666667)"}},"TargetUSNG":null,"TeamName":"HARVEY CSR","ThumbnailURL":"https://fema-cap-imagery.s3.amazonaws.com/Thumbs/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","VirtualID":"bd24b7ca-36cc-49c1-afb5-00045e3665fa"}';
var map;
var drawControl;
var bounds;
var overview_map;
var overview_features;
var assessment_features; // Pointer
var imageLyr; // Pointer
var imageThumbnailLyr; // Pointer
var imageRetryAttempt = 0;
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

function add_image_to_history(image) { // Call after imageLyr and assessment_features layers are created
	var imageObj = {
		// overview: {

		// },
		image: image,
		imageLyr: "",
		assessment_features: "",
		// overview_features: overview_features,
		submitted: false
	};
	image_history.push(imageObj);
	console.log("image_history", image_history);
	return imageObj;
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

	return current_image;
}

function apply_image_info(imageObj) {
	imageObj.image = apply_image_info_wrapper(imageObj.image);
	set_review_image(imageObj);
}

function build_leaflet_draw_toolbar(map, editFeatureGroup) {
	drawControl = new L.Control.Draw({
		position: 'topleft',
		edit: {
			featureGroup: editFeatureGroup
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
		var damageMarker = $("input[name=btn_DamageMarker]:checked");
		if (damageMarker.length === 0) {
			$("input[name=btn_DamageMarker][value=affected]").prop("checked", "checked");
			set_drawing_options('affected');
		} else {
			set_drawing_options(damageMarker[0].value);
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

function buildPayload(imageObj) {
	imageObj.submitted = true;
	return {
		assessment: {
			geoJSON: features_to_geoJSON(imageObj.assessment_features._layers)
		},
		overview: {

		},
		cookie: document.cookie,
		sessionID: "",
		timestamp: Date()
	}
}

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
	if (image_index >= image_history.length) {
		console.warn("function image_history_next() -> image_index = " + image_index + " and should not be >= image_history.length, which is " + image_history.length);
		image_index = image_history.length - 1;
		return;
	}

	if (++image_index === image_history.length) return;

	if (image_index < image_history.length) {
		var imageObj = image_history[image_index];
		apply_image_info_wrapper(imageObj.image); // sets current_image
		set_review_image(imageObj, true);
	}
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

	// build_leaflet_draw_toolbar(map);
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
	if (image_history.length) enabled_button("previous_image");
	apply_image_info(add_image_to_history(data));
}

function previous_image() {
	if (image_index < 0) {
		console.warn("function previous_image() -> image_index = " + image_index + " and should not be < 0");
		image_index = 0;
		return;
	}
	if (--image_index < 0) return;
	if (image_index < image_history.length) {
		var imageObj = image_history[image_index];
		apply_image_info_wrapper(imageObj.image); // sets current_image
		set_review_image(imageObj, true);
	}
}

function save_next_image() {
	console.log("Submitted", buildPayload(image_history[image_index]));
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

function set_review_image(imageObj, isHistory) {
	if (assessment_features) assessment_features.remove();
	if (imageThumbnailLyr) imageThumbnailLyr.remove();
	if (imageLyr) imageLyr.remove();
	map.setView(IMG_CENTER, IMG_ZOOM);
	imageThumbnailLyr = L.imageOverlay(imageObj.image["ThumbnailURL"], bounds).addTo(map);
	if (!isHistory) {
		imageObj.assessment_features = new L.FeatureGroup();
	}
	assessment_features = imageObj.assessment_features;
	map.addLayer(assessment_features);
	if (drawControl) map.removeControl(drawControl);
	if (!imageObj.submitted) build_leaflet_draw_toolbar(map, assessment_features);
	update_nav(imageObj, isHistory)
	imageThumbnailLyr.on("load", function () {
		set_overview_image(imageObj.image);
		imageLyr = L.imageOverlay(imageObj.image["ImageURL"], bounds).addTo(map);
		imageObj.imageLyr = imageLyr;
		imageLyr.on("load", function () {
			imageThumbnailLyr.remove();
		});
	});
	imageThumbnailLyr.on("error", function () {
		imageLyr = L.imageOverlay(imageObj.image["ImageURL"], bounds).addTo(map);
		imageObj.imageLyr = imageLyr;
		imageLyr.on("load", function () {
			set_overview_image(imageObj.image);
			imageThumbnailLyr.remove();
		});
		imageLyr.on("error", function (e) { // neither the thumbnail nor HiRes loaded, so fetch next image and remove from history
			image_history.pop();
			if (imageRetryAttempt++ < IMG_RETRY_MAX_ATTEMPTS) {
				next_image();
			} else {
				alert("Image Server is currently experiencing difficulties. Please try again later.\n" +
					"If you continue to experience difficulties, please contact the site admin.\n\n"
				);
			}
		});
	});
}

function set_btn_visability(id, show) {
	var btn = $("button#" + id);
	if (btn.length) {
		if (show) {
			btn.removeClass("hide disabled").prop("disabled", false);
		} else {
			btn.addClass("hide disabled").prop("disabled", true);
		}
	}
}

function skip_image() {
	next_image();
}

function update_nav(imageObj, isHistory) {
	image_index <= 0 ? disabled_button("previous_image") : enabled_button("previous_image");
	imageObj.submitted ? disabled_button("save_image") : enabled_button("save_image");

	var buttons = [
		["image_history_next", isHistory && image_index < image_history.length - 1],
		["new_image", isHistory]
	];
	buttons.forEach(function (btn) {
		set_btn_visability(btn[0], btn[1]);
	}, this);
}