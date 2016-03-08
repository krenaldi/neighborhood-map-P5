// Initialize the map
var map;

// Initialize the default infoWindow
var infoWindow = new google.maps.InfoWindow({
  // default content
  content: '<div><h4 id="venue-name"></h4><p id="venue-address"></p><p id="yelp"></p></div>'
});

// Set up the ViewModel
var ViewModel = function() {
  'use strict';

  var self = this;
  self.venueList = ko.observableArray([]);
  self.filteredVenueList = ko.observableArray([]);

  // Create the google map 
  self.initialize = function() {
    var mapCanvas = document.getElementById('google-map');
    var cenLatLng = new google.maps.LatLng(40.506836, -74.266960);
    var mapOptions = {
      center: cenLatLng,
      zoom: 10,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(mapCanvas, mapOptions);
  };

  // Create the list of venue locations from the model
  self.buildVenueLocations = function() {
    venueLocations.forEach(function(venueItem) {
      self.venueList.push( new Venue(venueItem) );
    });
  };

  // Set up an event listener for clicks for each venue
  self.setVenueClickFunctions = function() {
    self.venueList().forEach(function(venue) {
      google.maps.event.addListener(venue.marker(), 'click', function() {
        self.venueClick(venue);
      });
    });
  };

  // Function to handle clicking on a venue (either in list or marker)
  self.venueClick = function(venue) {
    // Set the content of the infoWindow
    var infoContent = '<div><h4 id="venue-name">' + venue.name() + '</h4>' +
                      '<h5 id="venue-address">' + venue.address() + '</h5>' +
                      '<h6 id="venue-neighborhood">' + venue.neighborhood() + '</h6>' +
                      '<p id="text">Rating on <a id="yelp-url">yelp</a>: ' +
                      '<img id="yelp"></p></div>';
    infoWindow.setContent(infoContent);
    self.getYelpData(venue);

    // Make the clicked on venue the center of the map
    map.panTo(new google.maps.LatLng(venue.lat(), venue.lng()));

    // Open the infoWindow at the marker location
    infoWindow.open(map, venue.marker());

    // Current venue marker bounces once when clicked
    self.setMarkerAnimation(venue);
  };

  // Sets the currenter marker to bounce once when clicked
  self.setMarkerAnimation = function(venue) {
    venue.marker().setAnimation(google.maps.Animation.BOUNCE);
    setTimeout( function() { venue.marker().setAnimation(null); }, 750);
  };

  // Function to handle filtering of venues based on the search form
  self.filterVenues = function() {
    // Set the filtered venue list to an empty array
    self.filteredVenueList([]);

    // Get the search string and the length of the original venue list
    var searchString = $('#search-str').val().toLowerCase();
    var len = self.venueList().length;

    // Loop through each venue in the venue list
    for (var i = 0; i < len; i++) {
      // Get the current venue name & neighborhood
      var venueName = self.venueList()[i].name().toLowerCase();
      var venueNeighborhood = self.venueList()[i].neighborhood().toLowerCase();

      // If the name or neighborhood match the search string,
      // add the venue to the filtered venue list
      if (venueName.indexOf(searchString) > -1 ||
          venueNeighborhood.indexOf(searchString) > -1) {
        self.filteredVenueList.push(self.venueList()[i]);
        // Set the map property of the marker to the map
        self.venueList()[i].marker().setMap(map);
      } else {
        // Set the map property of the marker to null so it won't be visible
        self.venueList()[i].marker().setMap(null);
      }
    }
  };

  self.getYelpData = function(venue) {
    // Uses the oauth-signature package installed with bower per https://github.com/bettiolo/oauth-signature-js

    // Use the GET method for the request
    var httpMethod = 'GET';

    // Yelp API request url
    var yelpURL = 'http://api.yelp.com/v2/search/';

    // nonce generator
    // function credit of: https://blog.nraboy.com/2015/03/create-a-random-nonce-string-using-javascript/
    var nonce = function(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

    // Set required parameters for authentication & search
    var parameters = {
      oauth_consumer_key: 'QaViCkyHyj1wY-smmXh6yQ',
      oauth_token: 'bSMpYC1wYz5KRYRpGGUq6SaIkIcaAMhg',
      oauth_nonce: nonce(20),
      oauth_timestamp: Math.floor(Date.now() / 1000),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_version: '1.0',
      callback: 'cb',
      term: venue.name(),
      location: 'South Plainfield, NJ', // set location so Yelp can pull data
      limit: 1
    };

    // Set other API parameters
    var consumerSecret = 'SpoFppLZKTB7TLQOjTcu1m9yWDs';
    var tokenSecret = 'oh2l1S9842JilfjN2y5q1TfFv2E';

    // generates a RFC 3986 encoded, BASE64 encoded HMAC-SHA1 hash
    var signature = oauthSignature.generate(httpMethod, yelpURL, parameters, consumerSecret, tokenSecret);

    // Add signature to list of parameters
    parameters.oauth_signature = signature;

    // Set up the ajax settings
    var ajaxSettings = {
      url: yelpURL,
      data: parameters,
      cache: true,
      dataType: 'jsonp',
      success: function(response) {
        // Update the infoWindow to display the yelp rating image
        $('#yelp').attr("src", response.businesses[0].rating_img_url);
        $('#yelp-url').attr("href", response.businesses[0].url);
      },
      error: function() {
        $('#text').html('Data could not be retrieved from yelp.');
      }
    };

    // Send off the ajax request to Yelp
    $.ajax(ajaxSettings);
  };

  // Add the listener for loading the page
  google.maps.event.addDomListener(window, 'load', function() {
    self.initialize();
    self.buildVenueLocations();
    self.setVenueClickFunctions();
    self.filteredVenueList(self.venueList());
  });
};

// Venue constructor to create breweries & marks from the model
var Venue = function(data) {
  'use strict';

  // Set all the properties as knockout observables
  var marker;
  this.name = ko.observable(data.name);
  this.date = ko.observable(data.date);
  this.location = ko.observable(data.location);
  this.lat = ko.observable(data.lat);
  this.lng = ko.observable(data.lng);
  this.address = ko.observable(data.address);
  this.neighborhood = ko.observable(data.neighborhood);

  // Google Maps Marker for this location
  marker = new google.maps.Marker({
    position: new google.maps.LatLng(this.lat(), this.lng()),
    map: map,
    title: this.name()
  });

  // Set the marker as a knockout observable
  this.marker = ko.observable(marker);
};

// Kick everything off!
ko.applyBindings( new ViewModel() );