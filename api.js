MapControl = {

  setup: function(container, options) {

    var self = this;
    var map = plugin.google.maps.Map.getMap(container, options);
    map.setClickable(true);
    self.__map = map;

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
        self.__onMapMoveEnd && self.__onMapMoveEnd.apply(self, [map]);
        map.getVisibleRegion(function(bounds) {
          self.__markersInBounds = _.filter(self.__markers, function(item) {
            var latLng = item.marker.get('position');
            return bounds.contains(latLng);
          });
        });
      }, 500);
    });

  },

  get: function() {
    return this.__map;
  },

  destroy: function() {
    this.__map.remove();
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

    if (this.__center) {
      if ((this.__center.lat === latitude) && (this.__center.lng === longitude)) {
        return;
      }
    }
    this.__center = new plugin.google.maps.LatLng(latitude, longitude);

    var that = this;
    that.__map.animateCamera({
      'target': that.__center,
      'zoom': 16,
      'duration': 1000
    }, function() {});
  },

  onMarkerClick: function(handler) {
    this.__onMarkerClick = handler;
  },

  setMarkers: function(markers) {
    var newMarkersIds = _.map(markers, this.getMarkerId);
    var currentMarkerIds = _.map(this.__markers, this.getMarkerId);
    var removedMarkersIds = _.difference(currentMarkerIds, newMarkersIds);


    console.log('@@@ new markers', newMarkersIds);
    console.log('@@@ current markers', currentMarkerIds);
    console.log('@@@ removed markers', removedMarkersIds);


    // remove current markers that are not in the new set
    this.removeMarkers(removedMarkersIds);

    // add new ones (addMarkers auto checks for dupes)
    this.addMarkers(markers);
  },

  addMarkers: function(markers) {
    var that = this;

    console.log('@@@@@ adding markers', markers.length);

    _.each(markers, function(m) {

      var existingMarker = _.find(that.__markers, function(m) {
        return m._id === that.getMarkerId(m);
      });

      if (!existingMarker) {
        that.__map.addMarker({
          position: new plugin.google.maps.LatLng(m.latitude, m.longitude),
          _id: m._id
        },function(marker) {
          that.__markers.push({
            _id: marker.get('_id'),
            marker: marker
          });
          marker.setOpacity(0.5);
          marker.addEventListener(plugin.google.maps.event.MARKER_CLICK, function(marker) {
            if (that.__onMarkerClick) {
              that.__onMarkerClick.call(that, marker);
            }
          });
        });
      } else {
        console.log('@@@ marker already on the map, skipping');
      }

    });
  },

  removeMarkers: function(markers) {
    var ids = _.map(markers, this.getMarkerId);
    var markersToRemove = _.filter(this.__markers, function(m) {
      return ids.indexOf(m._id) !== -1;
    });

    _.each(markersToRemove, function(m) { m.marker.remove(); });
    console.log('removing', ids);
    this.__markers = _.filter(this.__markers, function(m) {
      return ids.indexOf(m._id) === -1;
    });
  },

  getMarkers: function() {
    return this.__markers;
  },

  getMarker: function(id) {
    return _.findWhere(this.__markers, { _id: id });
  },

  addMarker: function(options, callback) {
    var self = this;
    self.__map.addMarker(options, function(marker) {
      self.__markers.push({
        '_id' : marker.get('_id'),
        'marker' : marker
      });
      callback && callback.apply && callback.apply(self, [marker]);
    });
  },

  removeMarker: function(id) {
    var item = this.getMarker(id) || {};
    var marker = Meteor._get(item, 'marker');
    marker.remove();
    self.__markers = _.without(self.__markers, item);
  },

  getMarkerId: function(marker) {
    return marker._id || (marker.get && marker.get('_id'));
  },

  __map: null,
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
  __center: null

};
