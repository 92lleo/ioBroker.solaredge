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

	var siteid = adapter.config.siteid;
    var apikey = adapter.config.apikey;

    adapter.log.info("site id: " + siteid);
    adapter.log.info("api key: " + (apikey ? (apikey.substring(0, 4) + "...") : "not set"));

    // adapter only works with siteid and api key set
    if((!siteid) || (!apikey)) {
        adapter.log.error("siteid or api key not set")
    } else {
        var resource = "overview";

        // for some other resources the url itself might change
        var url = "https://monitoringapi.solaredge.com/site/"+siteid+"/"+resource+".json?api_key="+apikey;

        request({  url: url,
                   json: true },
	            function (error, response, content) {
	                if (!error && response.statusCode == 200) {
	                    if (content) {

                            var callback = function(val){}

	                        var overview = content.overview;
	                        adapter.log.info("Current power for "+siteid+": "+overview.currentPower.power+" W");	

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
		    });

			    
	// getting more info from PowerFlow			    
		var resource = "currentPowerFlow";
        var url = "https://monitoringapi.solaredge.com/site/"+siteid+"/"+resource+".json?api_key="+apikey;
        request({  url: url,
                   json: true },
                    function (error, response, content) {
                        if (!error && response.statusCode == 200) {
                            if (content) {

                           var callback = function(val){};
			   var powerflow = content.siteCurrentPowerFlow;			   
			   var gridIn = 0.0;
                           var gridOut = 0.0;
                           var gridAbs = 0.0;
                           var load = powerflow.LOAD.currentPower;
                           var pv = powerflow.PV.currentPower;
                           var storageIn = 0.0;
                           var storageOut = 0.0;
                           var storageAbs = 0.0;
				    // get storage charge level only if storage exists
				    if (powerflow.Storage) {                           var storageLevel = powerflow.STORAGE.chargeLevel; };
						   
			   var connections = powerflow.connections;
                           var con = Object.keys(connections[0]);
				    con.forEach(function(junction) {
				switch( junction["from"] ) {
                                case "STORAGE":
                                    // only LOAD is a valid target
                                    storageOut = powerflow.STORAGE.currentPower;
                                    storageAbs = -powerflow.STORAGE.currentPower;
                                    break;
                                case "GRID":
                                    // only LOAD is a valid target
                                    gridIn = powerflow.GRID.currentPower;
                                    gridAbs = powerflow.GRID.currentPower;
				break;
                                case "PV":
                                    switch ( junction["to"] ) {
                                        case "Load":
                                            // nothing to handle: LOADs currentPower already available through dedicated value
                                            break;
                                        case "Storage":
                                            storageIn = powerflow.STORAGE.currentPower;
                                            storageAbs = powerflow.STORAGE.currentPower;
                                            break;
                                        default:
                                            adapter.log.warn('Unknown target: '+junction["to"]+' for source: '+junction["from"]+'.');
                                    }
                                    break;
                                case "LOAD":
                                    switch ( junction["to"] ) {
                                        case "GRID":
                                            gridOut = powerflow.GRID.currentPower;
                                            gridAbs = -powerflow.GRID.currentPower;
                                            break;
                                        default:
                                            adapter.log.warn('Unknown target: '+junction["to"]+' for source: '+junction["from"]+'.');
                                    }
                                default:
                                    adapter.log.warn('Unknown source: '+junction["from"]+'.');
                            }
                        });

                        adapter.createState('', siteid, 'gridIn', { name: "gridIn", def: gridIn, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW" }, callback);
                        adapter.createState('', siteid, 'gridOut', { name: "gridOut", def: gridOut, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW" }, callback);
                        adapter.createState('', siteid, 'gridAbs', { name: "gridAbs", def: gridAbs, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW"  }, callback);
                        adapter.createState('', siteid, 'load', { name: "load", def: load, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW"  }, callback);
                        adapter.createState('', siteid, 'pv', { name: "pv", def: pv, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW"  }, callback);
			
				// create storage states only if storage exists
				    if (powerflow.Storage) { 
					  adapter.createState('', siteid, 'storageIn', { name: "storageIn", def: storageIn, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW"  }, callback);
		                          adapter.createState('', siteid, 'storageOut', { name: "storageOut", def: storageOut, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW"  }, callback);
                 	                  adapter.createState('', siteid, 'storageAbs', { name: "storageAbs", def: storageAbs, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current power in kW', unit: "kW"  }, callback);
                                          adapter.createState('', siteid, 'storageLevel', { name: "storageLevel", def: storageLevel, type: 'number', read: 'true', write: 'false', role: 'value', desc: 'current chargeLevel in %', unit: "%"  }, callback);
			                  };
                    } else {
                        adapter.log.warn('Response has no valid content. Check your data and try again. '+response.statusCode);
                    }
                } else {
                    adapter.log.warn(error);
                }
		    });



	                adapter.log.info("Done, stopping...");
	                adapter.stop();
	            }
    

    // (force) stop adapter after 15s
    setTimeout(function() {
        adapter.log.warn("Timeout, stopping...");
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
