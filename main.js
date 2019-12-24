"use strict";

/*
 * Created with @iobroker/create-adapter v1.18.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
// const fs = require("fs");
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

        // is called if a subscribed object changes
        objectChange: (id, obj) => {
            if (obj) {
                // The object was changed
                adapter.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
            } else {
                // The object was deleted
                adapter.log.info(`object ${id} deleted`);
            }
        },

        // is called if a subscribed state changes
        stateChange: (id, state) => {
            if (state) {
                // The state was changed
                adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            } else {
                // The state was deleted
                adapter.log.info(`state ${id} deleted`);
            }
        },

        // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
        // requires "common.message" property to be set to true in io-package.json
        // message: (obj) => {
        //  if (typeof obj === "object" && obj.message) {
        //      if (obj.command === "send") {
        //          // e.g. send email or pushover or whatever
        //          adapter.log.info("send command");

        //          // Send response in callback if required
        //          if (obj.callback) adapter.sendTo(obj.from, obj.command, "Message received", obj.callback);
        //      }
        //  }
        // },
    }));
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info("site id" + adapter.config.siteid);
    adapter.log.info("key: " + adapter.config.apikey);


    if(!adapter.config.siteid || !adapter.config.apikey) {
        adapter.log.error("siteid or api key not set")
    }

    else {
            adapter.log.debug('remote request');

            var siteid = adapter.config.siteid;
            var apikey = adapter.config.apikey;
            var resouce = "overview";

            var url = "https://monitoringapi.solaredge.com/site/"+siteid+"/"+resouce+".json?api_key="+apikey;
            adapter.log.info("request url: ".url);

            request(
                {
                    url: url, // "https://gw02.ext.ffmuc.net/nodelist.json"
                    json: true
                },
                function (error, response, content) {
                    adapter.log.debug('remote request done');

                    if (!error && response.statusCode == 200) {

                        if (content) {
                            var overview = content.overview;

                            var callback = function(val){
                                //
                            }

                            adapter.createState('', "last update time", 'lastUpdateTime', {
                                name: "lastUpdateTime",
                                def: overview.lastUpdateTime,
                                type: 'string',
                                read: 'true',
                                write: 'false',
                                role: 'value',
                                desc: 'Last update from inverter'
                            }, callback);

                            adapter.createState('', "current power", 'currentPower', {
                                name: "currentPower",
                                def: overview.currentPower.power,
                                type: 'number',
                                read: 'true',
                                write: 'false',
                                role: 'value',
                                desc: 'current power in W'
                            }, callback);

                        } else {
                            adapter.log.warn('Response has no valid content. Check your data and try again.');
                        }
                    } else {
                        adapter.log.warn(error);
                    }
                }
            );
    }



    // in this template all states changes inside the adapters namespace are subscribed
    //adapter.subscribeStates("*");

    /*
        setState examples
        you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
    */
    // the variable testVariable is set to true as command (ack=false)
    adapter.setState("testVariable", true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    adapter.setState("testVariable", { val: true, ack: true });

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    adapter.setState("testVariable", { val: true, ack: true, expire: 30 });

    setTimeout(function() {
        adapter.stop();
    }, 15000);
    //setTimeout(this.stop.bind(this), 10000);
}


// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
