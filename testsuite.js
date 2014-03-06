(function() {
'use strict';


if(! window.Tabletop) { window.Tabletop = {init: function() {}}; }


var createLeafletMap = function() {
  return L.map($('<div>')[0]);
};


var getFirstLayer = function(map) {
  return _.values(map._layers)[0];
}


describe("parseQueryString", function() {
  it("parses an empty string", function() {
    expect(M.parseQueryString("")).toEqual({});
  });

  it("parses a simple key value pair", function() {
    expect(M.parseQueryString("a=b")).toEqual({a: ['b']});
  });

  it("parses multiple values for same key", function() {
    expect(M.parseQueryString("a=b&a=c&a=d")).toEqual({a: ['b', 'c', 'd']});
  });

  it("decodes keys and values", function() {
    expect(M.parseQueryString("%20=%20")).toEqual({' ': [' ']});
  });

  it("survives broken input", function() {
    expect(M.parseQueryString("&&&")).toEqual({});
    expect(M.parseQueryString("===")).toEqual({});
  });
});


describe("layerRender.tiles", function() {
  it("creates a tiles layer", function() {
    var map = createLeafletMap();
    M.layerRender.tiles(map, {src: 'foo', attribution: 'bar'});
    var layer = getFirstLayer(map);
    expect(layer._url).toEqual('foo');
    expect(layer.options.attribution).toEqual('bar');
  });
});


describe("layerRender.background", function() {
  it("creates an OSM layer", function() {
    var map = createLeafletMap();
    M.layerRender.background(map, {source: 'osm'});
    var layer = getFirstLayer(map);
    expect(layer._url).toContain('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
    expect(layer.options.attribution).toContain('http://osm.org/copyright');
  });
});


describe("layerRender.choropleth", function() {
  beforeEach(function() {
    jasmine.Ajax.install();
    spyOn(Tabletop, 'init');
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
  })

  it("creates a layer with blank data", function() {
    var dataUrl = 'https://docs.google.com/spreadsheet/ccc?key=' +
        '0AlBmcLkxpBOXdEEzSE1HWTdWeGYxTG9ja0l4c2VyRHc&usp=drive_web#gid=0';
    var featureUrl = 'url-for-the-feature';
    var geojson = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {id: 1},
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]
          }
        }
      ]
    });

    var map = createLeafletMap();
    M.layerRender.choropleth(map, {data: dataUrl, features: featureUrl});

    var initOptions = Tabletop.init.calls.first().args[0];
    expect(initOptions.key).toEqual(dataUrl);
    initOptions.callback([{id: 1, value: 1}]);

    var featureRequest = jasmine.Ajax.requests.first();
    expect(featureRequest.url).toEqual(featureUrl);

    featureRequest.response({status: '200', responseText: geojson});

    var layer = getFirstLayer(map);
    var object = layer.getLayers()[0];
    expect(object.feature.properties.id).toEqual(1);
  });
});


})();
