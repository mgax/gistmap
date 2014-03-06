(function() {
'use strict';


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


})();
