//*** Coming Soon Start

var CountDownDate = new Date("June 16, 2023 12:00:00").getTime();
var countdownfunction = setInterval(function() {

    var TimeNow = new Date().getTime();
    var distance = CountDownDate - TimeNow;
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
    document.getElementById("day").innerHTML =  days.toString().length < 2 ? '0' + days : days ;
    document.getElementById("hour").innerHTML = hours.toString().length < 2 ? '0' + hours : hours ;
    document.getElementById("minute").innerHTML = minutes.toString().length < 2 ? '0' + minutes : minutes ;
    document.getElementById("second").innerHTML = seconds.toString().length < 2 ? '0' + seconds : seconds ;        

}, 1000);

//*** Coming Soon End