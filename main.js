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
                callback();
            } catch (e) {
                callback();
            }
        },
    }));
}

function main() {

    adapter.log.info("site id: " + adapter.config.siteid);
    adapter.log.info("key: " + adapter.config.apikey);

    // adapter only works with siteid and api key set
    if((!adapter.config.siteid) || (!adapter.config.apikey)) {
        adapter.log.error("siteid or api key not set")
    } else {
        var siteid = adapter.config.siteid;
        var apikey = adapter.config.apikey;
        var resource = "overview";

        // for some other resources the url itself might change
        var url = "https://monitoringapi.solaredge.com/site/"+siteid+"/"+resource+".json?api_key="+apikey;
        adapter.log.info("request url: "+url);

        request({  url: url,
                   json: true },
	            function (error, response, content) {
	                if (!error && response.statusCode == 200) {
	                    if (content) {
	                        var overview = content.overview;

	                        var callback = function(val){
	                            //
	                        }

	                        // last update time
	                        adapter.createState('', siteid, 'lastUpdateTime', {
	                            name: "lastUpdateTime",
	                            def: overview.lastUpdateTime,
	                            type: 'string',
	                            read: 'true',
	                            write: 'false',
	                            role: 'value',
	                            desc: 'Last update from inverter'
	                        }, callback);

	                        adapter.createState('', siteid, 'currentPower', {
	                            name: "currentPower",
	                            def: overview.currentPower.power,
	                            type: 'number',
	                            read: 'true',
	                            write: 'false',
	                            role: 'value',
	                            desc: 'current power in W'
	                        }, callback);

	                        adapter.createState('', siteid, 'lifeTimeData', {
	                            name: "lifeTimeData",
	                            def: overview.lifeTimeData.energy,
	                            type: 'number',
	                            read: 'true',
	                            write: 'false',
	                            role: 'value',
	                            desc: 'Lifetime energy in Wh'
	                        }, callback);

	                        adapter.createState('', siteid, 'lastYearData', {
	                            name: "lastYearData",
	                            def: overview.lastYearData.energy,
	                            type: 'number',
	                            read: 'true',
	                            write: 'false',
	                            role: 'value',
	                            desc: 'last year energy in Wh'
	                        }, callback);

	                        adapter.createState('', siteid, 'lastMonthData', {
	                            name: "lastMonthData",
	                            def: overview.lastMonthData.energy,
	                            type: 'number',
	                            read: 'true',
	                            write: 'false',
	                            role: 'value',
	                            desc: 'last month energy in Wh'
	                        }, callback);

	                        adapter.createState('', siteid, 'lastDayData', {
	                            name: "lastDayData",
	                            def: overview.lastDayData.energy,
	                            type: 'number',
	                            read: 'true',
	                            write: 'false',
	                            role: 'value',
	                            desc: 'last day energy in Wh'
	                        }, callback);

	                    } else {
	                        adapter.log.warn('Response has no valid content. Check your data and try again. '+response.statusCode);
	                    }
	                } else {
	                    adapter.log.warn(error);
	                }

	                adapter.stop();
	            });
    }

    // (force) stop adapter after 15s
    setTimeout(function() {
        adapter.stop();
    }, 15000);
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
