(function () {
    'use strict';

    /**
     * Displays logging information on the screen and in the console.
     * @param {string} msg - Message to log.
     */
    function log(msg) {
        var logsEl = document.getElementById('logs');

        if (msg) {
            // Update logs
            console.log('[PlayerAvplayDRM]: ', msg);
            logsEl.innerHTML += msg + '<br />';
        } else {
            // Clear logs
            logsEl.innerHTML = '';
        }

        logsEl.scrollTop = logsEl.scrollHeight;
    }

    var player;

    // flag to monitor UHD toggling
    var uhdStatus = false;

    // Configuration data for different DRM systems
    /**
     *
     * @property {String}            name             - name to be displayed in UI
     * @property {String}            url              - content url
     * @property {String}            licenseServer    - [Playready/Widevine] url to the license server
     * @property {String}            customData       - [Playready] extra data to add to the license request
     */
    var drms = {
        NO_DRM: {
            name: 'No DRM',
            url: 'http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest'
        },
        PLAYREADY: {
            name: 'Playready',
            url: 'http://playready.directtaps.net/smoothstreaming/SSWSS720H264PR/SuperSpeedway_720.ism/Manifest',
            licenseServer: 'http://playready.directtaps.net/pr/svc/rightsmanager.asmx?PlayRight=1&UseSimpleNonPersistentLicense=1',
            customData: ''
        },
        PLAYREADY_GET_CHALLENGE: {
            name: 'Playready GetChallenge',
            url: 'http://playready.directtaps.net/smoothstreaming/SSWSS720H264PR/SuperSpeedway_720.ism/Manifest',
            licenseServer: '',
            customData: ''
        },
        WIDEVINE: {
            name: 'Widevine',
            url: 'http://commondatastorage.googleapis.com/wvmedia/starz_main_720p_6br_tp.wvm',
            licenseServer: 'https://license.uat.widevine.com/getlicense/widevine',
            customData: ''
        }

        /*Smooth Streaming examples*/
        //			url:
        // 'http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest', url:
        // 'http://playready.directtaps.net/smoothstreaming/TTLSS720VC1/To_The_Limit_720.ism/Manifest',

        /*Smooth Streaming + Playready example*/
        //			url:
        // "http://playready.directtaps.net/smoothstreaming/SSWSS720H264PR/SuperSpeedway_720.ism/Manifest",
        // licenseServer:
        // 'http://playready.directtaps.net/pr/svc/rightsmanager.asmx?PlayRight=1&UseSimpleNonPersistentLicense=1'
    };

    /**
     * Register keys used in this application
     */
    function registerKeys() {
        var usedKeys = [
            'MediaPause',
            'MediaPlay',
            'MediaPlayPause',
            'MediaFastForward',
            'MediaRewind',
            'MediaStop',
            '0',
            '1',
            '2',
            '3'
        ];

        usedKeys.forEach(
            function (keyName) {
                tizen.tvinputdevice.registerKey(keyName);
            }
        );
    }


    /**
     * Handle input from remote
     */
    function registerKeyHandler() {
        document.addEventListener('keydown', function (e) {
            switch (e.keyCode) {
                case 13:    // Enter
                    player.toggleFullscreen();
                    break;
                case 38:    //UP arrow
                    switchDrm('up');
                    break;
                case 40:    //DOWN arrow
                    switchDrm('down');
                    break;
                case 10252: // MediaPlayPause
                case 415:   // MediaPlay
                case 19:    // MediaPause
                    player.playPause();
                    break;
                case 413:   // MediaStop
                    player.stop();
                    break;
                case 417:   // MediaFastForward
                    player.ff();
                    break;
                case 412:   // MediaRewind
                    player.rew();
                    break;
                case 48: //key 0
                    log();
                    break;
                case 49: //Key 1
                    setUhd();
                    break;
                case 50: //Key 2
                    player.getTracks();
                    break;
                case 51: //Key 3
                    player.getProperties();
                    break;
                case 10009: // Return
                    if (webapis.avplay.getState() !== 'IDLE' && webapis.avplay.getState() !== 'NONE') {
                        player.stop();
                    } else {
                        tizen.application.getCurrentApplication().hide();
                    }
                    break;
                default:
                    log("Unhandled key");
            }
        });
    }

    /**
     * Display application version
     */
    function displayVersion() {
        var el = document.createElement('div');
        el.id = 'version';
        el.innerHTML = 'ver: ' + tizen.application.getAppInfo().version;
        document.body.appendChild(el);
    }

    function registerMouseEvents() {
        document.querySelector('.video-controls .play').addEventListener(
            'click',
            function () {
                player.playPause();
                document.getElementById('streamParams').style.visibility = 'visible';
            }
        );
        document.querySelector('.video-controls .stop').addEventListener(
            'click',
            function () {
                player.stop();
                document.getElementById('streamParams').style.visibility = 'hidden';
            }
        );
        document.querySelector('.video-controls .pause').addEventListener(
            'click',
            player.playPause
        );
        document.querySelector('.video-controls .ff').addEventListener(
            'click',
            player.ff
        );
        document.querySelector('.video-controls .rew').addEventListener(
            'click',
            player.rew
        );
        document.querySelector('.video-controls .fullscreen').addEventListener(
            'click',
            player.toggleFullscreen
        );
    }

    /**
     * Create drm switching list
     */
    function createDrmList () {
        var drmParent = document.querySelector('.drms');
        var currentDrm;
        var li;
        for (var drmID in drms) {
            li = document.createElement('li');
            li.className = li.innerHTML = drms[drmID].name;
            li.dataset.drm = drmID;
            drmParent.appendChild(li);
        }
        currentDrm = drmParent.firstElementChild;
        currentDrm.classList.add('drmFocused');
    }

    /**
     * Enabling uhd manually in order to play uhd streams
     */
    function setUhd() {
        if (!uhdStatus) {
            if (webapis.productinfo.isUdPanelSupported()) {
                log('4k enabled');
                uhdStatus = true;
            } else {
                log('this device does not have a panel capable of displaying 4k content');
            }
        } else {
            log('4k disabled');
            uhdStatus = false;
        }
        player.setUhd(uhdStatus);
    }

    /**
     * Changes drm settings according to user's action
     * @param {String} direction - 'up' or 'down'
     */
    function switchDrm (direction) {
        var drmParent = document.querySelector('.drms');
        var currentDrm = drmParent.querySelector('.drmFocused');

        currentDrm.classList.remove('drmFocused');
        if (direction === 'up') {
            if (currentDrm === drmParent.firstElementChild) {
                currentDrm = drmParent.lastElementChild;
            } else {
                currentDrm = currentDrm.previousElementSibling;
            }
        } else if (direction === 'down') {
            if (currentDrm === drmParent.lastElementChild) {
                currentDrm = drmParent.firstElementChild;
            } else {
                currentDrm = currentDrm.nextElementSibling;
            }
        }
        currentDrm.classList.add('drmFocused');
        player.setChosenDrm(drms[currentDrm.dataset.drm]);
    }

    /**
     * Function initialising application.
     */
    window.onload = function () {

        if (window.tizen === undefined) {
            log('This application needs to be run on Tizen device');
            return;
        }

        /**
         * Player configuration object.
         *
         * @property {Object}           drms            - object containing drm configurations
         * @property {HTML Element}     player          - application/avplayer object
         * @property {HTML Div Element} controls        - player controls
         * @property {HTLM Div Element} info            - place to display stream info
         * @property {Function}         logger          - function to use for logging within player component
         *
         */
        var config = {
            drms:drms,
            player: document.getElementById('av-player'),
            controls: document.querySelector('.video-controls'),
            info: document.getElementById('info'),
            logger: log
        };

        displayVersion();
        createDrmList();
        registerKeys();
        registerKeyHandler();

        //Check the screen width so that the AVPlay can be scaled accordingly
        tizen.systeminfo.getPropertyValue(
            "DISPLAY",
            function (display) {
                log("The display width is " + display.resolutionWidth);
                config.resolutionWidth = display.resolutionWidth;

                // initialize player - loaded from videoPlayer.js
                player = new VideoPlayer(config);
                registerMouseEvents();
            },
            function(error) {
                log("An error occurred " + error.message);
            }
        );
    }
}());
