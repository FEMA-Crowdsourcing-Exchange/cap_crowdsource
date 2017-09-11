// image_review.js

// GLOBALS
var $ = window.$;
var L = window.L;
var USE_LEAFLET = true;
var REPLACE_SRC = false;
var OVR_ZOOM = 14;
// var IMG_ZOOM = 3;
var IMG_ZOOM = 2;
// var IMG_DEFAULT_SIZE = [0, 0, 1200, 800];
var IMG_DEFAULT_SIZE = [0, 0, 1600, 1200];
// var IMG_CENTER = [600, 400];
var IMG_SCALE = Math.pow(2, IMG_ZOOM);
var IMG_CENTER = [-IMG_DEFAULT_SIZE[3]/IMG_SCALE, IMG_DEFAULT_SIZE[2]/IMG_SCALE];
var IMG_HISTORY_LEN = 5;
var Icons = createIcons();
console.log("Icons", Icons);
var eventId;
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
var draw_tool;
var styleSets;
var damageMarkers = { // Marker = Severity: 'hex color'
	"affected": '#0000ff',
	"impacted": '#0000ff',
	"damaged": '#FF0000',
	"destroyed": '#FF0000'
};
var setDrawingOptions; // exposing function globally


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
		options.beforeSend = function (xhr) {
			xhr.setRequestHeader('Host', 'localhost:8888');
			xhr.setRequestHeader('Origin', 'localhost:8888');
		}
		if (options.url[0] === "/") options.url = "http://127.0.0.1:8888" + options.url;

		// options.data = $.param(newData);
	} else {
		options.crossDomain = false; // ********** NOT SURE IF PRODUCTION SERVER NEEDS crossDomain TO BE true **********
	}
});

function build_styleSets() {
	var width = 3;
	var oClr = [200, 200, 200, 1];
	styleSets = {
		affected: new ol.style.Style({
			image: new ol.style.Circle({
				radius: width * 2,
				fill: new ol.style.Fill({
					color: "blue"
				}),
				stroke: new ol.style.Stroke({
					color: oClr,
					width: width / 2
				})
			}),
			zIndex: Infinity
		}),
		impacted: new ol.style.Style({
			image: new ol.style.Circle({
				radius: width * 2,
				fill: new ol.style.Fill({
					color: "blue"
				}),
				stroke: new ol.style.Stroke({
					color: oClr,
					width: width / 2
				})
			}),
			zIndex: Infinity
		}),
		damaged: new ol.style.Style({
			image: new ol.style.Circle({
				radius: width * 2,
				fill: new ol.style.Fill({
					color: [200, 30, 30, 0.8]
				}),
				stroke: new ol.style.Stroke({
					color: oClr,
					width: width / 2
				})
			}),
			zIndex: Infinity
		}),
		destroyed: new ol.style.Style({
			image: new ol.style.Circle({
				radius: width * 2,
				fill: new ol.style.Fill({
					color: [200, 30, 30, 0.8]
				}),
				stroke: new ol.style.Stroke({
					color: oClr,
					width: width / 2
				})
			}),
			zIndex: Infinity
		})
	};
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
	var control = map.addControl(drawControl);

	map.on(L.Draw.Event.DRAWSTART, function (e) {
		if ($("input[name=btn_DamageMarker][value=eraser]:checked").length === 1 || $("input[name=btn_DamageMarker]:checked").length === 0) {
			$("input[name=btn_DamageMarker][value=BLDG_A]").prop("checked", "checked");
			setDrawingOptions(damageMarkers['affected']);
		}
	});

	map.on(L.Draw.Event.CREATED, function (e) {
		$("input[name=btn_GeneralMarker][value=impct]").prop("checked", "checked");

		var type = e.layerType,
			layer = e.layer;

		assessment_features.addLayer(layer);
	});

	map.on(L.Draw.Event.EDITED, function (e) {
		var layers = e.layers;
		var countOfEditedLayers = 0;
		layers.eachLayer(function (layer) {
			countOfEditedLayers++;
		});
		console.log("Edited " + countOfEditedLayers + " layers");
	});

	setDrawingOptions = function (color) {
		drawControl.setDrawingOptions({
			circlemarker: {
				color: color
			}
		});

	}
}

function createIcons() {
	return {"camera": L.icon({
		iconUrl: 'img/camera.png',
		iconSize: [30, 30],
		iconAnchor: [14, 29]//,
		// popupAnchor: [-3, -76],
		// shadowUrl: 'my-icon-shadow.png',
		// shadowSize: [68, 95],
		// shadowAnchor: [22, 94]
	})};
}

function init_review_map() {
	// dimensions of the image
	var url = 'https://imgs.xkcd.com/comics/online_communities.png';

	if (USE_LEAFLET == true) {
		// Using leaflet.js to pan and zoom an image.
		// create the map
		map = L.map('map', {
			minZoom: 0,
			maxZoom: OVR_ZOOM,
			center: IMG_CENTER,
			zoom: IMG_ZOOM,
			crs: L.CRS.Simple // Coordinates in CRS.Simple take the form of [y, x] instead of [x, y], in the same way Leaflet uses [lat, lng] instead of [lng, lat].
		});

		// calculate the edges of the image, in coordinate space
		var southWest = map.unproject([0, IMG_DEFAULT_SIZE[3]], IMG_ZOOM - 1);
		var northEast = map.unproject([IMG_DEFAULT_SIZE[2], 0], IMG_ZOOM - 1);
		// var bounds = new L.LatLngBounds(southWest, northEast);
		bounds = new L.LatLngBounds(southWest, northEast);

		// add the image overlay, 
		// so that it covers the entire map
		L.imageOverlay(url, bounds).addTo(map);

		// tell leaflet that the map is exactly as big as the image
		map.setMaxBounds(bounds);

		buildLeafletDrawToolbar(map);
	} else {
		// Map views always need a projection.  Here we just want to map image
		// coordinates directly to map coordinates, so we create a projection that uses
		// the image extent in pixels.
		var extent = IMG_DEFAULT_SIZE;
		var projection = new ol.proj.Projection({
			code: "xkcd-image",
			units: "pixels",
			extent: extent
		});

		assessment_features = new ol.source.Vector({
			wrapX: false
		});

		var vector = new ol.layer.Vector({
			source: assessment_features
		});

		imageLyr = new ol.layer.Image({
			source: new ol.source.ImageStatic({
				attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
				url: url,
				projection: projection,
				imageExtent: extent
			}),
			zIndex: -1
		});

		map = new ol.Map({
			layers: [imageLyr, vector],
			target: "map",
			view: new ol.View({
				projection: projection,
				center: ol.extent.getCenter(extent),
				zoom: 2,
				maxZoom: 8
			})
		});

		build_styleSets();
	}
}

function init_overview_map() {
	if (USE_LEAFLET == true) {
		overview_map = L.map("overview_map").setView([39, -97.5], 4);
		L.esri.basemapLayer("Imagery").addTo(overview_map);
		overview_features = new L.FeatureGroup();
		overview_map.addLayer(overview_features);	
	} else {
		// Map views always need a projection.  Here we just want to map image
		// coordinates directly to map coordinates, so we create a projection that uses
		// the image extent in pixels.
		var extent = [-120, 24, -60, 48];
		var projection = new ol.proj.Projection({
			code: "EPSG:3857",
			units: "meters",
			extent: extent
		});

		overview_features = new ol.source.Vector({
			wrapX: false
		});

		var vector = new ol.layer.Vector({
			source: overview_features
		});

		var osm = new ol.layer.Tile({
			source: new ol.source.OSM(),
			zIndex: -1,
			visible: false
		});
		var bing = new ol.layer.Tile({
			visible: true,
			source: new ol.source.BingMaps({
				//key: 'Your Bing Maps Key from http://www.bingmapsportal.com/ here',
				imagerySet: "Aerial",
				maxZoom: 18,
				zIndex: -1
			})
		});

		overview_map = new ol.Map({
			layers: [osm, bing, vector],
			target: "overview_map",
			view: new ol.View({
				projection: "EPSG:3857",
				center: [-10909310.09774, 4300621.372044],
				zoom: 3,
				maxZoom: 16
			})
		});
	}
}

function init_map() {
	if (!checkProtocol()) {
		$("#redirectModal").modal();
		return;
	}
	init_review_map();
	init_overview_map();
	eventId = "9073";
	next_image();
}

function checkProtocol() {
	$("div#redirectModalText").html("<h3>" + window.location.href + " does not support 'https://'</h3>" +
		"<p>redirecting to: <a href='http:" + window.location.href.substring(window.location.protocol.length) + "'>http:" + window.location.href.substring(window.location.protocol.length) + "</a></p>" +
		"<p>Please bookmark and use the link above for future visits.</p>"
	);
	if (window.location.protocol === "https:") {
		setTimeout(function () {
			window.location.href = "http:" + window.location.href.substring(window.location.protocol.length);
		}, 5000);
		return false;
	}
	return true;
}

// function clear_images(myMap) {
// 	myMap.removeLayer(imageLyr);
// }

function set_overview_image(image) {
	if (USE_LEAFLET == true) {
		overview_features.clearLayers();
		var marker = L.marker([parseFloat(image["Latitude"]), parseFloat(image["Longitude"])], {icon: Icons['camera']})
		overview_features.addLayer(marker);
		
		overview_map.setView(
			[parseFloat(image["Latitude"]), parseFloat(image["Longitude"])],
			OVR_ZOOM
		);
	} else {
		var vw = overview_map.getView();
		var newPt = ol.proj.transform(
			[parseFloat(image["Longitude"]), parseFloat(image["Latitude"])],
			"EPSG:4326",
			"EPSG:3857"
		);
		vw.setCenter(newPt);
		if (vw.getZoom() < 12) {
			vw.setZoom(OVR_ZOOM);
		}

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(newPt),
			name: "Current Photo",
			class: "marker"
		});

		overview_features.clear();
		overview_features.addFeature(feature);
	}
}

function set_review_image(image) {
	var extent = IMG_DEFAULT_SIZE;
	if (USE_LEAFLET == true) {
		assessment_features.clearLayers();
		if (imageLyr) map.removeLayer(imageLyr);
		map.setView(IMG_CENTER, IMG_ZOOM);
		imageLyr = L.imageOverlay(image["ImageURL"], bounds).addTo(map);
	} else {
		var projection = new ol.proj.Projection({
			code: "CAP-image",
			units: "pixels",
			extent: extent
		});
		assessment_features.clear();

		var imgSrc = new ol.source.ImageStatic({
			attributions: '© <a href="https://disasters.geoplatform.gov" target="new">FEMA</a>',
			url: image["ImageURL"],
			projection: projection,
			imageExtent: extent
		});

		if (REPLACE_SRC == true) {
			imageLyr.setSource(imgSrc);
		} else {
			map.removeLayer(imageLyr);
			imageLyr = new ol.layer.Image({
				source: imgSrc,
				zIndex: -1
			});
			map.addLayer(imageLyr);
		}
		var vw = map.getView();
		vw.setZoom(IMG_ZOOM);
		vw.setCenter(IMG_CENTER);
	}
	set_overview_image(image);
}

function next_image() {
	if (1 == 2) {
		apply_image_info(sample_image_json);
	} else {
		$.ajax({
			url: "/ImageEventsService/PublicAPI.svc/VOTE/" + eventId + "/getImage",
			processData: false,
			crossDomain: true
		}).success(apply_image_info);
	}
}

function set_info(slctr, newText) {
	$(slctr).text(newText);
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

function apply_image_info(data) {
	var jsonData;
	if (typeof data == "string") {
		jsonData = JSON.parse(data);
	} else {
		jsonData = data;
	}

	set_info("#eventname", jsonData["EventName"]);
	set_info("#missionname", jsonData["MissionName"]);
	set_info("#teamname", jsonData["TeamName"]);
	set_info("#photo_date", convert_mssql_date(jsonData["EXIFPhotoDate"]));
	set_info("#photo_altitude", jsonData["Altitude"]);

	set_review_image(jsonData);
}

function previous_image() {
	console.log("previous_image");
	return;
}

// function save_next_image() {
// 	var WKT = new ol.format.WKT();

// 	var active_features = assessment_features.getFeatures();
// 	for (var idx = 0; idx < active_features.length; idx++) {
// 		var px = active_features[idx].getProperties();
// 		var geom = WKT.writeFeature(active_features[idx], {});
// 		console.log(px, geom);
// 	}

// 	next_image();
// }

function addMarkerTool(cls) {
	var myCls = cls;
	draw_tool = new ol.interaction.Draw({
		source: assessment_features,
		type: "Point",
		style: styleSets[myCls]
	});
	draw_tool.on("drawend", function (e) {
		var style = styleSets[myCls];
		e.feature.setStyle(style);
		e.feature.setProperties({
				dmgClass: myCls
			},
			true
		);
	});

	map.addInteraction(draw_tool);
}

function removeMarkerTool() {
	var result = map.removeInteraction(draw_tool);
}

function set_markertool(severity) {
	if (severity != "eraser") {
		if (USE_LEAFLET) {
			setDrawingOptions(damageMarkers[severity]);
			$('a[title="Draw a circlemarker"] span').click();
		} else {
			$("input[name=btn_GeneralMarker][value=impct]").prop("checked", "checked");
			removeMarkerTool();
			addMarkerTool(severity);
		}
	} else {
		$("input[name=btn_GeneralMarker][value=impct]").prop("checked", "");
		if (USE_LEAFLET) {
			assessment_features.clearLayers();
			// $('a[title="Cancel drawing"]').click();	// Doesn't work		
		} else {
			assessment_features.clear();
		}
	}
}

function set_general(severity) {
	return;
}