'use strict';

/*
 * Solaredge Monitoring
 * github.com/92lleo/ioBroker.solaredge
 *
 * (c) 2019-2023 Leonhard Kuenzler (MIT)
 *
 * Created with @iobroker/create-adapter v1.18.0
 */

const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const adapterName = require('./package.json').name.split('.').pop();

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
        name: adapterName,
        ready: main, // Main method defined below for readability
    }));
}

async function checkStateCreationNeeded(stateName){
    let state;
    try {
        state = await adapter.getState(`solaredge.${adapter.instance}.${siteid}.${stateName}`);
    } catch (error) {
        // state does not exist, ignore
    }

    if (!state) {
        adapter.log.info(`state ${stateName} does not exist, will be created`);
        createStates = true;
    } else {
        adapter.log.debug(`state ${stateName} exists`);
        createStates |= false;
    }
}

async function checkStatesCreationNeeded(){
    await checkStateCreationNeeded('lastUpdateTime');
    await checkStateCreationNeeded('currentPower');
    await checkStateCreationNeeded('lifeTimeData');
    await checkStateCreationNeeded('lastYearData');
    await checkStateCreationNeeded('lastMonthData');
    await checkStateCreationNeeded('lastDayData');
}

async function main() {
    siteid = adapter.config.siteid;
    const apikey = adapter.config.apikey;

    adapter.log.debug(`site id: ${siteid}`);
    adapter.log.debug(`api key: ${apikey ? (`${apikey.substring(0, 4)}...`) : 'not set'}`);

    // adapter only works with siteid and api key set
    if (!siteid || !apikey) {
        adapter.log.error('siteid or api key not set')
    } else {
        // possible resources: overview, details, list
        const resource = 'overview';

        // for some other resources, the url itself might change
        const url = `https://monitoringapi.solaredge.com/site/${siteid}/${resource}.json?api_key=${apikey}`;

        await checkStatesCreationNeeded();

        try {
            const response = await axios(url);
            if (response.data) {
                const overview = response.data.overview;

                adapter.log.debug(`Current power for ${siteid}: ${overview.currentPower.power} W`);

                if (createStates) {
                    adapter.log.debug('creating states');
                    // create all states, only needed on first start or after state deletion

                    // last update time
                    await adapter.createStateAsync('', siteid, 'lastUpdateTime', {
                        name: 'lastUpdateTime',
                        type: 'string',
                        role: 'date',
                        read: true,
                        write: false,
                        desc: 'Last update from inverter'
                    });

                    await adapter.createStateAsync('', siteid, 'currentPower', {
                        name: 'currentPower',
                        type: 'number',
                        read: true,
                        write: false,
                        role: 'value.power',
                        desc: 'current power in W',
                        unit: 'W',
                    });

                    await adapter.createStateAsync('', siteid, 'lifeTimeData', {
                        name: 'lifeTimeData',
                        type: 'number',
                        read: true,
                        write: false,
                        role: 'value.energy.produced',
                        unit: 'Wh',
                        desc: 'Lifetime energy in Wh'
                    });

                    await adapter.createStateAsync('', siteid, 'lastYearData', {
                        name: 'lastYearData',
                        type: 'number',
                        read: true,
                        write: false,
                        unit: 'Wh',
                        role: 'value.energy.produced',
                        desc: 'last year energy in Wh'
                    });

                    await adapter.createStateAsync('', siteid, 'lastMonthData', {
                        name: 'lastMonthData',
                        type: 'number',
                        read: true,
                        write: false,
                        role: 'value.energy.produced',
                        unit: 'Wh',
                        desc: 'last month energy in Wh'
                    });

                    await adapter.createStateAsync('', siteid, 'lastDayData', {
                        name: 'lastDayData',
                        type: 'number',
                        read: true,
                        write: false,
                        unit: 'Wh',
                        role: 'value.energy.produced',
                        desc: 'last day energy in Wh'
                    });

                    createStates = false;

                }
                adapter.log.debug('updating states');

                await adapter.setStateChangedAsync(`${siteid}.lastUpdateTime`, overview.lastUpdateTime, true);
                await adapter.setStateChangedAsync(`${siteid}.currentPower`, overview.currentPower.power, true);
                await adapter.setStateChangedAsync(`${siteid}.lifeTimeData`, overview.lifeTimeData.energy, true);
                await adapter.setStateChangedAsync(`${siteid}.lastYearData`, overview.lastYearData.energy, true);
                await adapter.setStateChangedAsync(`${siteid}.lastMonthData`, overview.lastMonthData.energy, true);
                await adapter.setStateChangedAsync(`${siteid}.lastDayData`, overview.lastDayData.energy, true);
            } else {
                adapter.log.warn(`Response has no valid content. Check your data and try again. ${response.statusCode}`);
            }

            adapter.log.debug('Done, stopping...');
            adapter.stop();
        } catch (error) {
            adapter.log.error(`Cannot read data from solaredge cloud: ${error.response && error.response.data ? 
                JSON.stringify(error.response.data) : (error.response && error.response.status ? error.response.status : error)}`);
        }
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
