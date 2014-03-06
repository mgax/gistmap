(function(M) {
  'use strict';

  var editor = null;
  var map = null;
  var cache = {};

  function renderPropertiesTable(properties) {
    var table = $('<table class="properties">');
    _.forEach(properties, function(value, key) {
      $('<tr>').appendTo(table).append(
        $('<th>').text(key),
        $('<td>').text(value)
      );
    });
    return $('<div>').append(table).html();
  }

  function fetchGoogleSpreadsheet(key, callback) {
    var cacheKey = 'tabletop-' + key;
    if(cache[cacheKey]) { callback(cache[cacheKey]); return; }
    Tabletop.init({
      key: key,
      simpleSheet: true,
      callback: function(data) {
        cache[cacheKey] = data;
        callback(data);
      }
    });
  }

  function fetchJson(url, callback) {
    var cacheKey = 'json-' + url;
    if(cache[cacheKey]) { callback(cache[cacheKey]); return; }
    $.getJSON(url, function(data) {
      cache[cacheKey] = data;
      callback(data);
    });
  }

  function fetchGist(id, callback) {
    var cacheKey = 'gist-' + id;
    if(cache[cacheKey]) { callback(cache[cacheKey]); return; }
    $.ajax({
      type: 'GET',
      url: 'https://api.github.com/gists/' + id,
      dataType: 'jsonp',
      success: function(data) {
        cache[cacheKey] = data;
        callback(data);
      }
    });
  }

  function getData(dataConfig, callback) {
    if(dataConfig.indexOf('//docs.google.com/spreadsheet/') > -1) {
      fetchGoogleSpreadsheet(dataConfig, function(row_list) {
        var data = {};
        _.forEach(row_list, function(row) {
          var key = row.id;
          data[key] = row;
        });
        callback(data);
      });
    }
    else {
      console.log("Unknown data source", dataConfig.type);
    }
  }

  var layerRender = {
    tiles: function(map, layerConfig) {
      L.tileLayer(layerConfig.src, {
          attribution: layerConfig.attribution
      }).addTo(map);
    },

    background: function(map, layerConfig) {
      function tileLayer(src, attribution) {
        L.tileLayer(src, {attribution: attribution}).addTo(map);
      }
      if(layerConfig.source == 'osm') {
        tileLayer(
          "http://{s}.tile.osm.org/{z}/{x}/{y}.png",
          "&copy; <a href=\"http://osm.org/copyright\">" +
              "OpenStreetMap</a> contributors"
        );
      }
      else {
        console.log("Unknown background tile source", layerConfig.source);
      }
    },

    choropleth: function(map, layerConfig) {
      var layer = L.geoJson();
      layer.addTo(map);

      getData(layerConfig.data, function(resp) {
        var data = resp;
        fetchJson(layerConfig.features, function(resp) {
          var features;

          var getValue = function(row) {
            return parseFloat(row[layerConfig.dataColumn || 'value']);
          };

          if(resp.type == 'FeatureCollection') {
              features = resp.features;
          }
          else if(resp.type == 'Topology') {
              var respLayer = _.values(resp.objects)[0];
              features = topojson.feature(resp, respLayer).features;
          }
          else {
              console.log("Unknown document type", layerConfig.features);
              return;
          }

          var colorRange = layerConfig.colorRange;
          if(! colorRange) {
            var extent = d3.extent(_.values(data), getValue);
            colorRange = {
              min: {color: "#aaa", value: extent[0]},
              max: {color: "#038", value: extent[1]}
            };
          }
          var color = d3.scale.linear()
              .domain([colorRange.min.value, colorRange.max.value])
              .range([colorRange.min.color, colorRange.max.color])
              .interpolate(d3.interpolateLab);

          layer.options.style = function(feature) {
            var code = feature.properties.id;
            var row = data[code] || {};
            var value = getValue(row);
            return {
              weight: 1,
              fillColor: color(value),
              fillOpacity: 0.5
            };
          };

          layer.on('click', function(evt) {
            var properties = evt.layer.feature.properties;
            var code = properties.id;
            var html = renderPropertiesTable(data[code]);
            var latlng = evt.layer.getBounds().getCenter();
            L.popup().setLatLng(latlng).setContent(html).openOn(map);
          });

          layer.addData(features);
          map.fitBounds(layer.getBounds());
        });
      });
    },

    bubble: function(map, layerConfig) {
      var color = layerConfig.color || '#008';
      var getValue = function(row) {
        return parseFloat(row[layerConfig.dataColumn || 'value']);
      }
      getData(layerConfig.data, function(resp) {
        var data = resp;
        var bounds = null;
        var rangeMax = 5000 * 1000 * 1000;  // 5000 square km
        fetchJson(layerConfig.features, function(resp) {
          var scale = d3.scale.linear()
            .domain([0, d3.max(_.values(data), getValue)])
            .range([0, rangeMax]);
          _.forEach(resp.features, function(feature) {
            var id = feature.properties.id;
            if(data[id]) {
              var value = getValue(data[id]);
              var radius = Math.sqrt(scale(value) / Math.PI);
              var coord = feature.geometry.coordinates;
              var latLng = L.latLng([coord[1], coord[0]]);
              var circle = L.circle(latLng, radius, {
                weight: 1,
                color: color,
                fillColor: color
              });
              if(! bounds) {
                bounds = L.latLngBounds([latLng, latLng]);
              }
              else {
                bounds.extend(latLng);
              }
              circle.addTo(map);

              circle.on('click', function(evt) {
                var properties = feature.properties;
                var code = properties.id;
                var html = renderPropertiesTable(data[code]);
                L.popup().setLatLng(latLng).setContent(html).openOn(map);
              });
            }
          });
          map.fitBounds(bounds);
        });
      });
    }
  };

  function renderMap(config) {
    if(editor) {
      editor.setValue(JSON.stringify(config, null, '  '));
    }

    if(map) {
      map.remove();
    }

    map = L.map('map');

    _.forEach(config.layers, function(layerConfig) {
      var renderFunction = layerRender[layerConfig.type];
      if(renderFunction) {
        renderFunction(map, layerConfig);
      }
      else {
        console.log("Unknown layer type", layerConfig.type);
      }
    });
  }

  var providerMap = {
    gist: function(args) {
      configFromGist(args.gist[0], function(config) {
        renderMap(config);
      });
    },

    path: function(args) {
      $.getJSON(args.path[0], function(config) {
        renderMap(config);
      });
    }
  };

  function loadConfig() {
    var args = parseQueryString(window.location.search.substr(1));
    if(args.gist) {
      providerMap.gist(args);
    }
    else if(args.path) {
      providerMap.path(args);
    }
    else {
      console.log("Could not match a provider", args);
    }
    if(args.devel) {
      createDevelMenu();
    }
  }

  function createDevelMenu() {
    $('body').addClass('devel');
    editor = CodeMirror($('#devel-code')[0], {mode: "application/json"});
    $('#devel-apply').click(function(evt) {
      evt.preventDefault();
      try {
        var config = JSON.parse(editor.getValue());
      }
      catch(e) {
        $('#devel-message').text("JSON parse error: " + e.message);
        return;
      }
      $('#devel-message').text('');
      renderMap(config);
    });
  }

  function configFromGist(id, callback) {
    fetchGist(id, function(gist) {
      callback(JSON.parse(gist.data.files['map.json'].content));
    });
  }

  function parseQueryString(queryString) {
    var rv = {};
    _.forEach(queryString.split('&'), function(pair) {
      var key = decodeURIComponent(pair.split('=')[0]);
      var value = decodeURIComponent(pair.split('=')[1]);
      (rv[key] = rv[key] || []).push(value);
    });
    return rv;
  }

  M.main = function() {
    loadConfig();
  };

})(window.M = {});
