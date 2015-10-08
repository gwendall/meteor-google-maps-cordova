Package.describe({
  name: 'gwendall:google-maps-cordova',
  summary: 'Native Google Maps for Cordova',
  git: 'https://github.com/gwendall/meteor-google-maps-cordova.git'
  version: '0.1.1'
});

Cordova.depends({
  'plugin.google.maps': 'https://github.com/wf9a5m75/phonegap-googlemaps-plugin/tarball/e77d0edc6e561c74dc9ce755f93ee5295e74185f'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use(['reactive-var','templating','tracker', 'underscore'], 'client');
  api.addFiles(['api.js'], 'client');
  api.export('MapControl');
});
