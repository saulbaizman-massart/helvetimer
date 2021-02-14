let has_time_remaining = false; // is there time remaining?
let is_paused = false; // is the timer paused?
let timer_has_started = false ; // flag to track whether timer has started.
let original_duration = 0; // FIXME. needed for progress bar
let hours, minutes, seconds = 0;
let timer; // reference to interval handle
let interval_amount = 1000; // 1 second
let DEBUG = true;
let SOUND_DIR = 'mp3' ;
let timer_completed_sound = [SOUND_DIR,'completed.mp3'].join('/') ;
// let timer_reset_sound = [SOUND_DIR,''].join('/') ;
let one_minute_warning_sound = [SOUND_DIR,'one-minute-warning.mp3'].join('/') ;


jQuery(document).ready(function () {

    // start / pause / resume
    jQuery('body#setter input#start').on("click", function (event) {
        let start_button = jQuery('body#setter input#start');
        DEBUG && console.log('clicked', start_button.attr('class'));

        if (start_button.attr('class') == 'play_button') {
            hours = get_time('hours');
            minutes = get_time('minutes');
            seconds = get_time('seconds');
            original_duration = parseInt(hours * 60 * 60) + parseInt(minutes * 60) + parseInt(seconds);

            // don't start if the values are all zero
            if (!parseInt(hours) && !parseInt(minutes) && !parseInt(seconds)) {
                DEBUG && console.log('00:00:00');
                return;
            }

            // update start button icon
            start_button.removeClass('play_button');
            start_button.addClass('pause_button');

            is_paused = false;
            has_time_remaining = true;

            // disable fields from editing
            toggle_field_editability( false );

            if ( ! timer_has_started ) {
                timer_has_started = true ;
                startTimer();

            // update firestore
            db.collection("timers").doc("timer1").set({
                duration: parseInt(get_time('hours') * 60 * 60) + parseInt(get_time('minutes') * 60) + parseInt(get_time('seconds')),
                is_paused: "false"
            })
                .then(() => {
                    DEBUG && console.log("Timer started.");
                })
                .catch((error) => {
                    console.error("Error writing document: ", error);
                });
            }

        } else if (start_button.attr('class') == 'pause_button') {
            is_paused = true;

            // update start button icon
            start_button.removeClass('pause_button');
            start_button.addClass('play_button');

        }

    });

    // reset
    jQuery('body#setter input#reset').on("click", function (event) {

        DEBUG && console.log('* * * * * * * * * * * * * * * * * * * * * * * *');
        DEBUG && console.log('clicked reset');
        DEBUG && console.log('* * * * * * * * * * * * * * * * * * * * * * * *');

        resetTimer(false);

        // update firestore
        db.collection("timers").doc("timer1").set({
            duration: 0,
            is_paused: "true"
        })
            .then(() => {
                DEBUG && console.log("Timer reset.");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
            });


    });

    /* Viewer / client. */
    if (jQuery('body#viewer').length == 1) {
        DEBUG && console.log('viewer has loaded');
        let viewer_hours = jQuery('#timer_viewer_hours');
        let viewer_minutes = jQuery('#timer_viewer_minutes');
        let viewer_seconds = jQuery('#timer_viewer_seconds');
        let previous_duration ;

        // load timer duration from firebase, update the timer values
        // let timerRef = db.collection("timers").doc("timer1");
        let timerRef = db.collection("timers").doc("timer1")
            .onSnapshot({},
                (doc) => {
                    if (doc.exists) {
                        let duration = doc.data().duration;
                        viewer_hours.html(format_digit(convert_duration(duration, 'hours')));
                        viewer_minutes.html(format_digit(convert_duration(duration, 'minutes')));
                        viewer_seconds.html(format_digit(convert_duration(duration, 'seconds')));
                        // one-minute warning.
                        if ( duration == 60 ) {
                            new Audio(one_minute_warning_sound).play() ;
                        }
                        // timer completed.
                        // we keep track of the previous duration so that initial page-load or timer reset does not trigger the audio.
                        if ( duration == 0 && previous_duration == 1 ) {
                            new Audio(timer_completed_sound).play() ;
                        }

                        previous_duration = duration ;

                    } else {
                        // doc.data() will be undefined in this case
                        DEBUG && console.log("timer1 does not exist.");
                    }

                } );
    }

});

function startTimer( ) {

    timer = setInterval(function () {

        if (is_paused) {
            return;
        }

        if (has_time_remaining) {
            hours = get_time('hours');
            DEBUG && console.log('hours:', hours);
            minutes = get_time('minutes');
            DEBUG && console.log('minutes:', minutes);
            seconds = get_time('seconds');
            DEBUG && console.log('seconds:', seconds);

            // convert remaining time to seconds
            let seconds_remaining = parseInt(hours * 60 * 60) + parseInt(minutes * 60) + parseInt(seconds);

            // reduce seconds by 1.
            --seconds_remaining;
            DEBUG && console.log('seconds_remaining:', seconds_remaining);
            // console.log ('original_duration:',original_duration);

            // convert from seconds to hours.
            let new_hours = convert_duration(seconds_remaining, 'hours');
            // convert from seconds to minutes, less the hours.
            // number of seconds divided by 60 provides the minutes, and we have to subtract the hours as minutes.
            // let new_minutes = Math.floor(seconds_remaining / 60) - (new_hours * 60);
            let new_minutes = convert_duration(seconds_remaining, 'minutes');
            let new_seconds = convert_duration(seconds_remaining, 'seconds');
            DEBUG && console.log('new_hours:', new_hours);
            DEBUG && console.log('new_minutes:', new_minutes);
            DEBUG && console.log('new_seconds:', new_seconds);

            set_time('hours', new_hours);
            set_time('minutes', new_minutes);
            set_time('seconds', new_seconds);

            // update firestore
            db.collection("timers").doc("timer1").set({
                duration: seconds_remaining,
                is_paused: "false"
            })
                .then(() => {
                    DEBUG && console.log("Timer updated.");
                })
                .catch((error) => {
                    console.error("Error writing document: ", error);
                });

            // one minute warning
            if ( seconds_remaining == 60 ) {
                DEBUG && console.log ('one minute warning') ;
                new Audio(one_minute_warning_sound).play() ;
            }

            DEBUG && console.log('--');

            if (seconds_remaining <= 0) {
                // Timer is done! Stop.
                resetTimer(true);
            }
        }
    }, interval_amount);

}

/*
Get time.
 */
function get_time(increment) {

    return parseInt(jQuery('body#setter input#' + increment).val());

}

/*
Set time.
 */
function set_time(increment, value) {

    // For double-digit display, prepend a zero to single digits.
    let two_digit_value = format_digit(value);

    jQuery('body#setter input#' + increment).val(two_digit_value);

}

/*
Prepend zero, if needed, to single digits.
 */
function format_digit(value) {
    return parseInt(value) < 10 ? "0" + value : value;
}

/*
Set the timer back to its default settings.
 */
function resetTimer(has_completed) {

    // emit completed tone.
    if (has_completed) {
        DEBUG && console.log('Timer completed.');
        new Audio(timer_completed_sound).play();
    }

    timer_has_started = false ;
    
    // make fields editable again
    toggle_field_editability( true );

    // remove interval
    clearInterval(timer);

    // update start button icon
    jQuery('body#setter input#start').removeClass('pause_button');
    jQuery('body#setter input#start').addClass('play_button');

    // reset important flags
    has_time_remaining = false;
    is_paused = false;

    // set fields to default values
    set_time('hours', '0');
    set_time('minutes', '0');
    set_time('seconds', '0');

    // set variables to default values
    hours, minutes, seconds = 0;

}

/*
When timer is running, fields are not editable.
 */
function toggle_field_editability ( is_editable ) {

    if ( is_editable ) {
        jQuery('body#setter input[type=number]').prop("disabled", false)
    } else {
        jQuery('body#setter input[type=number]').prop("disabled", true)
    }

}

/* FireStore database. */
var firebaseConfig = {
    apiKey: "AIzaSyDO1Idu7tJqDMQabg3x0_pHqtQGYDFatt8",
    authDomain: "helvetimer-428eb.firebaseapp.com",
    projectId: "helvetimer-428eb",
    storageBucket: "helvetimer-428eb.appspot.com",
    messagingSenderId: "943356598783",
    appId: "1:943356598783:web:2e745121c7eb27fabb2fca"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let db = firebase.firestore();

function convert_duration(duration, increment) {

    switch (increment) {
        case 'hours':
            return Math.floor(duration / (60 * 60));
            break;
        case 'minutes':
            // number of seconds divided by 60 provides the minutes, and we have to subtract the hours as minutes.
            // For example, if the duration is 2 hours and 30 minutes,
            // we calculate the minutes (150 minutes),
            // then subtract the 2 hours (120 minutes)
            // to end up with 30 minutes,
            // except the increment is seconds, not minutes
            return Math.floor(duration / 60) - (convert_duration(duration, 'hours') * 60);
            break;
        case 'seconds':
            // modulo operator returns just the remainder, making easy math.
            return duration % 60;
            break;
        default:
            return false;
    }

}