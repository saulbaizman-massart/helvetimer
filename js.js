let has_time_remaining = false; // is there time remaining?
let is_paused = false; // is the timer paused?
let original_duration = 0; // FIXME. needed for progress bar
let hours, minutes, seconds = 0;
let timer; // reference to interval handle
let interval_amount = 1000 ; // 1 second
let DEBUG = false ;


jQuery(document).ready(function () {

    // start / pause / resume
    jQuery('body#setter input#start').on("click", function (event) {
        let start_button = jQuery('body#setter input#start');
        DEBUG && console.log('clicked', start_button.val());

        if (start_button.val() == 'start') {
            hours = get_time('hours');
            minutes = get_time('minutes');
            seconds = get_time('seconds');
            original_duration = parseInt(hours * 60 * 60) + parseInt(minutes * 60) + parseInt(seconds);

            // don't start if the values are all zero
            if (! parseInt(hours) && ! parseInt(minutes) && ! parseInt(seconds)) {
                DEBUG && console.log('0 0 0');
                return;
            }

            start_button.val('pause');

            is_paused = false;
            has_time_remaining = true ;

            // disable fields from editing
            toggle_field_editability () ;
            startTimer();

        } else if (start_button.val() == 'pause') {
            is_paused = true;
            start_button.val('resume');
        } else if (start_button.val() == 'resume') {
            is_paused = false;
            start_button.val('pause');
        }

        // console.log('has_time_remaining:', has_time_remaining);

    });

    // reset
    jQuery('body#setter input#reset').on("click", function (event) {

        DEBUG && console.log('* * * * * * * * * * * * * * * * * * * * * * * *');
        DEBUG && console.log('clicked reset');
        DEBUG && console.log('* * * * * * * * * * * * * * * * * * * * * * * *');

        resetTimer(false);

    });

});

function startTimer(hours, minutes, seconds) {

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
            let new_hours = Math.floor(seconds_remaining / (60 * 60));
            // convert from seconds to minutes, less the hours.
            // number of seconds divided by 60 provides the minutes, and we have to subtract the hours as minutes.
            let new_minutes = Math.floor(seconds_remaining / 60) - (new_hours * 60);
            let new_seconds = seconds_remaining % 60;
            DEBUG && console.log('new_hours:', new_hours);
            DEBUG && console.log('new_minutes:', new_minutes);
            DEBUG && console.log('new_seconds:', new_seconds);

            set_time('hours', new_hours);
            set_time('minutes', new_minutes);
            set_time('seconds', new_seconds);

            DEBUG && console.log('--');

            if (seconds_remaining <= 0) {
                // Timer is done! Stop.
                DEBUG && console.log('BEEP'); // FIXME: do more
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

    // For double-digit display, prepend a zero.
    let two_digit_value = parseInt(value) < 10 ? "0" + value : value;

    jQuery('body#setter input#' + increment).val(two_digit_value);

}

/*
Set the timer back to its default settings.
 */
function resetTimer(has_completed) {

    if (has_completed) {
        // anything here?
        DEBUG && console.log('completed');
        has_completed = false ;
    }

    // make fields editable again
    toggle_field_editability () ;

    // remove interval
    clearInterval(timer);

    // update start button label to default
    jQuery('body#setter input#start').val('start');

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
function toggle_field_editability () {

    if (! jQuery('body#setter input#seconds').prop( "disabled") ) {
        jQuery('body#setter input[type=number]').prop( "disabled", true)
    }
    else {
        jQuery('body#setter input[type=number]').prop( "disabled", false)
    }

}