// image_review.js
/*********** 
* TODO: 
- Style tooltip for each btn_DamageMarker
- Darken Markers
- Allow users to submit comments with their assessment
- Enable users marking overview map to georectify image to map; 2x locations each

* QUESTIONS:
- Should users comment per marker or per image?
- Should users be able to later submit images using "previous" if skipped over?
***********/
// GLOBALS
var APP_URL = "";
// var APP_URL = "http://0.0.0.0:8889/"
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
var imageID;
var missionId;
var image_history = [];
var image_index = 0; // tracks whether user is viewing an image from history or working on new images
var current_image = {};
var sample_image_json =
	'{"Altitude":342.00,"AverageVoteLevel":null,"CalculatedHeading":-1.00,"DatePointTimeOffset":0,"EXIFFocalLength":200.00,"EXIFPhotoDate":"/Date(1504194601000+0000)/","EventId":9073,"EventName":"CAP - Hurricane Harvey","Filename":"DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Heading":-1.00,"Id":"e84a2184-76e4-4e64-8340-95439efea971","ImageArchived":false,"ImageEventImagesId":null,"ImageMissionId":613531,"ImageTypeId":1,"imageurl":"https://fema-cap-imagery.s3.amazonaws.com/Images/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Latitude":27.674026,"Longitude":-97.538701,"MaxVoteLevel":null,"MinVoteLevel":null,"MissionName":"S0831A","NMEAPoint_Id":0,"NumberOfVotes":0,"OffsetHeading":0.00,"OffsetSeconds":null,"PhotoUSNG":"14R PR 4461","Shape":{"Geography":{"CoordinateSystemId":4326,"WellKnownText":"POINT (-97.5387016666667 27.6740266666667)"}},"TargetUSNG":null,"TeamName":"HARVEY CSR","thumbnailurl":"https://fema-cap-imagery.s3.amazonaws.com/Thumbs/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","VirtualID":"bd24b7ca-36cc-49c1-afb5-00045e3665fa"}';
var map;
var drawControl;
var bounds;
var overview_map;
var overview_features;
var assessment_features; // Pointer
var assessment_general_status = ''; // overall Image depiction
var imageLyr; // Pointer
var imageThumbnailLyr; // Pointer
var imageRetryAttempt = 0;
var loadHiResDelay = 500; // wait 500ms before accepting next request to load hiRes image
var loadHiResReady = true;
var loadHiResTimeout;
var damage_markers = { // Marker = Severity: 'hex color'
	"affected": '#ffffcc',
	"minor": '#ffc000',
	"major": '#FF4D4D',
	"destroyed": '#9966ff'
};
var set_drawing_options; // exposing function globally
var xhr;

activate();

// Functions

function activate() {
	$.get('/templates/modal.html', function (template) {
		$(template).appendTo('body');
		if (!check_protocol()) {
			$("#myModal").modal({
				"remote": "templates/redirectModal.html"
			});
			return;
		}
	});
	$.get('/templates/tooltipModal.html', function (template) {
		$(template).appendTo('body');
		build_damage_marker_tooltips();
	});
	$.ajaxPrefilter(function (options) {
		if (options.crossDomain && window.location.host === "localhost:8889") {
			// Set the proxy URL
			if (options.url[0] === "/") options.url = "http://localhost:8889" + options.url;
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

	if (current_image && "id" in current_image) {
		imageID = current_image["id"];
		missionId = current_image["imagemissionid"];
		set_info("#eventname", current_image["imageeventname"]);
		set_info("#missionname", current_image["imagemissionname"]);
		set_info("#teamname", current_image["imageteamname"]);
		set_info("#photo_date", convert_mssql_date(current_image["exifphotodate"]));
		set_info("#photo_altitude", current_image["altitude"]);

		// refactored in spike -- double check
		// set_review_image(jsonData);
	} else {
		alert("no more images to review");
	}

	// set the general status to be unintialized
	assessment_general_status = '';
	$("input[name=btn_GeneralMarker]").attr("checked", false);

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
	var geoJSON = features_to_geoJSON(imageObj.assessment_features._layers);
	// force a default missionId
	if (!missionId) {
		missionId = -1
	}

	// set general impacted if any buildings
	if (geoJSON.features.length > 0) {
		assessment_general_status = 'impact';
	}

	var post_data = {
		geo: geoJSON,
		generalStatus: assessment_general_status,
		missionId: missionId,
		imageId: imageID
	};

	$.ajax({
		type: "POST",
		url: APP_URL + "api/Save",
		data: JSON.stringify(post_data),
		failure: save_status,
		dataType: 'json',
		contentType: 'application/json',
		crossDomain: true
	}).success(function (data) {
		save_status(data, imageObj);
	});
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
	if (data && data.includes('Date(')) {
		dt_str = data.slice(6, 19);
		var date = new Date(parseInt(dt_str));
		dt_str = date.toISOString().slice(0, 19);
	} else if (data) {
		// preformated dates pass through
		dt_str = data
	} else {
		// pass "unknown"
		dt_str = "<b>unknown</b>";
	}

	return dt_str;
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
	set_training_modal();
	init_review_map();
	init_overview_map();
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
	// https://imgs.xkcd.com/comics/online_communities.png
	var url = 'https://s3.amazonaws.com/fema-cap-imagery/ref/Carte_detailee_de_west_point.jpg';

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
			url: APP_URL + "api/Image",
			processData: false,
			crossDomain: true,
			headers: {
				'X-Requested-With': 'XMLHttpRequest'
			}
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

function retryImage() {
	image_history.pop();
	if (imageRetryAttempt++ < IMG_RETRY_MAX_ATTEMPTS) {
		next_image();
	} else {
		alert("Image Server is currently experiencing difficulties. Please try again later.\n" +
			"If you continue to experience difficulties, please contact the site admin.\n\n"
		);
	}
}

function save_status(data, imageObj) {
	console.log(data);
	if (data.status === "succeeded") imageObj.submitted = true;
	next_image();
}

function save_next_image() {
	console.log("Submitted");
	buildPayload(image_history[image_index]);
	// next_image(); // executed in buildPayload
}

function set_general(severity) {
	assessment_general_status = severity;
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
		// $('a[title="Cancel drawing"]').click(); // Doesn't work 
	}
}

function set_overview_image(image) {
	var lat = parseFloat(image["latitude"]),
		lng = parseFloat(image["longitude"]);
	if (isNaN(lat) || isNaN(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
		console.log("Invalid lat/lng, skipping to next image");
		image_history.pop();
		next_image();
		return;
	}
	overview_features.clearLayers();
	var marker = L.marker([lat, lng], {
		icon: Icons['camera']
	})
	overview_features.addLayer(marker);

	overview_map.setView(
		[parseFloat(image["latitude"]), parseFloat(image["longitude"])],
		calc_zoom(image["altitude"])
	);
}

function loadPicture(imageObj) {
	map.setView(IMG_CENTER, IMG_ZOOM);
	loadThumbnail();
	if (loadHiResReady) {
		loadHiResReady = false;
		loadHiRes();
		loadHiResTimeout = setTimeout(function () {
			loadHiResReady = true;
		}, loadHiResDelay);
	} else {
		clearTimeout(loadHiResTimeout);
		loadHiResTimeout = setTimeout(function () {
			loadHiResReady = true;
			loadHiResTimeout = "";
			loadHiRes(); // should fire with whatever the current hiRes image is
		}, loadHiResDelay);
	}
	if (!isHistory) {
		imageObj.assessment_features = new L.FeatureGroup();
	}
}

function set_review_image(imageObj, isHistory) {
	var failed = false,
		overviewLoaded = false;
	if (assessment_features) assessment_features.remove();
	if (imageThumbnailLyr) {
		map.removeLayer(imageThumbnailLyr);
		imageThumbnailLyr.remove();
	}
	if (imageLyr) {
		map.removeLayer(imageLyr);
		imageLyr.remove();
	}

	// IF the imageObj is a point image
	loadPicture(imageObj);

	assessment_features = imageObj.assessment_features;
	map.addLayer(assessment_features);
	if (drawControl) map.removeControl(drawControl);
	if (!imageObj.submitted) build_leaflet_draw_toolbar(map, assessment_features);
	update_nav(imageObj, isHistory)

	function loadThumbnail() {
		imageThumbnailLyr = L.imageOverlay(imageObj.image["thumbnailurl"], bounds).addTo(map);
		imageThumbnailLyr.on("load", function () {
			imageRetryAttempt = 0;
			if (!overviewLoaded) {
				set_overview_image(imageObj.image);
				overviewLoaded = true;
			}
			if (imageObj.imageLyr === "") imageObj.imageLyr = imageThumbnailLyr;

		});
		imageThumbnailLyr.on("error", function () {
			if (imageThumbnailLyr) {
				map.removeLayer(imageThumbnailLyr);
				imageThumbnailLyr.remove();
			}
			failed = failed ? retryImage() : true;
		});
	}

   function loadWMTSMap(imageObj) {
   	var map = new L.Map('map', {
		  center: bounds.getCenter(),
		  zoom: 5,
		  layers: [osm],
		  maxBounds: bounds,
		  maxBoundsViscosity: 1.0
		});
   }

   function loadWMTSMap2(imageObj) {
		var map = L.map('map').setView([51.505, -0.09], 3);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
		
		var southWest = L.latLng(-89.98155760646617, -180),
		northEast = L.latLng(89.99346179538875, 180);
		var bounds = L.latLngBounds(southWest, northEast);
		
		map.setMaxBounds(bounds);
		map.on('drag', function() {
		    map.panInsideBounds(bounds, { animate: false });
		});   	
   }

	function loadHiRes() {
		imageLyr = L.imageOverlay(imageObj.image["imageurl"], bounds).addTo(map);
		imageLyr.on("load", function () {
			imageRetryAttempt = 0;
			loadHiResReady = true;
			if (!overviewLoaded) {
				set_overview_image(imageObj.image);
				overviewLoaded = true;
			}
			if (imageThumbnailLyr) {
				map.removeLayer(imageThumbnailLyr);
				imageThumbnailLyr.remove();
			}
			imageObj.imageLyr = imageLyr;
		});
		imageLyr.on("error", function () {
			loadHiResReady = true;
			if (imageLyr) {
				map.removeLayer(imageLyr);
				imageLyr.remove();
			}
			failed = failed ? retryImage() : true;
		});
	}
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

function set_training_modal() {
	$("a#imageAnalysisTrainingLink").click(function (e) {
		e.stopPropagation();
		e.preventDefault();
		$("#myModal").modal({
			"remote": "templates/imageAnalysisTrainingModal.html"
		});
	});
}

function skip_image() {
	next_image();
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
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

function build_damage_marker_tooltips() {
	var classificationText = {
			"Earthquake": {
				"affected": ['Some damage to the structure and contents, but still habitable. Small plaster cracks at corners of door and window openings and wall-ceiling intersections; small cracks in masonry chimneys and masonry veneers. Small cracks are assumed to be visible with a maximum width of less than 1/8 inch (cracks wider than 1/8 inch are referred to as "large" cracks).', 'None', 'None', 'None', 'Very little or no damage is observed from visible imagery. May be "Green Tagged" as Inspected using ATC-20 criteria by local building officials or qualified engineer allowing entry into the building.', 'Available IA inspection indicated Full Verified Loss (FVL) of greater than $0 and less than $5,000.'],
				"minor": ['Home is damaged and uninhabitable, but may be made habitable in short period of time with repairs. Large plaster or gypsum-board cracks at corners of door and window openings; small diagonal cracks across shear wall panels exhibited by small cracks in stucco and gypsum wall panels; large cracks in brick chimneys; toppling of tall masonry chimneys.', 'None', 'None', 'None', 'Occasional (<20%) brick chimney, parapet are veneer damage may be observed in visible imagery. May be "Green Tagged" as Inspected using ATC-20 criteria by local building officials or qualified engineer allowing entry into the building.', 'Available IA inspection indicated Full Verified Loss (FVL) of greater than $5,000 and less than $17,000.'],
				"major": ['Substantial failure to structural elements of residence (e.g., walls, floors, foundation), dwelling is uninhabitable and requires extensive repairs. The dwelling is unusable in its current condition and cannot be made habitable in a short period of time. Extensive structural damage and/or partial collapse. Partial collapse of exterior bearing walls. Large diagonal cracks across shear wall panels or large cracks at plywood joints; permanent lateral movement of floors and roof; toppling of most brick chimneys; cracks in foundations; splitting of wood sill plates and/or slippage of structure over foundations.', 'Occasionally (<20%) observed in visible imagery.', 'Occasionally (<20%) observed in visible imagery.', 'Onset of structural damage. Partial collapse of some exterior walls.', 'More frequent (>20%) non structural brick chimney, parapet are veneer damage may be observed in visible imagery.  May be "Yellow Tagged" as Restricted Entry using ATC-20 criteria by local building officials or qualified engineer restricting entry into the building.', 'Available IA inspection indicated Full Verified Loss (FVL) of greater than $17,000.'],
				"destroyed": ['Total loss of structure, structure is not economically feasible to repair, or complete failure of two or more major structural components (e.g., collapse of basement walls/foundation, walls or roof). Structure may have large permanent lateral displacement or be in imminent danger of collapse due to cripple wall failure or failure of the lateral load resisting system; some structures may slip and fall of the foundation; large foundation cracks. Based on building type 3% (wood-frame) to 15% (masonry) of the total area of buildings with this level of damage is expected to be collapsed, on average.', 'More frequently (>20%) observed in visible imagery.', 'More frequently (>20%) observed in visible imagery.', '3 to 15% of exterior walls collapse, and are threat to collapse in aftershocks.', 'Likely to be "Red Tagged" as Unsafe using ATC-20 criteria by local building officials or qualified engineer preventing entry into building.', 'Available IA inspection flagged the structure as "Destroyed".  Many of these buildings may not meet the IA inspection criteria for Destroyed of "most exterior wall collapsed", however, they will likely be complete economic losses and significant ongoing collapse hazards during aftershocks.']
			},
			"Fire": {
				"affected": ['Some damage to the structure and contents, but still habitable.', 'Generally superficial damage. Structures have been exposed to fire but are not destroyed.', 'Up to 20%', 'None', 'None', 'Roofing materials may buckle, partially melt, or burn. This could cause leaks.  Depending on the siding material, it may warp, melt or burn. Paint may be damaged.', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $0 and less than $5,000.'],
				"minor": ['Home is damaged and uninhabitable, but may be made habitable in short period of time with repairs.', 'Few structures are burned/destroyed', '>20%', 'Up to 20%', 'None', 'Windows and doorframes may warp and weather stripping may be damaged. Windows may break.', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $5,000 and less than $17,000.'],
				"major": ['Substantial failure to structural elements of residence (e.g., walls, floors, foundation), dwelling is uninhabitable and requires extensive repairs. The dwelling is unusable in its current condition and cannot be made habitable in a short period of time.', 'Some structures are completely burned/destroyed most sustain observable exterior damage (interior walls exposed)', '>20%', '>20%', 'Some exterior walls are collapsed.', 'Roofs and floors may have sustained structural damage if the house is partially burned.', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $17,000.'],
				"destroyed": ['Total loss of structure, structure is not economically feasible to repair, or complete failure of two or more major structural components, may be burned to foundation.', 'Most structures are completely burned/destroyed', '>20%', '>20%', 'Majority of the exterior walls are collapsed', 'Available IA inspection flagged the structure as "Destroyed".']
			},
			"Inundation": {
				"affected": ['Some damage to the structure and contents, but still habitable.', 'Generally superficial damage to solid structures (loss of tiles or roof shingles); some mobile homes and light structures damaged or displaced.', 'Up to 20%', 'None', 'None', 'Gutters and/or awning; loss of vinyl or metal siding.', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $0 and less than $5,000.'],
				"minor": ['Home is damaged and uninhabitable, but may be made habitable in short period of time with repairs.', 'Solid structures sustain exterior damage (e.g., missing roofs or roof segments); some mobile homes and light structures are destroyed, many are damaged or displaced.', '>20% ', 'Up to 20%', 'None', 'Garage doors collapse inward; failure of porch or carport', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $5,000 and less than $17,000.'],
				"major": ['Substantial failure to structural elements of residence (e.g., walls, floors, foundation), dwelling is uninhabitable and requires extensive repairs. The dwelling is unusable in its current condition and cannot be made habitable in a short period of time.', 'Some solid structures are destroyed; most sustain exterior and interior damage (roofs missing, interior walls exposed); most mobile homes and light structures are destroyed.<hr>Storm Surge: Extensive structural damage and/or partial collapse due to surge effects. Partial collapse of exterior bearing walls.', '>20%', '>20%', 'Some exterior walls are collapsed.', 'Mobile home could be completely off foundation – if appears to be repairable. Collapse of chimney', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $17,000.'],
				"destroyed": ['Total loss of structure, structure is not economically feasible to repair, or complete failure of two or more major structural components, may be burned to foundation.', 'Most structures are completely burned/destroyed<hr>Storm Surge: Structures have been completely destroyed or washed away by surge effects', '>20%', '>20%', 'Majority of the exterior walls are collapsed', '', 'Available IA inspection flagged the structure as "Destroyed".']
			},
			"INUNDATION_ASSESSMENTS": {
				"affected": "Field Verified Flood Depth (or Storm Surge): >0 to 2 feet relative to the ground surface at structure.  Depth damage relationships may vary based on building or foundation type, as well as duration or velocity of flood event. Depths may be adjusted for particular events based on preliminary assessments and recommendations from IA, as well as other imagery based damage assessments",
				"minor": "Field Verified Flood Depth  (or Storm Surge): 2 to 5 feet relative to the ground surface at structure. Depth damage relationships may vary based on building or foundation type, as well as duration or velocity of flood event. Depths may be adjusted for particular events based on preliminary assessments and recommendations from IA, as well as other imagery based damage assessments",
				"major": "Field Verified Flood Depth: Greater than 5 feet, modeling observed, relative to the ground surface at structure, and not high rise construction. Depth damage relationships may vary based on building or foundation type, as well as duration or velocity of flood event. Depths may be adjusted for particular events based on preliminary assessments and recommendations from IA, as well as other imagery based damage assessments.<br><b><sup>**</sup>Major is the general category where the onset of Substantial Damage (>50% of building value) as defined by the National Flood Insurance Program (NFIP) may occur.</b>",
				"destroyed": "Structures have been completely destroyed or washed away by surge effects."
			},
			"Wind": {
				"affected": ['Some damage to the structure and contents, but still habitable.', 'Generally superficial damage to solid structures (loss of tiles or roof shingles)', 'Up to 20%', 'None', 'None', 'Gutters and/or awning; loss of vinyl or metal siding. Garage doors collapse inward; failure of porch or carport', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $0 and less than $5,000.'],
				"minor": ['Home is damaged and uninhabitable, but may be made habitable in short period of time with repairs.', 'Solid structures sustain exterior damage (e.g., missing roofs or roof segments); ', '>20% ', 'Up to 20%', 'None', 'Nonstructural damage to exterior, roof components, damage to chimney to include tilting, fallen, cracks ', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $5,000 and less than $17,000.'],
				"major": ['Substantial failure to structural elements of residence (e.g., walls, floors, foundation), dwelling is uninhabitable and requires extensive repairs. The dwelling is unusable in its current condition and cannot be made habitable in a short period of time', 'Some solid structures are destroyed; most sustain exterior and interior damage (roofs missing, interior walls exposed); most mobile homes and light structures are destroyed.', '>20%', '>20%', 'Some exterior walls are collapsed.', 'Major damage to structural elements of roof, walls, or foundation to include crumbling, bulging, collapsing. Shifting of residence on foundation more than six inches.', 'Available IA inspection indicated FEMA Verified Loss (FVL) of greater than $17,000.'],
				"destroyed": ['Total loss of structure, structure is not economically feasible to repair, or complete failure of two or more major structural components (e.g., collapse of basement walls/foundation, walls or roof).', 'Most solid and all light or mobile home structures destroyed.', '>20%', '>20%', 'Majority of the exterior walls are collapsed.', 'Total collapse of walls or roof', 'Available IA inspection flagged the structure as "Destroyed".']
			}
		},
		rowOrder = ["Wind", "Inundation", "Fire", "Earthquake"],
		templates = {};

	Object.keys(damage_markers).forEach(function (marker) {
		templates[marker] = rowOrder.map(function (element) {
			return build_row_template(marker, element);
		});
	}, this);

	function build_row_template(type, header) {
		return "<th>" + header + "</th><td" + (header === "Earthquake" ? ' class="span" colspan="2" scope="col"' : "") + ">" + classificationText[header][type].join("</td><td>") + "</td>";
	}

	$('div.damage_markers a[data-toggle="tooltip"]').tooltip({
		container: "div.damage_markers",
		placement: "top"
	}).click(function (e) {
		e.stopPropagation();
		e.preventDefault();
		var modal = $("#tooltipModal"),
			type = e.currentTarget.dataset.type;
		modal.find('table.tooltipModalTable').removeClass("affected minor major destroyed").addClass(type);
		modal.find('.modal-title').text('"' + toTitleCase(type) + '" Damage Classification Chart');
		modal.find('tr.assessmentText').each(function (index) {
			$(this).html(templates[type][index]);
		});
		modal.find('p#INUNDATION_ASSESSMENTS').html("<b>INUNDATION ASSESSMENT:</b> " + classificationText.INUNDATION_ASSESSMENTS[type]);
		modal.modal();
	});
}