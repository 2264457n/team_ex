function extractTime(timeString) {
    return timeString.match(/[0-2][0-9]:[0-5][0-9]:[0-5][0-9]/)[0];
}

function timeDifference(t1, t2) {
    t1 = t1.split(":");
    t2 = t2.split(":");
    return (t2[0] - t1[0]) * 3600 +
        (t2[1] - t1[1]) * 60 +
        (t2[2] - t1[2]);
}

function distanceLatLon(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

class Route {
    constructor(xmlText) {
        this.xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
        this.points = Array.from(this.xmlDoc.getElementsByTagName('trkpt'));
        this.lats = this.points.map(x => parseFloat(x.getAttribute('lat')));
        this.lons = this.points.map(x => parseFloat(x.getAttribute('lon')));
        this.times = Array.from(this.xmlDoc.getElementsByTagName('time')).map(x => extractTime(x.innerHTML)).slice(1);
        this.seconds = this.times.map(x => timeDifference(this.getStartTime(), x));
        this.heartRates = [];
        this.elevations = Array.from(this.xmlDoc.getElementsByTagName('ele'));

        this.mapLines = [];
        this.distances = [];
        this.speeds = [];
        
        this.count = this.points.length;

        this.index = 0;

        console.log(this.count);
        console.log(this.points.length);
        console.log(this.lats.length);
        console.log(this.lons.length);
        console.log(this.times.length);
        console.log(this.seconds.length);
        console.log(this.xmlDoc);
        console.log("The list of the original elevations array",this.elevations.length);

        this.initializeLines();

    }

    initializeLines() {
        for (var i = 0; i < this.count - 1; i++) {
            var pointList = [[this.lats[i], this.lons[i]], [this.lats[i + 1], this.lons[i + 1]]];

            var firstpolyline = new L.Polyline(pointList, {
                color: 'red',
                weight: 2,
                opacity: 1,
                smoothFactor: 1
            });

            this.mapLines.push(firstpolyline);
        }
    }

    getLats() {
        return this.lats;
    }

    getLons() {
        return this.lons;
    }

    getCount() {
        return this.count;
    }

    getStartTime() {
        return this.times[0];
    }

    getFinishTime() {
        return this.times[this.count - 1];
    }

    getSessionTime() {
        return timeDifference(this.getStartTime(), this.getFinishTime());
    }

    getSeconds() {
        return this.seconds;
    }

    getIndex() {
        return this.index;
    }

    getCurrentLocation() {
        return [this.lats[this.index], this.lons[this.index]];
    }

    getElevations() {
      return this.elevations;
    }

    updateIndex(time, map) {
        var currentTime = this.seconds[this.index];

        if (currentTime == time) return false;

        var action = currentTime < time ? 1 : 2;
        var count = 0;
        var updated = false;
        switch (action) {
            case 1: {
                while (this.seconds[this.index + 1] <= time) {
                    this.index++;
                    count++;
                }
                //map.removeLayer(this.mapLines[this.index--]);
                if (count >= 1) updated = true;
                break;
            }
            case 2: {
                while (this.seconds[this.index] > time) {
                    //map.removeLayer(this.mapLines[this.index--]);
                    this.index--;
                    count++;
                }
                if (count >= 1) updated = true;
                break;
            }
        }
        return updated;
    }
}

function swapTab(evt, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "flex";
    evt.currentTarget.className += " active";
}

function sum(l) {
    return l.reduce((a, b) => a + b, 0);
}

var map = L.map('mapid').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var slider;
var timeLabel, hrLabel, speedLabel, paceLabel, inclineLabel;

var route;
var trkIndex = 0;
var startMarker, finishMarker;
var playing = false;

var playingInterval;
var playbackSpeed = 5;

$(document).ready(function () {

    timeLabel = document.getElementById("timeLabel");
    hrLabel = document.getElementById("heartRateLabel");
    speedLabel = document.getElementById("speedLabel");
    paceLabel = document.getElementById("paceLabel");
    inclineLabel = document.getElementById("inclineLabel");

    slider = document.getElementById("progressSlider");
    slider.onchange = function () {
        console.log(this.value);

        // Update all info
        // on the right side

        if (route.updateIndex(parseInt(this.value), map)) {
            map.setView(route.getCurrentLocation());
            console.log(route.getIndex());
        }
    };

    document.getElementById("uploadFileButton").onclick = function () {
        document.getElementById("uploadFile").click();
    };


    // $('#progressSlider').slider({
    //     min: 0,
    //     max: 333,
    //     step: 1,
    //     value: 0
    // });

    // document.getElementById("progressSlider").onchange = function () {
    //     $('#progressSlider').slider("value", this.value);
    //     console.log($('#progressSlider').slider("value"));
    // }

    document.getElementById("uploadFile").addEventListener('change', function () {
        var fr = new FileReader();
        fr.onload = function () {



            route = new Route(this.result);
            var lats = route.getLats();
            var lons = route.getLons();
            var count = route.getCount();

            var heartRates = route.get

          var elv_points = [];
          var elvs = route.getElevations();
          sessionStorage.setItem('original_elevations_list', JSON.stringify(elvs));




        // Put elevations into a proper format
        for (var i = 0; i < elvs.length; i++) {

            var tempElv = parseFloat(elvs[i].childNodes[0].nodeValue); // Parsing the array of XML element

            elv_points.push({ y:tempElv});
           /** console.log(elvs[i]); **/

        }

        sessionStorage.setItem('elvsPoints', JSON.stringify(elv_points));



            console.log(route.getStartTime() + " " + route.getFinishTime());
            console.log(route.getSessionTime());

            startMarker = L.marker([lats[0], lons[0]]).addTo(map);
            finishMarker = L.marker([lats[count - 1], lons[count - 1]]).addTo(map);

            startMarker.bindPopup("<b>Start</b><br>" + route.getStartTime()).openPopup();
            finishMarker.bindPopup("<b>Finish</b><br>" + route.getFinishTime())


            for (var i = 0; i < count - 1; i++) {

                //var pointA = [lats[i], lons[i]];

                // var pointA = new L.LatLng(lats[i], lons[i]);
                //var pointB = new L.LatLng(lats[i + 1], lons[i + 1]);
                var pointList = [[lats[i], lons[i]], [lats[i + 1], lons[i + 1]]];

                var firstpolyline = new L.Polyline(pointList, {
                    color: 'grey',
                    weight: 3,
                    opacity: 1,
                    smoothFactor: 1
                });
                firstpolyline.addTo(map);
            }

            var avgLat = sum(lats) / count;
            var avgLon = sum(lons) / count;

            map.setView([lats[0], lons[0]], 15);

            // $('#progressSlider').slider("option", "max", route.getSessionTime());  
            slider.max = route.getSessionTime();
        }
        fr.readAsText(this.files[0]);
    });

    document.getElementById("playButton").addEventListener('click', function () {
        playing = !playing;
        if (playing) {
            playingInterval = setInterval(function () {
                slider.value = parseInt(slider.value) + 1;
                slider.onchange();
                if (parseInt(slider.value) >= parseInt(slider.max)) {
                    clearInterval(playingInterval);
                    playingInterval = null;
                    playing = false;
                }
            }, 1000 / playbackSpeed);
        } else {
            clearInterval(playingInterval);
            playingInterval = null;
            playing = false;
        }
    });

    document.getElementById("statusTab").click();
});

function prepareGraph(xmlArray){
      var data = [];

        // Put elements into a proper format needed for the graph
        for (var i = 0; i < xmlArray.length; i++) {
            var tempElt = parseFloat(xmlArray[i].childNodes[0].nodeValue); // Parsing the array of XML elements

            data.push({ y:tempElt});


        }

        return data;
}
function elvChart(){
    // Get the modal
    var modal = document.getElementById('myModal');


    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal
    // btn.onclick = function() {
        modal.style.display = "block";
    // }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    var data = JSON.parse(sessionStorage.getItem('elvsPoints'));
    var name = "Elevations";
    window.onload = createChart(name, data);

		function createChart(chartName, data){
		    var chart = new CanvasJS.Chart("chartContainer", {
            animationEnabled: true,
            theme: "light2",
            title:{
                text: "Graph of " + chartName
            },
            axisY:{
                includeZero: false
            },
            data: [{
                type: "line",
                dataPoints: data,
            }]
        });
        chart.render();
	}
}
