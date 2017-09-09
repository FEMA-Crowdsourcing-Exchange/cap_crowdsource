// image_review.js

// GLOBALS
var USE_LEAFLET = true;
var REPLACE_SRC = false;
var OVR_ZOOM = 14;
var IMG_ZOOM = 3;
var IMG_DEFAULT_SIZE = [0, 0, 1200, 800];
var IMG_CENTER = [600, 400];
var eventId;
var image_history = [];
var current_image = {};
var sample_image_json =
	'{"Altitude":342.00,"AverageVoteLevel":null,"CalculatedHeading":-1.00,"DatePointTimeOffset":0,"EXIFFocalLength":200.00,"EXIFPhotoDate":"/Date(1504194601000+0000)/","EventId":9073,"EventName":"CAP - Hurricane Harvey","Filename":"DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Heading":-1.00,"Id":"e84a2184-76e4-4e64-8340-95439efea971","ImageArchived":false,"ImageEventImagesId":null,"ImageMissionId":613531,"ImageTypeId":1,"ImageURL":"https://fema-cap-imagery.s3.amazonaws.com/Images/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","Latitude":27.674026,"Longitude":-97.538701,"MaxVoteLevel":null,"MinVoteLevel":null,"MissionName":"S0831A","NMEAPoint_Id":0,"NumberOfVotes":0,"OffsetHeading":0.00,"OffsetSeconds":null,"PhotoUSNG":"14R PR 4461","Shape":{"Geography":{"CoordinateSystemId":4326,"WellKnownText":"POINT (-97.5387016666667 27.6740266666667)"}},"TargetUSNG":null,"TeamName":"HARVEY CSR","ThumbnailURL":"https://fema-cap-imagery.s3.amazonaws.com/Thumbs/9073/613531/DSC_0560_e84a2184-76e4-4e64-8340-95439efea971.jpg","VirtualID":"bd24b7ca-36cc-49c1-afb5-00045e3665fa"}';
var map;
var overview_map;
var overview_features;
var assessment_features;
var imageLyr;
var draw_tool;
var styleSets;

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

function init_review_map() {
	if (USE_LEAFLET == true) {
		// Using leaflet.js to pan and zoom a big image.

		// create the slippy map
		var map = L.map('map', {
			minZoom: 0,
			maxZoom: 10,
			center: [0, 0],
			zoom: 0,
			crs: L.CRS.Simple
		});

		// dimensions of the image
		var w = 1024,
			h = 968,
			url = 'https://imgs.xkcd.com/comics/online_communities.png';

		// calculate the edges of the image, in coordinate space
		var southWest = map.unproject([0, h], 1);
		var northEast = map.unproject([w, 0], 1);
		var bounds = new L.LatLngBounds(southWest, northEast);

		// add the image overlay, 
		// so that it covers the entire map
		L.imageOverlay(url, bounds).addTo(map);

		// tell leaflet that the map is exactly as big as the image
		map.setMaxBounds(bounds);
	} else {
		// Map views always need a projection.  Here we just want to map image
		// coordinates directly to map coordinates, so we create a projection that uses
		// the image extent in pixels.
		var extent = [0, 0, 1024, 968];
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
				url: "https://imgs.xkcd.com/comics/online_communities.png",
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

function clear_images(myMap) {
	myMap.removeLayer(imageLyr);
}

function set_overview_image(image) {
	if (USE_LEAFLET == true) {
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

	set_overview_image(image);
}

function next_image() {
	if (1 == 2) {
		apply_image_info(sample_image_json);
	} else {
		$.ajax({
			url: "/ImageEventsService/PublicAPI.svc/VOTE/" + eventId + "/getImage",
			processData: false
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
	return;
}

function save_next_image() {
	var WKT = new ol.format.WKT();

	var active_features = assessment_features.getFeatures();
	for (var idx = 0; idx < active_features.length; idx++) {
		var px = active_features[idx].getProperties();
		var geom = WKT.writeFeature(active_features[idx], {});
		console.log(px, geom);
	}

	next_image();
}

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
	console.log("remove tool: ", result);
}

function set_markertool(severity) {
	if (severity != "eraser") {
		$("input[name=btn_GeneralMarker][value=impct]").prop("checked", "checked");
		removeMarkerTool();
		addMarkerTool(severity);
	} else {
		assessment_features.clear();
	}
}

function set_general(severity) {
	return;
}

$.ajaxPrefilter(function (options) {
	if (options.crossDomain) {
		var newData = {};
		// Copy the options.data object to the newData.data property.
		// We need to do this because javascript doesn't deep-copy variables by default.
		newData.data = $.extend({}, options.data);
		newData.url = options.url;

		// Reset the options object - we'll re-populate in the following lines.
		options = {};

		// Set the proxy URL
		options.url = "http://127.0.0.1:8888/";
		options.data = $.param(newData);
		options.crossDomain = false;
	}
});