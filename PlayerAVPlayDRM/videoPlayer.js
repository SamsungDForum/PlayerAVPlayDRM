/**
 * Player object constructor.
 *
 * @param   {Object} config - Playback and player configuration.
 * @returns {Object}
 */
function VideoPlayer(config) {
    var log = config.logger;

    /**
     * HTML av-player element
     */
    var player = config.player;

    /**
     * HTML controls div
     */
    var controls = config.controls;

    /**
     * Fullscreen flag
     * @type {Boolean}
     */
    var isFullscreen = false;

    /**
     * DRM type to handle
     * @type {String}
     */
    var chosenDrm = config.drms.NO_DRM;

    /**
     * HTML element to display stream properties.
     */
    var info = config.info;

    var defaultResolutionWidth = 1920;
    var resolutionWidth = config.resolutionWidth;

    var playerCoords = {
        x: Math.floor(10 * resolutionWidth / defaultResolutionWidth),
        y: Math.floor(300 * resolutionWidth / defaultResolutionWidth),
        width: Math.floor(854 * resolutionWidth / defaultResolutionWidth),
        height: Math.floor(480 * resolutionWidth / defaultResolutionWidth)
    };

    /**
     * 4k flag
     * @type {Boolean}
     */
    var isUhd = false;

    return {
        /**
         * Function to initialize the playback.
         * @param {String} url - content url, if there is no value then take url from config
         */
        play: function (url) {
            log('Starting playback');
            /* Create listener object. */
            var listener = {
                onbufferingstart: function () {
                    log("Buffering start.");
                },
                onbufferingprogress: function (percent) {
                    log("Buffering progress data : " + percent);
                },
                onbufferingcomplete: function () {
                    log("Buffering complete.");
                },
                oncurrentplaytime: function (currentTime) {
                    log("Current playtime: " + currentTime);
                },
                onevent: function (eventType, eventData) {
                    log("event type: " + eventType + ", data: " + eventData);
                },
                ondrmevent: function (drmEvent, drmData) {
                    log("DRM callback: " + drmEvent + ", data: " + drmData);
                    /* Playready Challenge alternative scenario start */
                    if (drmData.name === "Challenge") {
                        var drmParam = {
                            ResponseMessage: drmData.message
                        };
                        log('setDrm InstallLicense: ' + JSON.stringify(drmParam));
                        webapis.avplay.setDrm("PLAYREADY", "InstallLicense", JSON.stringify(drmParam));
                    }
                    /* Playready Challenge alternative scenario end */
                },
                onstreamcompleted: function () {
                    log("Stream Completed");
                    this.stop();
                }.bind(this),
                onerror: function (eventType) {
                    log("event type error : " + eventType);
                }
            };

            if (!url) {
                url = config.url;
            }
            log('videoPlayer open: ' + url);
            try {
                webapis.avplay.open(url);
                webapis.avplay.setDisplayRect(
                    playerCoords.x,
                    playerCoords.y,
                    playerCoords.width,
                    playerCoords.height
                );
                webapis.avplay.setListener(listener);
            } catch (e) {
                log(e);
            }

            //set bitrates according to the values in your stream manifest
            //			this.setBitrate(477000, 2056000, 2056000, 688000);

            //set 4k
            if (isUhd) {
                this.set4K();
            }

            /* Setting DRMs */
            switch (chosenDrm) {
                case config.drms.PLAYREADY:
                    this.setPlayready();
                    break;
                case config.drms.PLAYREADY_GET_CHALLENGE:
                    this.setPlayreadyChallenge();
                    break;
                case config.drms.WIDEVINE:
                    this.setWidevine();
                    break;
                default:
                    log('no DRM');
            }

            if (chosenDrm !== config.drms.PLAYREADY_GET_CHALLENGE) {
                webapis.avplay.prepare();
                webapis.avplay.play();
            }
        },
        /**
         * Function to start/pause playback.
         * @param {String} url - content url, if there is no value then take url from config
         */
        playPause: function (url) {
            if (!url) {
                url = chosenDrm.url;
            }

            if (webapis.avplay.getState() === 'PLAYING' || webapis.avplay.getState() === 'PAUSED') {
                this.pause();
            } else {
                this.play(url);
            }
        },
        /**
         * Function to stop current playback.
         */
        stop: function () {
            webapis.avplay.stop();

            //switch back from fullscreen to window if stream finished playing
            if (isFullscreen === true) {
                this.toggleFullscreen();
            }
            info.innerHTML = '';
        },
        /**
         * Function to pause/resume playback.
         * @param {String} url - content url, if there is no value then take url from config
         */
        pause: function (url) {
            if (!url) {
                url = chosenDrm.url;
            }
            if (webapis.avplay.getState() === 'PLAYING') {
                webapis.avplay.pause();
            } else if (webapis.avplay.getState() === 'NONE' || webapis.avplay.getState() === 'IDLE') {
                this.play(url);
            } else {
                webapis.avplay.play();
            }
        },
        /**
         * Jump forward 3 seconds (3000 ms).
         */
        ff: function () {
            webapis.avplay.jumpForward('3000');
        },
        /**
         * Rewind 3 seconds (3000 ms).
         */
        rew: function () {
            webapis.avplay.jumpBackward('3000');
        },
        /**
         * Set information about chosen DRM type.
         * @param {String} drm - String name of the DRM option to call correct option in play() function.
         */
        setChosenDrm: function (drm) {
            chosenDrm = drm;
        },
        /**
         * Set flag to play UHD content.
         * @param {Boolean} isEnabled - Flag to set UHD.
         */
        setUhd: function (isEnabled) {
            isUhd = isEnabled;
        },
        /**
         * Set to TV to play UHD content.
         */
        set4K: function () {
            webapis.avplay.setStreamingProperty("SET_MODE_4K", "true");
        },
        /**
         * Function to set specific bitrates used to play the stream.
         * In case of Smooth Streaming STARTBITRATE and SKIPBITRATE values 'LOWEST', 'HIGHEST', 'AVERAGE' can be set.
         * For other streaming engines there must be numeric values.
         *
         * @param {Number} from  - Lower value of bitrates range.
         * @param {Number} to    - Hieher value of the birrates range.
         * @param {Number} start - Bitrate which should be used for initial chunks.
         * @param {Number} skip  - Bitrate that will not be used.
         */
        setBitrate: function (from, to, start, skip) {
            var bitrates = '|BITRATES=' + from + '~' + to;

            if (start !== '' && start !== undefined) {
                bitrates += '|STARTBITRATE=' + start;
            }
            if (to !== '' && to !== undefined) {
                bitrates += '|SKIPBITRATE=' + skip;
            }

            webapis.avplay.setStreamingProperty("ADAPTIVE_INFO", bitrates);
        },
        /**
         * Function to change current VIDEO/AUDIO/TEXT track
         * @param {String} type  - Streaming type received with webapis.avplay.getTotalTrackInfo(), possible values
         *     are: VIDEO, AUDIO, TEXT.
         * @param {Number} index - Track id received with webapis.avplay.getTotalTrackInfo().
         */
        setTrack: function (type, index) {
            webapis.avplay.setSelectTrack(type, index);
        },
        /**
         * Function to set Playready license server and (optionally) custom data.
         * It needs special privilege in config.xml:
         * <tizen:privilege name="http://developer.samsung.com/privilege/drmplay"/>
         */
        setPlayready: function () {
            var drmParam = {
                DeleteLicenseAfterUse: true
            };
            if (chosenDrm.licenseServer !== '' && chosenDrm.licenseServer !== undefined) {
                drmParam.LicenseServer = chosenDrm.licenseServer;
            }
            if (chosenDrm.customData !== '' && chosenDrm.customData !== undefined) {
                drmParam.CustomData = chosenDrm.customData;
            }

            log('setDrm Playready param: ' + JSON.stringify(drmParam));
            try {
                webapis.avplay.setDrm("PLAYREADY", "SetProperties", JSON.stringify(drmParam));
            } catch (e) {
                log(e.name)
            }
        },
        /**
         * Function send challenge request to playready license server.
         * It needs special privilege in config.xml:
         * <tizen:privilege name="http://developer.samsung.com/privilege/drmplay"/>
         */
        setPlayreadyChallenge: function () {
            var drmParam = {
                DeleteLicenseAfterUse: true,
                GetChallenge: true
            };

            var PrepareSuccessCallback = function () {
                log('PrepareSuccessCallback');
                webapis.avplay.play();
            };

            log('setDrm Playready GetChallenge param: ' + JSON.stringify(drmParam));
            webapis.avplay.setDrm("PLAYREADY", "SetProperties", JSON.stringify(drmParam));
            webapis.avplay.prepareAsync(PrepareSuccessCallback);
        },
        /**
         * Function to set Widevine license server and (optionally) custom data.
         * It needs special privilege in config.xml:
         * <tizen:privilege name="http://developer.samsung.com/privilege/drminfo"/>
         */
        setWidevine: function () {
            var deviceId = webapis.drminfo.getEsn('WIDEVINE');
            var drmParam = "DEVICE_ID=" + deviceId + "|DEVICE_TYPE_ID=60|STREAM_ID=|IP_ADDR=|DRM_URL=" +
                           chosenDrm.licenseServer + "|PORTAL=OEM|I_SEEK=|CUR_TIME=|USER_DATA=";
            if (chosenDrm.customData !== '' && chosenDrm.customData !== undefined) {
                drmParam += chosenDrm.customData;
            }
            log('setStreamingProperty Widevine param: ' + drmParam);
            try {
                webapis.avplay.setStreamingProperty("WIDEVINE", drmParam);
            } catch (e) {
                log(e.name)
            }
        },
        /**
         * Show information about all available stream tracks on the screen.
         */
        getTracks: function () {
            var trackInfo = webapis.avplay.getTotalTrackInfo();
            var text = 'type of track info: ' + typeof trackInfo + '<br />';
            text += 'length: ' + trackInfo.length + '<br />';
            for (var i = 0; i < trackInfo.length; i++) {
                text += 'index: ' + trackInfo[i].index + ' ';
                text += 'type: ' + trackInfo[i].type + ' ';
                text += 'extra_info: ' + trackInfo[i].extra_info + '<br />';
            }
            info.innerHTML = text;
        },
        /**
         * Show streaming properties on the screen.
         */
        getProperties: function () {
            var text = 'AVAILABLE_BITRATE: ' + webapis.avplay.getStreamingProperty("AVAILABLE_BITRATE") + '<br />';
            text += 'CURRENT_BANDWIDTH: ' + webapis.avplay.getStreamingProperty("CURRENT_BANDWITH") + '<br />';
            text += 'DURATION: ' + webapis.avplay.getStreamingProperty("DURATION") + '<br />';
            text += 'BUFFER_SIZE: ' + webapis.avplay.getStreamingProperty("BUFFER_SIZE") + '<br />';
            text += 'START_FRAGMENT: ' + webapis.avplay.getStreamingProperty("START_FRAGMENT") + '<br />';
            text += 'COOKIE: ' + webapis.avplay.getStreamingProperty("COOKIE") + '<br />';
            text += 'CUSTOM_MESSAGE: ' + webapis.avplay.getStreamingProperty("CUSTOM_MESSAGE");
            info.innerHTML = text;
        },

        /**
         * Switch between full screen mode and normal windowed mode.
         */
        toggleFullscreen: function () {
            if (isFullscreen === false) {
                webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
                player.classList.add('fullscreenMode');
                controls.classList.add('fullscreenMode');
                isFullscreen = true;
            } else {
                try {
                    webapis.avplay.setDisplayRect(
                        playerCoords.x,
                        playerCoords.y,
                        playerCoords.width,
                        playerCoords.height
                    );
                } catch (e) {
                    log(e);
                }
                player.classList.remove('fullscreenMode');
                controls.classList.remove('fullscreenMode');
                isFullscreen = false;
            }
        }
    };
}
