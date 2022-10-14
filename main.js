"use strict";

/*
 * Solaredge Monitoring
 * github.com/92lleo/ioBroker.solaredge
 *
 * (c) 2019 Leonhard Kuenzler (MIT)
 *
 * Created with @iobroker/create-adapter v1.18.0
 */

const utils = require("@iobroker/adapter-core");
const request = require('request');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;
let createStates;
let siteid;

/**
 * Starts the adapter instance
 * @param {Partial<ioBroker.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return adapter = utils.adapter(Object.assign({}, options, {
        name: "solaredge",

        // The ready callback is called when databases are connected and adapter received configuration.
        // start here!
        ready: main, // Main method defined below for readability

        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: (callback) => {
            callback();
        },
    }));
}

function checkStateCreationNeeded(stateName){
    adapter.instance
    adapter.getState('solaredge.' + adapter.instance + '.' + siteid + '.' + stateName, function (err, state) {
        if (!state) {
            adapter.log.info("state "+stateName+" does not exist, will be created");
            createStates = true;
        } else {
            adapter.log.debug("state "+stateName+" exists");
            createStates |= false;
        }
    });
}

function checkStatesCreationNeeded(){
    checkStateCreationNeeded('lastUpdateTime');
    checkStateCreationNeeded('currentPower');
    checkStateCreationNeeded('lifeTimeData');
    checkStateCreationNeeded('lastYearData');
    checkStateCreationNeeded('lastMonthData');
    checkStateCreationNeeded('lastDayData');
}

function main() {

    siteid = adapter.config.siteid;
    var apikey = adapter.config.apikey;

    adapter.log.info("site id: " + siteid);
    adapter.log.info("api key: " + (apikey ? (apikey.substring(0, 4) + "...") : "not set"));

    // adapter only works with siteid and api key set
    if ((!siteid) || (!apikey)) {
        adapter.log.error("siteid or api key not set")
    } else {
        var resource = "overview";

        // for some other resources the url itself might change
        var url = "https://monitoringapi.solaredge.com/site/" + siteid + "/" + resource + ".json?api_key=" + apikey;

        checkStatesCreationNeeded();

        request({
                url: url,
                json: true
            },
            async function (error, response, content) {
                if (!error && response.statusCode === 200) {
                    if (content) {

                        var overview = content.overview;

                        adapter.log.info("Current power for " + siteid + ": " + overview.currentPower.power + " W");

                        if (createStates) {
                            adapter.log.debug("creating states");
                            // create all states, only needed on first start or after state deletion

                            // last update time
                            await adapter.createStateAsync('', siteid, 'lastUpdateTime', {
                                name: "lastUpdateTime",
                                type: 'string',
                                read: true,
                                write: false,
                                role: 'value',
                                desc: 'Last update from inverter'
                            });

                            await adapter.createStateAsync('', siteid, 'currentPower', {
                                name: "currentPower",
                                type: 'number',
                                read: true,
                                write: false,
                                role: 'value',
                                desc: 'current power in W'
                            });

                            await adapter.createStateAsync('', siteid, 'lifeTimeData', {
                                name: "lifeTimeData",
                                type: 'number',
                                read: true,
                                write: false,
                                role: 'value',
                                desc: 'Lifetime energy in Wh'
                            });

                            await adapter.createStateAsync('', siteid, 'lastYearData', {
                                name: "lastYearData",
                                type: 'number',
                                read: true,
                                write: false,
                                role: 'value',
                                desc: 'last year energy in Wh'
                            });

                            await adapter.createStateAsync('', siteid, 'lastMonthData', {
                                name: "lastMonthData",
                                type: 'number',
                                read: true,
                                write: false,
                                role: 'value',
                                desc: 'last month energy in Wh'
                            });

                            await adapter.createStateAsync('', siteid, 'lastDayData', {
                                name: "lastDayData",
                                type: 'number',
                                read: true,
                                write: false,
                                role: 'value',
                                desc: 'last day energy in Wh'
                            });

                            createStates = false;

                        }
                        adapter.log.debug("updating states");

                        await adapter.setStateChangedAsync(siteid + '.lastUpdateTime', overview.lastUpdateTime, true);
                        await adapter.setStateChangedAsync(siteid + '.currentPower', overview.currentPower.power, true);
                        await adapter.setStateChangedAsync(siteid + '.lifeTimeData', overview.lifeTimeData.energy, true);
                        await adapter.setStateChangedAsync(siteid + '.lastYearData', overview.lastYearData.energy, true);
                        await adapter.setStateChangedAsync(siteid + '.lastMonthData', overview.lastMonthData.energy, true);
                        await adapter.setStateChangedAsync(siteid + '.lastDayData', overview.lastDayData.energy, true);
                    } else {
                        adapter.log.warn('Response has no valid content. Check your data and try again. ' + response.statusCode);
                    }
                } else {
                    adapter.log.warn(error);
                }

                adapter.log.info("Done, stopping...");
                adapter.stop();
            });
    }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
