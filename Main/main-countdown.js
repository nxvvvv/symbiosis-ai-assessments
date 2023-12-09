//const leftPad = require('left-pad');
// let count = (1 * 60 * 60) + 7;
let count = 0;

let timer;
let HasCounterStarted = false;

module.exports = function countdown(DurationInMinutes, tick) {
    count = DurationInMinutes * 60;
    if(HasCounterStarted == true){
        clearInterval(timer);
    }
    HasCounterStarted = true;
    timer = setInterval(function () {
        if (count !== 0) {
            //let timeRemaining = formatTimeRemaining(count--);
            //tick(timeRemaining);
            tick(count--);
        }
        else if (count === 0) {
            clearInterval(timer);
        }
    }, 1000);
}

// function formatTimeRemaining(count){
//     let HoursRemaining = count / (60 * 60);
//     let MinutesRemaining = count / 60;
//     let SecondsRemaining = 0;
//     HoursRemaining = Math.floor(HoursRemaining);
//     MinutesRemaining = Math.floor(MinutesRemaining);
//     if(HoursRemaining >= 1){
//       //If there is atleast an hour, calculate the remaining minutes
//       let hrsInMinutes = HoursRemaining * 60;
//       let totalMinutes = Math.floor(count / 60);
//        MinutesRemaining = totalMinutes - hrsInMinutes;

//       let hrsInSeconds = hrsInMinutes * 60;
//       let minsInSeconds = MinutesRemaining * 60;
//        SecondsRemaining = count - (hrsInSeconds + minsInSeconds);
//     }
//     else if(MinutesRemaining >= 1){
//       SecondsRemaining = count - (MinutesRemaining * 60);
//     }
//     else{
//       SecondsRemaining = count;
//     }
//     return leftPad(HoursRemaining, 2, '0') + ":" + leftPad(MinutesRemaining, 2, '0') + ":" + leftPad(SecondsRemaining, 2, '0');
// }