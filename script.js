mapboxgl.accessToken =
  "pk.eyJ1IjoibmluYW5vdW4iLCJhIjoiY2pjdHBoZGlzMnV4dDJxcGc5azJkbWRiYSJ9.o4dZRrdHcgVEKCveOXG1YQ";

var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [-16.941760100955428, 14.378070950164796],
  zoom: 16.3,
  pitch: 45,
  bearing: 30,
});

var route = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-16.941760100955428, 14.378070950164796],
          [-16.95065784295878, 14.38936388722579],
          [-16.964384159135488, 14.407505866861184],
          [-16.96337716969775, 14.408288548044652],
          [-16.971479970814016, 14.420639423548284],
          [-16.989044635686856, 14.469102109224767],
          [-16.99575253841992, 14.494997448446878],
        ],
      },
    },
  ],
};

// A single point that animates along the route.
var point = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { distance: 0 }, // Add a distance property
      geometry: {
        type: "Point",
        coordinates: route.features[0].geometry.coordinates[0], // Initial position
      },
    },
  ],
};

var lineDistance = turf.lineDistance(route.features[0], "kilometers");

var arc = [];
var steps = 50000;

for (var i = 0; i < lineDistance; i += lineDistance / steps) {
  var segment = turf.along(route.features[0], i, "kilometers");
  arc.push(segment.geometry.coordinates);
}

route.features[0].geometry.coordinates = arc;

var counter = 0;

map.on("load", function () {
  map.addSource("route", {
    type: "geojson",
    data: route,
  });

  map.addSource("point", {
    type: "geojson",
    data: point,
  });

  map.addLayer({
    id: "route",
    source: "route",
    type: "line",
    paint: {
      "line-width": 4,
      "line-color": "#007cbf",
    },
  });

  map.addLayer({
    id: "point",
    source: "point",
    type: "circle",
    paint: {
      "circle-radius": 9,
      "circle-color": "#007cbf",
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2.5,
    },
  });

  var distancePopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  function animate() {
    point.features[0].geometry.coordinates =
      route.features[0].geometry.coordinates[counter];

    // Calculate the bearing
    point.features[0].properties.bearing = turf.bearing(
      turf.point(
        route.features[0].geometry.coordinates[
          counter >= steps ? counter - 1 : counter
        ]
      ),
      turf.point(
        route.features[0].geometry.coordinates[
          counter >= steps ? counter : counter + 1
        ]
      )
    );

    // Calculate the distance traveled so far
    var distanceTraveled = (lineDistance * counter) / steps;

    // Update the point properties to include the distance traveled
    point.features[0].properties.distance = distanceTraveled.toFixed(2);

    // Update the point source
    map.getSource("point").setData(point);

    // Show the distance traveled as a popup
    distancePopup
      .setLngLat(point.features[0].geometry.coordinates)
      .setHTML(`<h4>Distance: ${point.features[0].properties.distance} km</h4>`)
      .addTo(map);

    // Continue animation until the last step
    if (counter < steps) {
      requestAnimationFrame(animate);
    }

    counter += 1;
  }

  document.getElementById("replay").addEventListener("click", function () {
    point.features[0].geometry.coordinates =
      route.features[0].geometry.coordinates[0];
    point.features[0].properties.distance = 0; // Reset distance to 0
    map.getSource("point").setData(point);
    counter = 0;
    animate(counter);
  });

  animate(counter);

  var layers = map.getStyle().layers;

  var labelLayerId;
  for (var i = 0; i < layers.length; i++) {
    if (layers[i].type === "symbol" && layers[i].layout["text-field"]) {
      labelLayerId = layers[i].id;
      break;
    }
  }

  map.addLayer(
    {
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 15,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["get", "height"],
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["get", "min_height"],
        ],
        "fill-extrusion-opacity": 0.6,
      },
    },
    labelLayerId
  );
});
