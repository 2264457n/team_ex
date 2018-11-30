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

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function rad2deg(rad) {
    return rad / (Math.PI / 180);
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

function sum(l) {
    return l.reduce((a, b) => a + b, 0);
}

function padTime(n) {
    if (n == 0) return "00";
    return n >= 10 ? n : "0" + n;
}

function toDisplayTime(second) {
    var h = Math.floor(second / 3600);
    var m = Math.floor((second % 3600) / 60);
    var s = second % 60;
    return padTime(h) + ":" + padTime(m) + ":" + padTime(s);
}

function speedToPace(speed) {
    var paceReal = 60 / speed;
    var decimal = paceReal * 1000 % 1000 / 1000;
    paceReal = Math.floor(paceReal);
    decimal = Math.round(decimal * 60);

    if (paceReal > 998) return "-";
    return paceReal + ":" + padTime(decimal);
}  

function gradient(distance, elevation) {
    if (distance == 0) {
        return 0;
    }
    return rad2deg(Math.tan(elevation / distance));
}

function calories(averageHeartRate, time) {
    return (-55.0969 + (0.6309 * averageHeartRate) + (0.1988 * 70) + (0.2017 * 27.5)) / 4.184 / 60 * time;
}
