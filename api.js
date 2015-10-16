Meteor.startup(function() {
  MapControl.__domIsRendered = true;
});

MapControl = {

  __map: null,
  __isCreated: new ReactiveVar(false),
  __isReady: new ReactiveVar(false),
  __markers: [],
  __markersInBounds: [],
  __onMarkerClick: null,
  __onMapReady: null,
  __onMapMove: null,
  __onMapMoveStart: null,
  __onMapMoveEnd: null,
  __onMapClick: null,
  __onMapClose: null,

  __domContainer: null,
  __domIsRendered: false,
  __elementIsDomNode: function(obj) {
    try {
      return obj instanceof HTMLElement;
    }
    catch(e){
      return (typeof obj==="object") && (obj.nodeType===1) && (typeof obj.style === "object") && (typeof obj.ownerDocument ==="object");
    }
  },
  __pluginIsAvailable: function() {
    return !!Meteor._get(window.plugin || {}, 'google', 'maps', 'Map');
  },

  __hasErrors: function() {
    if (!Meteor.isCordova) {
      console.log('You have to run the package from Cordova.');
      return true;
    }
    if (!this.__domContainer) {
      console.log('You have to pass a DOM container to build the map.');
      return true;
    }
    if (!this.__elementIsDomNode(this.__domContainer)) {
      console.log('The map container has to be a DOM node.');
      return true;
    }
    if (!this.__pluginIsAvailable()) {
      console.log('The map plugin is not available.');
      return true;
    }
    return false;
  },

  setup: function(container, options) {

    this.__domContainer = container;
    if (this.__hasErrors()) return;
    if (this.isCreated()) this.destroy();

    var self = this;
    var map = plugin.google.maps.Map.getMap(container, options);
    self.__isCreated.set(true);
    self.__isReady.set(false);
    self.__map = map;
    self.__markers = [];
    self.__markersInBounds = [];

    map.on(plugin.google.maps.event.MAP_READY, function() {
      self.__isReady.set(true);
      self.__onMapReady && self.__onMapReady.apply(self, [map]);
    });

    map.on(plugin.google.maps.event.CAMERA_CHANGE, _.throttle(function() {
      self.__onMapMove && self.__onMapMove.apply(self, [map]);
    }, 200));

    map.on(plugin.google.maps.event.MAP_CLICK, function() {
      self.__onMapClick && self.__onMapClick.apply(self, [map]);
    });

    map.on(plugin.google.maps.event.MAP_CLOSE, function() {
      self.__isCreated.set(false);
      self.__isReady.set(false);
      self.__onMapClose && self.__onMapClose.apply(self, [map]);
    });

    var handle = null;
    map.on(plugin.google.maps.event.CAMERA_CHANGE, function() {
      if (handle) {
        Meteor.clearTimeout(handle);
      } else {
        self.__onMapMoveStart && self.__onMapMoveStart.apply(self, [map]);
      }
      handle = Meteor.setTimeout(function() {
        handle = null;
        map.getVisibleRegion(function(bounds) {
          self.__markersInBounds = _.filter(self.__markers, function(item) {
            var latLng = item.marker.get('position');
            return bounds.contains(latLng);
          });
          self.__onMapMoveEnd && self.__onMapMoveEnd.apply(self, [map]);
        });
      }, 300);
    });

  },

  get: function() {
    return this.__map;
  },

  destroy: function() {
    if (this.isCreated()) {
      this.__domContainer = null;
      this.__map.remove();
      this.__map = null;
      this.__isCreated.set(false);
      this.__isReady.set(false);
    } else {
      console.log('Can\t destroy the map.');
    }
  },

  setView: function(latlng, zoom, duration, callback) {
    zoom = zoom || 15;
    duration = duration || {};
    callback = callback || function() {};
    var location = this.getLatLng(latlng);
    this.__map.animateCamera({
      'target': location,
      'zoom': zoom,
      'duration': duration
    }, callback);
  },

  isCreated: function() {
    return this.__isCreated.get();
  },

  isReady: function() {
    return this.__isReady.get();
  },

  onMapReady: function(handler) {
    this.__onMapReady = handler;
  },

  onMapMove: function(handler) {
    this.__onMapMove = handler;
  },

  onMapMoveStart: function(handler) {
    this.__onMapMoveStart = handler;
  },

  onMapMoveEnd: function(handler) {
    this.__onMapMoveEnd = handler;
  },

  onMapClick: function(handler) {
    this.__onMapClick = handler;
  },

  onMapClose: function(handler) {
    this.__onMapClose = handler;
  },

  setMapClickable: function(bln) {
    this.__map && this.__map.setClickable(bln);
  },

  centerMap: function(latitude, longitude) {
    var center = this.getLatLng({ lat: latitude, lng: longitude });
    this.__map.animateCamera({
      'target': center,
      'zoom': 16,
      'duration': 1000
    }, function() {});
  },

  onMarkerClick: function(handler) {
    this.__onMarkerClick = handler;
  },

  getMarkers: function() {
    return this.__markers;
  },

  getMarker: function(id) {
    return _.findWhere(this.__markers, { _id: id });
  },

  addMarker: function(options, callback) {
    var self = this;
    if (_.findWhere(self.__markers, { _id: options._id })) return;
    self.__map && self.__map.addMarker(options, function(marker) {
      self.__markers.push({
        '_id' : marker.get('_id'),
        'marker' : marker
      });
      callback && callback.apply && callback.apply(self, [marker]);
    });
  },

  removeMarker: function(id) {
    var item = this.getMarker(id) || {};
    if (!item.marker) return;
    item.marker.remove();
    this.__markers = _.without(this.__markers, item);
  },

  getLatLng: function(location) {
    return new plugin.google.maps.LatLng(location.lat, location.lng);
  }

};
