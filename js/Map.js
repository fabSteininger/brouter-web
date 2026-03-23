BR.Map = {
    initMap() {
        var map;

        BR.keys = BR.keys || {};

        // Initialize MapLibre GL JS
        map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: BR.conf.initialMapLocation ? [BR.conf.initialMapLocation[1], BR.conf.initialMapLocation[0]] : [9.86, 50.99],
            zoom: BR.conf.initialMapZoom || 5,
            hash: true
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true
        }), 'top-right');
        map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        // Leaflet compatibility shims for BR components
        map.on = map.on.bind(map);
        map.off = map.off.bind(map);
        map.fire = (type, data) => map.getContainer().dispatchEvent(new CustomEvent(type, { detail: data }));

        map.addLayerOrig = map.addLayer;
        map.addLayer = function(layer) {
            if (layer.addTo) {
                layer.addTo(this);
            } else if (typeof layer === 'object' && layer.id) {
                this.addLayerOrig(layer);
            }
            return this;
        };

        map.removeLayerOrig = map.removeLayer;
        map.removeLayer = function(layer) {
            if (layer.onRemove) {
                layer.onRemove(this);
            } else if (typeof layer === 'string') {
                this.removeLayerOrig(layer);
            } else if (layer.id) {
                this.removeLayerOrig(layer.id);
            }
            return this;
        };

        BR.debug = BR.debug || {};
        BR.debug.map = map;

        // Simplified layersControl shim
        const layersControl = {
            addBaseLayer: () => {},
            addOverlay: () => {},
            removeLayer: () => {},
            activateDefaultBaseLayer: () => {},
            loadActiveLayers: () => {},
            _layers: []
        };

        return {
            map,
            layersControl
        };
    }
};
