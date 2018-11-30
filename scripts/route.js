class Route {
    constructor(xmlText) {
        this.xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");

        this.points = Array.from(this.xmlDoc.getElementsByTagName('trkpt'));
        this.lats = this.points.map(x => parseFloat(x.getAttribute('lat')));
        this.lons = this.points.map(x => parseFloat(x.getAttribute('lon')));
        this.elevations = Array.from(this.xmlDoc.getElementsByTagName('ele')).map(x => x.innerHTML);

        this.count = this.points.length;

        this.times = Array.from(this.xmlDoc.getElementsByTagName('time')).map(x => extractTime(x.innerHTML)).slice(1);
        this.totalTime = timeDifference(this.getStartTime(), this.getFinishTime());
        this.seconds = this.times.map(x => timeDifference(this.getStartTime(), x));

        this.secondToIndex = [];

        this.heartRates = Array.from(this.xmlDoc.getElementsByTagName('ns3:hr')).map(x => x.innerHTML);
        if (this.heartRates.length == 0) {
            this.heartRates = Array.from(this.xmlDoc.getElementsByTagName('gpxtpx:hr')).map(x => x.innerHTML);
        }

        this.sessionTime = timeDifference(this.getStartTime(), this.getFinishTime());

        this.mapLines = [];

        this.distances = [0.0,];
        this.speeds = [0.0,];
        this.climb = [0.0,];
        this.gradients = [0.0,];
        this.elevationDiffs = [0.0,];
        this.timeGaps = [0.0,];

        this.heartRateChartData = [];
        this.speedChartData = [];
        this.elevationChartData = [];

        this.totalClimb = 0;

        this.index = 0;

        console.log(this.xmlDoc);

        this.mapSecondToIndex();
        this.initializeAttributes();
        this.initializeLines();
        this.initializeChartData();

        this.totalDistance = sum(this.distances);
        this.averageSpeed = this.totalDistance / (this.getSessionTime() / 3600);
    }

    isValid() {
        return this.points != null &&
            this.lats != null &&
            this.lons != null &&
            this.elevations != null &&
            this.times != null &&
        this.heartRates != null;
    }

    mapSecondToIndex() {
        var index = 0;
        var time = 0;
        for (time = 0; time <= this.totalTime; time++) {
            if (this.seconds[index + 1] == time) {
                index++;
            }
            this.secondToIndex.push(index);
        }
    }

    initializeLines() {
        for (var i = 0; i < this.count - 1; i++) {
            var pointList = [[this.lats[i], this.lons[i], this.speeds[i]],
                             [this.lats[i + 1], this.lons[i + 1], this.speeds[i + 1]]];

            // var line = new L.Polyline(pointList, {
            //     color: 'red',
            //     weight: 2,
            //     opacity: 1,
            //     smoothFactor: 1
            // });

            var line = L.hotline(pointList, {
                // palette: {0.0:'green', 1.0:'red', 1.0:'blue'},
                min: 0,
                max: this.getMaxSpeed() * 0.8,
                palette: {
                    0.0: '#008800',
                    0.5: '#ffff00',
                    1.0: '#ff0000'
                },
                weight: 2,
                opacity: 1,
                smoothFactor: 1,
                outlineWidth: 1,
                outlineColor: '#00000000'
            });

            this.mapLines.push(line);
        }
    }

    initializeAttributes() {
        for (var i = 0; i < this.count - 1; i++) {
            var distance = distanceLatLon(this.lats[i], this.lons[i], this.lats[i + 1], this.lons[i + 1]);
            var timeDiff = this.seconds[i + 1] - this.seconds[i];
            var speed = distance * 3600 / timeDiff;
            var elevationDiff = this.elevations[i + 1] - this.elevations[i];

            this.distances.push(distance);
            this.speeds.push(speed);
            this.timeGaps.push(timeDiff);
            this.elevationDiffs.push(elevationDiff)
            this.gradients.push(gradient(distance * 1000, elevationDiff));

            if (elevationDiff > 0) this.totalClimb += elevationDiff;
        }

        this.displaySpeeds = this.speeds.map(x => x.toFixed(1));
        this.paces = this.speeds.map(x => speedToPace(x));
        this.displayGradients = this.gradients.map(x => x.toFixed(1));
    }

    zipLatLonSpeed() {
        return [...Array(this.count).keys()].map(x => [this.lats[x], this.lons[x], 0]);
    }

    initializeMapComponent(map) {
        map.setView([this.lats[0], this.lons[0]], 18);

        var CustomIcon = L.Icon.extend({
            options: {
                iconSize: [32, 32],
                iconAnchor: [12, 31],
                popupAnchor: [4, -28]
            }
        });
        var flagIcon = new CustomIcon({ iconUrl: 'images/finish.png' });

        this.startMarker = L.marker([this.lats[0], this.lons[0]]);
        this.finishMarker = L.marker([this.lats[this.count - 1], this.lons[this.count - 1]], { icon: flagIcon }).addTo(map);

        this.startMarker.bindPopup("<b>Start</b><br>" + this.getStartTime());
        this.finishMarker.bindPopup("<b>Exercise ended</b><br>Duration: " + toDisplayTime(this.sessionTime) + "<br>Distance: " + this.totalDistance.toFixed(1) + " km");

        var line = L.hotline(this.zipLatLonSpeed(), {
            palette: {0.7:'grey', 0.7:'grey', 0.7:'grey'},
            weight: 5,
            smoothFactor: 1,
            outlineColor: 'transparent',
        })
        line.addTo(map);

        L.circle([this.lats[0], this.lons[0]], { radius: 7, color: 'yellowgreen', fill: 'grey' }).addTo(map);
    }

    initializeChartData() {
        var dataSeries1 = { type: "line" },
            dataSeries2 = { type: "line" },
            dataSeries3 = { type: "line" };

        var dataPoints1 = [], dataPoints2 = [], dataPoints3 = [];

        for (var i = 0; i < this.sessionTime; i += parseInt(this.sessionTime / 100)) {
            var displayTime = toDisplayTime(i);
            dataPoints1.push({
                label: displayTime,
                y: parseInt(this.heartRates[this.secondToIndex[i]])
            });
            dataPoints2.push({
                label: displayTime,
                y: parseFloat(this.displaySpeeds[this.secondToIndex[i]])
            });
            dataPoints3.push({
                label: displayTime,
                y: parseFloat(this.elevations[this.secondToIndex[i]])
            });
        }
        dataSeries1.dataPoints = dataPoints1;
        dataSeries2.dataPoints = dataPoints2;
        dataSeries3.dataPoints = dataPoints3;

        this.heartRateChartData.push(dataSeries1);
        this.speedChartData.push(dataSeries2);
        this.elevationChartData.push(dataSeries3);
    }

    getHeartRateChartData() {
        return this.heartRateChartData;
    }

    getSpeedChartData() {
        return this.speedChartData;
    }

    getElevationChartData() {
        return this.elevationChartData;
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
        return this.sessionTime;
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

    updateIndex(time, map) {
        var currentTime = this.seconds[this.index];

        if (currentTime == time) return false;

        var newIndex = this.secondToIndex[time];

        var action = this.index < newIndex ? 1 : 2;
        var count = 0;
        var updated = false;
        switch (action) {
            case 1: {
                while (this.index != newIndex) {
                    this.mapLines[this.index].addTo(map);
                    this.index++;
                    count++;
                }
                //map.removeLayer(this.mapLines[this.index--]);
                if (count >= 1) updated = true;
                break;
            }
            case 2: {
                while (this.index != newIndex) {
                    this.index--;
                    map.removeLayer(this.mapLines[this.index]);
                    count++;
                }
                if (count >= 1) updated = true;
                break;
            }
        }
        return updated;
    }

    getHeartRate() {
        return this.heartRates[this.index];
    }

    getDisplaySpeed() {
        return this.displaySpeeds[this.index];
    }

    getDisplayPace() {
        return this.paces[this.index];
    }

    getDisplayGradient() {
        return this.displayGradients[this.index];
    }

    getStartMarker() {
        return this.startMarker;
    }

    getFinishMarker() {
        return this.finishMarker;
    }

    getCaloriesBurned() {
        var sumHR = 0.0;
        for (var i = 0; i < this.count; i++) {
            sumHR += this.timeGaps[i] * this.heartRates[i];
        }
        return Math.round(calories(sumHR / this.sessionTime, this.sessionTime));
    }

    getTotalDistance() {
        return this.totalDistance.toFixed(2);
    }

    getAverageSpeed() {
        return this.averageSpeed.toFixed(1);
    }

    getMaxSpeed() {
        return Math.max.apply(Math, this.displaySpeeds);
    }

    getAveragePace() {
        return speedToPace(this.averageSpeed);
    }

    getMinimumPace() {
        return speedToPace(this.getMaxSpeed());
    }

    getTotalClimb() {
        return this.totalClimb.toFixed(1);
    }

    getAverageGradient() {
        var sumGradient = 0;
        for (var i = 0; i < this.count; i++) {
            sumGradient += this.timeGaps[i] * this.gradients[i];
        }
        return (sumGradient / this.sessionTime).toFixed(2);
    }
}