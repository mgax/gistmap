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
