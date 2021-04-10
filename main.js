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
const util = require('util');
const request = require('request');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;
let createStates;
let siteid;
let apikey;

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
            try {
                adapter.log.info("cleaned everything up...");
            } catch (e) {
                adapter.log.error(e);
            } finally {
                callback();
            }
        },
    }));
}

function checkStateCreationNeeded(stateName) {
    adapter.instance
    adapter.getState('solaredge.' + adapter.instance + '.' + siteid + '.' + stateName, function (err, state) {
        if (!state) {
            adapter.log.info("state " + stateName + " does not exist, will be created");
            createStates = true;
        } else {
            adapter.log.debug("state " + stateName + " exists");
            createStates |= false;
        }
    });
}

function checkStatesCreationNeeded() {
    checkStateCreationNeeded('lastUpdateTime');
    checkStateCreationNeeded('currentPower');
    checkStateCreationNeeded('lifeTimeData');
    checkStateCreationNeeded('lastYearData');
    checkStateCreationNeeded('lastMonthData');
    checkStateCreationNeeded('lastDayData');
}

function getUrlFromResource(resource) {
    return "https://monitoringapi.solaredge.com/site/" + siteid + "/" + resource + ".json?api_key=" + apikey;
}

async function getOverviewData() {
    var resource = "overview";

    // for some other resources the url itself might change
    var url = getUrlFromResource(resource);

    checkStatesCreationNeeded();

    const requestPromise = util.promisify(request);
    adapter.log.info("before request");
    const response = await requestPromise(url, true);
    adapter.log.info("after request");

    const error = response.error;
    const content = JSON.parse(response.body);

    if (!error && response.statusCode == 200) {
        if (content) {

            var callback = function (val) {}

            var overview = content.overview;

            adapter.log.info("Current power for " + siteid + ": " + overview.currentPower.power + " W");

            if (createStates) {
                adapter.log.debug("creating states");
                // create all states, only needed on first start or after state deletion

                // last update time
                await adapter.createState('', siteid, 'lastUpdateTime', {
                    name: "lastUpdateTime",
                    def: overview.lastUpdateTime,
                    type: 'string',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'Last update from inverter'
                }, callback);

                await adapter.createState('', siteid, 'currentPower', {
                    name: "currentPower",
                    def: overview.currentPower.power,
                    type: 'number',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'current power in W'
                }, callback);

                await adapter.createState('', siteid, 'lifeTimeData', {
                    name: "lifeTimeData",
                    def: overview.lifeTimeData.energy,
                    type: 'number',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'Lifetime energy in Wh'
                }, callback);

                await adapter.createState('', siteid, 'lastYearData', {
                    name: "lastYearData",
                    def: overview.lastYearData.energy,
                    type: 'number',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'last year energy in Wh'
                }, callback);

                await adapter.createState('', siteid, 'lastMonthData', {
                    name: "lastMonthData",
                    def: overview.lastMonthData.energy,
                    type: 'number',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'last month energy in Wh'
                }, callback);

                await adapter.createState('', siteid, 'lastDayData', {
                    name: "lastDayData",
                    def: overview.lastDayData.energy,
                    type: 'number',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'last day energy in Wh'
                }, callback);

                createStates = false;

            } else {
                // just update
                adapter.log.debug("updating states");

                await adapter.setStateChanged(siteid + '.lastUpdateTime', overview.lastUpdateTime, true);
                await adapter.setStateChanged(siteid + '.currentPower', overview.currentPower.power, true);
                await adapter.setStateChanged(siteid + '.lifeTimeData', overview.lifeTimeData.energy, true);
                await adapter.setStateChanged(siteid + '.lastYearData', overview.lastYearData.energy, true);
                await adapter.setStateChanged(siteid + '.lastMonthData', overview.lastMonthData.energy, true);
                await adapter.setStateChanged(siteid + '.lastDayData', overview.lastDayData.energy, true);
            }
        } else {
            adapter.log.warn('Response has no valid content. Check your data and try again. ' + response.statusCode);
        }
    } else {
        adapter.log.warn(error);
    }
}


async function main() {
    siteid = adapter.config.siteid;
    apikey = adapter.config.apikey;

    adapter.log.info("site id: " + siteid);
    adapter.log.info("api key: " + (apikey ? (apikey.substring(0, 4) + "...") : "not set"));

    // adapter only works with siteid and api key set
    if ((!siteid) || (!apikey)) {
        adapter.log.error("siteid or api key not set")
    } else {
        adapter.log.info("before get");
        await getOverviewData();
        adapter.log.info("after get");
    }

    adapter.log.info("Done, stopping...");
    adapter.stop();
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
