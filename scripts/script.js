var map = null;
var route;

var slider;
var playButton;
var timeLabel, hrLabel, speedLabel, paceLabel, gradientLabel;
var uploadFile;
var heartRateIcon, speedIcon, paceIcon, gradientIcon;
var caloriesBurned, duration, distance, maxSpeed, averageSpeed, minimumPace,
    averagePace, totalClimb, averageGradient;
var modal1;
var loadingScreen;

var playing = false;

var hasMap = false;
var playingInterval;
var playbackSpeed = 1;
var fromInterval = false;

var chart = null;

function updateStatus() {
    map.setView(route.getCurrentLocation());
    hrLabel.innerHTML = route.getHeartRate();
    speedLabel.innerHTML = route.getDisplaySpeed();
    paceLabel.innerHTML = route.getDisplayPace();
    gradientLabel.innerHTML = route.getDisplayGradient();
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

function fillSummary() {
    caloriesBurned.innerHTML = route.getCaloriesBurned();
    duration.innerHTML = toDisplayTime(route.getSessionTime());
    distance.innerHTML = route.getTotalDistance();
    maxSpeed.innerHTML = route.getMaxSpeed();
    averageSpeed.innerHTML = route.getAverageSpeed();
    minimumPace.innerHTML = route.getMinimumPace();
    averagePace.innerHTML = route.getAveragePace();
    totalClimb.innerHTML = route.getTotalClimb();
    averageGradient.innerHTML = route.getAverageGradient();
}

function popChart(title, data) {
    var chart = new CanvasJS.Chart("chartContainer", {
        colorSet: "pureRed",
        title: {
            fontSize: 48,
            fontStyle: 'bold',
            fontFamily: 'Arial',
            text: title
        },
        data: data
    });
    chart.render();
}

$(document).ready(function () {

    CanvasJS.addColorSet("pureRed", ["#ff0000"]);

    timeLabel = document.getElementById("timeLabel");
    hrLabel = document.getElementById("heartRateLabel");
    speedLabel = document.getElementById("speedLabel");
    paceLabel = document.getElementById("paceLabel");
    gradientLabel = document.getElementById("gradientLabel");
    uploadFile = document.getElementById("uploadFile");

    caloriesBurned = document.getElementById("caloriesBurned");
    duration = document.getElementById("duration");
    distance = document.getElementById("distance");
    maxSpeed = document.getElementById("maxSpeed");
    averageSpeed = document.getElementById("averageSpeed");
    minimumPace = document.getElementById("minimumPace");
    averagePace = document.getElementById("averagePace");
    totalClimb = document.getElementById("totalClimb");
    averageGradient = document.getElementById("averageGradient");

    modal1 = document.getElementById("modal1");
    loadingScreen = document.getElementById("modal2");

    playButton = document.getElementById("playButton");

    slider = document.getElementById("progressSlider");
    slider.disabled = true;

    slider.onchange = function () {
        if (route.updateIndex(parseInt(this.value), map)) {
            updateStatus();
        }
        timeLabel.innerHTML = toDisplayTime(this.value);

        if (!fromInterval) {
            playButton.src = "images/play.png";
            clearInterval(playingInterval);
            playingInterval = null;
            playing = false;
        }
    };

    document.getElementById('mapid').onclick = function () {
        uploadFile.click();
    };

    document.getElementById("uploadFileButton").onclick = function () {
        uploadFile.click();
    };

    heartRateIcon = document.getElementById("heartRateIcon");
    heartRateIcon.onclick = function () {
        if (!hasMap) return;
        modal1.style.display = "flex";
        popChart("Heart Rate (BPM)", route.getHeartRateChartData());
        document.getElementById('mapid').style.display = "none";
    };

    speedIcon = document.getElementById("speedIcon");
    speedIcon.onclick = function () {
        if (!hasMap) return;
        modal1.style.display = "flex";
        popChart("Speed (km/h)", route.getSpeedChartData());
        document.getElementById('mapid').style.display = "none";
    };

    paceIcon = document.getElementById("paceIcon");
    paceIcon.onclick = function () {
        if (!hasMap) return;
        modal1.style.display = "flex";
        popChart("Speed (km/h)", route.getSpeedChartData());
        document.getElementById('mapid').style.display = "none";
    };

    gradientIcon = document.getElementById("gradientIcon")
    gradientIcon.onclick = function () {
        if (!hasMap) return;
        modal1.style.display = "flex";
        popChart("Elevation (meter)", route.getElevationChartData());
        document.getElementById('mapid').style.display = "none";
    };

    modal1.addEventListener('click', function () {
        modal1.style.display = "none";
        if (chart != null) {
            chart.destroy();
            chart = null;
        }
        document.getElementById('mapid').style.display = "flex";
    });

    document.getElementById("speedSelector").onchange = function () {
        playbackSpeed = Math.pow(2, this.selectedIndex);
        if (playing) {
            playButton.click();
            playButton.click();
        }
    };

    document.getElementById("titleMaxSpeed").onclick = speedIcon.onclick;
    document.getElementById("titleAverageSpeed").onclick = speedIcon.onclick;
    document.getElementById("titleFastestPace").onclick = speedIcon.onclick;
    document.getElementById("titleAveragePace").onclick = speedIcon.onclick;
    document.getElementById("titleTotalClimb").onclick = gradientIcon.onclick;
    document.getElementById("titleAverageGradient").onclick = gradientIcon.onclick;

    uploadFile.addEventListener('change', function () {
        var fr = new FileReader();
        fr.onload = function () {
            route = new Route(this.result);

            if (map != null) {
                map.remove();
            }

            map = L.map('mapid');

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            map.dragging.enable();

            route.initializeMapComponent(map);

            slider.value = 0;
            slider.max = route.getSessionTime();

            updateStatus();

            if (playing) {
                if (playingInterval != null) {
                    clearInterval(playingInterval);
                }
                playButton.src = "images/play.png";
                playingInterval = null;
                playing = false;
            }

            document.getElementById("uploadFileButton").style.visibility = "visible";
            document.getElementById('mapid').onclick = null;

            var element = document.getElementById("uploadImageContainer");
            if (element != null) element.parentNode.removeChild(element);

            hasMap = true;
            slider.disabled = false;

            fillSummary();

        }
        fr.readAsText(this.files[0]);
    });

    playButton.onclick = function () {
        if (!hasMap) return;
        playing = !playing;
        if (playing) {
            map.dragging.disable();
            playButton.src = "images/pause.png";
            playingInterval = setInterval(function () {
                slider.value = parseInt(slider.value) + 1;
                fromInterval = true;
                slider.onchange();
                fromInterval = false;
                if (parseInt(slider.value) >= parseInt(slider.max)) {
                    map.dragging.enable();
                    playButton.src = "images/play.png";
                    clearInterval(playingInterval);
                    playingInterval = null;
                    playing = false;
                    route.getFinishMarker().openPopup();
                }
            }, 1000 / playbackSpeed);
        } else {
            map.dragging.enable();
            playButton.src = "images/play.png";
            clearInterval(playingInterval);
            playingInterval = null;
            playing = false;
        }
    };

    document.getElementById("statusTab").click();
});