(function() {
'use strict';


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
    var map = L.map($('<div>')[0]);
    M.layerRender.tiles(map, {src: 'foo', attribution: 'bar'});
    var layer = _.values(map._layers)[0];
    expect(layer._url).toEqual('foo');
    expect(layer.options.attribution).toEqual('bar');
  });
});


})();
