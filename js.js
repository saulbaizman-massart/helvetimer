// Much of this code, in concept and sometimes more than concept, was borrowed from this webpage:
// https://stackoverflow.com/questions/20618355/the-simplest-possible-javascript-countdown-timer

let original_duration = 0; // FIXME. needed for progress bar
let hours, minutes, seconds = 0;
let timer = false; // reference to interval handle
let interval_amount = 1000; // 1 second
let DEBUG = true;
let SOUND_DIR = 'mp3';
let timer_completed_sound = [SOUND_DIR, 'completed.mp3'].join('/');
// let timer_reset_sound = [SOUND_DIR,''].join('/') ;
let one_minute_warning_sound = [SOUND_DIR, 'one-minute-warning.mp3'].join('/');
let timer_doc = 'timer2';
let previous_hours, previous_minutes, previous_seconds = 0;

jQuery(document).ready(function () {

    // start / pause
    jQuery('body#setter input#start').on("click", function (event) {
        let start_button = jQuery('body#setter input#start');
        DEBUG && console.log('clicked', start_button.attr('class'));

        if (start_button.attr('class') == 'play_button') {
            hours = get_time('hours');
            minutes = get_time('minutes');
            seconds = get_time('seconds');
            if (original_duration == 0 ) {
                original_duration = parseInt(hours * 60 * 60) + parseInt(minutes * 60) + parseInt(seconds);
            }

            // don't start if the values are all zero
            if (!parseInt(hours) && !parseInt(minutes) && !parseInt(seconds)) {
                DEBUG && console.log('00:00:00');
                return;
            }

            // update start button icon
            start_button.removeClass('play_button');
            start_button.addClass('pause_button');

            // disable fields from editing
            toggle_field_editability(false);

            // set visual progress indicator to 0
            // unnecessary to explicitly set it to 0. it will immediately get reset when the timer is (re)started.
            // update_progress_bar ( 0 );

            if (!timer) {
                startTimer();

                // update firestore
                db.collection("timers").doc(timer_doc).set({
                    duration: parseInt(get_time('hours') * 60 * 60) + parseInt(get_time('minutes') * 60) + parseInt(get_time('seconds')),
                    original_duration: original_duration
                })
                    .then(() => {
                        DEBUG && console.log("Timer started.");
                    })
                    .catch((error) => {
                        console.error("Error writing document: ", error);
                    });
            }

        } else if (start_button.attr('class') == 'pause_button') {
            clearInterval(timer);
            timer = false;

            // update start button icon
            start_button.removeClass('pause_button');
            start_button.addClass('play_button');

            // this used to make the fields editable when the pause button was clicked.
            // to re-enable this, we would have to check, whenever the timer was paused, if the hour, minute, or second field was edited, the original_duration would have to be updated.
            // toggle_field_editability ( true ) ;

        }

    });

    // reset
    jQuery('body#setter input#reset').on("click", function (event) {

        DEBUG && console.log('* * * * * * * * * * * * * * * * * * * * * * * *');
        DEBUG && console.log('clicked reset');
        DEBUG && console.log('* * * * * * * * * * * * * * * * * * * * * * * *');

        resetTimer(false);

        // update visual progress indicator
        update_progress_bar ( 0 );

        // update firestore
        db.collection("timers").doc(timer_doc).set({
            duration: 0,
            original_duration: original_duration
        })
            .then(() => {
                DEBUG && console.log("Timer reset.");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
            });

        load_default_time ( ) ;

    });

    // set as default
    jQuery('body#setter input#set-as-default').on("click", function (event) {
        let default_hours = get_time('hours');
        let default_minutes = get_time('minutes');
        let default_seconds = get_time('seconds');

        // convert remaining time to seconds
        let default_time_in_seconds = parseInt(default_hours * 60 * 60) + parseInt(default_minutes * 60) + parseInt(default_seconds);

        // save to local storage
        localStorage.default_time_in_seconds = default_time_in_seconds ;

        // update user interface
        jQuery('#default_time').text( [format_digit(default_hours),format_digit(default_minutes),format_digit(default_seconds)].join(':')) ;

    });

    // when the user changes the value in the fields, update the time in the database, which will update the viewer.
    // this means that the user will see the timer as it is being set and before it is started.
    jQuery('body#setter input[type=number]').on("change", function (event) {
        console.log('value change in number input') ;
        // update database so changes are reflected in the viewer in near-real-time
        // update firestore
        db.collection("timers").doc(timer_doc).set({
            duration: parseInt(get_time('hours') * 60 * 60) + parseInt(get_time('minutes') * 60) + parseInt(get_time('seconds')),
            original_duration: original_duration
        })
            .then(() => {
                DEBUG && console.log("Updated time in database.");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
            });

    } ) ;

    // load default time, if applicable
    function load_default_time ( ) {
        if (jQuery('body#setter').length == 1) {
            DEBUG && console.log ('loading default time...') ;
            if ( localStorage.default_time_in_seconds > 0 ) {
                let default_time_in_seconds = localStorage.default_time_in_seconds ;

                let new_hours = convert_duration(default_time_in_seconds, 'hours');
                // convert from seconds to minutes, less the hours.
                // number of seconds divided by 60 provides the minutes, and we have to subtract the hours as minutes.
                // let new_minutes = Math.floor(seconds_remaining / 60) - (new_hours * 60);
                let new_minutes = convert_duration(default_time_in_seconds, 'minutes');
                let new_seconds = convert_duration(default_time_in_seconds, 'seconds');

                set_time('hours', new_hours);
                set_time('minutes', new_minutes);
                set_time('seconds', new_seconds);

                // update user interface
                jQuery('#default_time').text( [format_digit(new_hours),format_digit(new_minutes),format_digit(new_seconds)].join(':')) ;

            }

        }
    }

    load_default_time () ;

    // zero-pad the number input fields.
    /*
    jQuery('body#setter input[type=number]').on('change', function () {
        // DEBUG && console.log ('input changed') ;

        let input = jQuery(this);

        DEBUG && console.log('id:', input.attr('id'));
        DEBUG && console.log('input_value:', input.val());

        input.val(format_digit(input.val()));

    });
    */

    // keep length of input number fields to two characters
    // hope they're actually numbers!
    // https://stackoverflow.com/questions/18510845/maxlength-ignored-for-input-type-number-in-chrome
    jQuery('body#setter input[type=number]').on('keyup', function () {
        let number_field = jQuery(this);
        DEBUG && console.log('input changed on #' + number_field.attr('id'));

        let field_max_length = 2;
        let truncated_value;
        DEBUG && console.log('new value:', number_field.val());
        DEBUG && console.log('new value length:', number_field.val().length);
        if (number_field.val().length > field_max_length) {

            switch (number_field.attr('id')) {
                case 'hours':
                    DEBUG && console.log('previous hours:', previous_hours);
                    truncated_value = get_truncated_value(number_field, previous_hours, number_field.attr('max'))
                    break;

                case 'minutes':
                    DEBUG && console.log('previous hours:', previous_minutes);
                    truncated_value = get_truncated_value(number_field, previous_minutes, number_field.attr('max'))
                    break;

                case 'seconds':
                    DEBUG && console.log('previous hours:', previous_seconds);
                    truncated_value = get_truncated_value(number_field, previous_seconds, number_field.attr('max'))
                    break;

                default:
                    break;
            }
            // update number field value to new 2-digit item.
            number_field.val(truncated_value);
        }
        switch (number_field.attr('id')) {
            case 'hours':
                previous_hours = number_field.val();
                break;
            case 'minutes':
                previous_minutes = number_field.val();
                break;
            case 'seconds':
                previous_seconds = number_field.val();
                break;
        }
        DEBUG && console.log('previous_hours:', previous_hours);
        DEBUG && console.log('previous_minutes:', previous_minutes);
        DEBUG && console.log('previous_seconds:', previous_seconds);

    });

    /* Viewer / client. */
    if (jQuery('body#viewer').length == 1) {
        DEBUG && console.log('viewer has loaded');
        let viewer_hours = jQuery('#timer_viewer_hours');
        let viewer_minutes = jQuery('#timer_viewer_minutes');
        let viewer_seconds = jQuery('#timer_viewer_seconds');
        let previous_duration;

        // load timer duration from firebase, update the timer values
        // let timerRef = db.collection("timers").doc(timer_doc);
        let timerRef = db.collection("timers").doc(timer_doc)
            .onSnapshot({},
                (doc) => {
                    if (doc.exists) {
                        let duration = doc.data().duration;
                        let original_duration = doc.data().original_duration;
                        viewer_hours.html(format_digit(convert_duration(duration, 'hours')));
                        viewer_minutes.html(format_digit(convert_duration(duration, 'minutes')));
                        viewer_seconds.html(format_digit(convert_duration(duration, 'seconds')));
                        // one-minute warning.
                        if (duration == 60) {
                            new Audio(one_minute_warning_sound).play();
                        }

                        let progress_indicator_percent = (100 - ( ( duration * 100 ) / original_duration) ) + 'vw';
                        DEBUG && console.log('progress_indicator_percent:',progress_indicator_percent);
                        update_progress_bar ( progress_indicator_percent );
                        // timer completed.
                        // we keep track of the previous duration so that initial page-load or timer reset does not trigger the audio.
                        if (duration == 0 && previous_duration == 1) {
                            new Audio(timer_completed_sound).play();
                        }

                        previous_duration = duration;

                    } else {
                        // doc.data() will be undefined in this case
                        DEBUG && console.log(timer_doc, "does not exist.");
                    }

                });
    }

});

function startTimer() {

    timer = setInterval(function () {

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
        console.log ('original_duration:',original_duration);

        // update visual progress indicator
        let progress_indicator_percent = (100 - ( ( seconds_remaining * 100 ) / original_duration) ) + 'vw';
        DEBUG && console.log('progress_indicator_percent:',progress_indicator_percent);
        update_progress_bar ( progress_indicator_percent );

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
        db.collection("timers").doc(timer_doc).set({
            duration: seconds_remaining,
            original_duration: original_duration
        })
            .then(() => {
                DEBUG && console.log("Timer updated.");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
            });

        // one minute warning
        if (seconds_remaining == 60) {
            DEBUG && console.log('one minute warning');
            new Audio(one_minute_warning_sound).play();
        }

        DEBUG && console.log('--');

        if (seconds_remaining <= 0) {
            // Timer is done! Stop.
            resetTimer(true);
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

    original_duration = 0 ;

    // make fields editable again
    toggle_field_editability(true);

    // remove interval
    clearInterval(timer);

    timer = false;

    // update start button icon
    jQuery('body#setter input#start').removeClass('pause_button');
    jQuery('body#setter input#start').addClass('play_button');

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
function toggle_field_editability(is_editable) {

    jQuery('body#setter input[type=number]').prop("disabled", false)
    if (is_editable) {
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

// was a number added to the beginning, middle, or end?

// location of 21 in...
// 213 (number added to ended): chop off "2", chop off first character
// 421 (number added to beginning): chop off "1", chop off last character
// 271 (number added to "middle"): chop off "1", chop off last character

// if the last two characters are the same as the previous_ value, remove the first character

function get_truncated_value(field, previous_value, maximum_value) {
    let first_character_position = 0;
    let field_current_value = field.val();
    let new_truncated_value;
    let new_position = field_current_value.indexOf(previous_value);

    // character inserted at end, chop off beginning
    if (new_position == 0) {
        DEBUG && console.log('removing the first character');
        first_character_position = field_current_value.length - 2;
        // DEBUG && console.log('first_character_position:', first_character_position);
        new_truncated_value = field_current_value.slice(first_character_position);
    }
    // character inserted at beginning, chop off end
    else if (new_position > 0) {
        new_truncated_value = field_current_value.slice(first_character_position, first_character_position + 2)
    }
    // character likely inserted into the middle, chop off end
    else if (new_position == -1) {
        new_truncated_value = field_current_value.slice(first_character_position, first_character_position + 2)
    }

    // if the new value is greater than the allowed maximum, set it to the maximum value.
    /*
    if (new_truncated_value > maximum_value) {
        DEBUG && console.warn('warning:',new_truncated_value,'is greater than the allowed maximum,',maximum_value) ;
        new_truncated_value = maximum_value ;
    }
    */

    DEBUG && console.log('new_truncated_value', new_truncated_value)

    return new_truncated_value;
}

/*
Update the visual progress bar.
 */
function update_progress_bar ( percentage ) {
    jQuery('#progress_indicator').css('width',percentage);
    // We've chosen not to use jQuery because when the window isn't in the foreground, the UI doesn't update.
    // jQuery('#progress_indicator').animate({width: percentage}, 500,'linear') ;
}