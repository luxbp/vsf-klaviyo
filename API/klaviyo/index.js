import {apiStatus} from '../../../lib/util'
import {Router} from 'express'

module.exports = ({config, db}) => {
    let app = Router();
    let request = require('request')

    const getAccountConfig = (storeCode = null) => {
        let cfg = config.extensions.klaviyo.accounts;

        if (storeCode) {
            return cfg[storeCode];
        }

        // return first result
        return cfg[Object.keys(cfg)[0]];
    };

    const getListId = (listKey, storeCode = null, cfg = null) => {
        listKey = listKey || 'default';
        if (cfg == null) {
            cfg = getAccountConfig(storeCode);
        }

        return cfg.lists[listKey] || cfg.lists.default;
    };

    /**
     * GET - Subscription Status
     */
    app.get('/subscribe', (req, res) => {
        let data = req.query;

        // Define Object
        let configuration = {
            endpoint: config.extensions.klaviyo.endpoints.api,
            account: null,
            listId: null
        };

        // Set Account Config
        configuration.account = getAccountConfig(data.storeCode);

        // Set List ID
        configuration.listId = getListId(data.list, data.storeCode, configuration.account);

        // Format Payload
        if (data.email && !Array.isArray(data.emails)) {
            data.emails = [data.email];
        }

        for (let email in data.emails) {
            if (!data.emails[email]) {
                apiStatus(res, 'Email must be provided.', 422);
                return;
            }
        }

        request({
            url: configuration.endpoint + '/v2/list/' + configuration.listId + '/subscribe',
            method: 'GET',
            headers: {
                'api-key': configuration.account.private_key
            },
            json: true,
            body: {
                emails: data.emails
            }
        }, (error, response, body) => {
            if (error) {
                apiStatus(res, error, 500)
            } else {
                apiStatus(res, body, 200)
            }
        })
    });

    /**
     * POST - Subscribe to List
     */
    app.post('/subscribe', (req, res) => {
        let data = req.body;
        // Define Object
        let configuration = {
            endpoint: config.extensions.klaviyo.endpoints.api,
            account: null,
            listId: null
        };

        // Set Account Config
        configuration.account = getAccountConfig(data.storeCode);

        // Set List ID
        configuration.listId = getListId(data.list, data.storeCode, configuration.account);

        if (!Array.isArray(data.profiles)) {
            data.profiles = [{email: data.email}];
        }

        for (let profile in data.profiles) {
            if (!data.profiles[profile].email) {
                apiStatus(res, 'Email must be provided.', 422);
                return;
            }
        }

        request({
            url: configuration.endpoint + '/v2/list/' + configuration.listId + '/subscribe',
            method: 'POST',
            headers: {
                'api-key': configuration.account.private_key
            },
            json: true,
            body: {
                profiles: data.profiles
            }
        }, (error, response, body) => {
            if (error) {
                apiStatus(res, error, 500)
            } else {
                apiStatus(res, body, 200)
            }
        })
    });

    /**
     * POST - Advanced Subscribe to List
     */
    app.post('/subscribe-advanced', (req, res) => {
        let data = req.body;
        // Define Object
        let configuration = {
            endpoint: config.extensions.klaviyo.endpoints.api,
            account: null,
            listId: null
        };

        // Set Account Config
        configuration.account = getAccountConfig(data.storeCode);

        // Set List ID
        configuration.listId = getListId(data.list, data.storeCode, configuration.account);

        if (!Array.isArray(data.profiles)) {
            data.profiles = data.phoneNumber ? [{
                email: data.email,
                phone_number: data.phoneNumber,
                sms_consent: true
            }] : [{ email: data.email }];
        }

        for (let profile in data.profiles) {
            if (!data.profiles[profile].email) {
                apiStatus(res, 'Email must be provided.', 422);
                return;
            }
        }

        request({
            url: configuration.endpoint + '/v2/list/' + configuration.listId + '/subscribe',
            method: 'POST',
            headers: {
                'api-key': configuration.account.private_key
            },
            json: true,
            body: {
                profiles: data.profiles
            }
        }, (error, response, body) => {
            if (error) {
                apiStatus(res, error, 500)
            } else {
                apiStatus(res, body, 200)
            }
        })
    });

    /**
     * DELETE - Unsubscribe from list
     */
    app.delete('/subscribe', (req, res) => {
        let data = req.body;
        // Define Object
        let configuration = {
            endpoint: config.extensions.klaviyo.endpoints.api,
            account: null,
            listId: null
        };

        // Set Account Config
        configuration.account = getAccountConfig(data.storeCode);

        // Set List ID
        configuration.listId = getListId(data.list, data.storeCode, configuration.account);


        // Format Payload
        if (data.email && !Array.isArray(data.emails)) {
            data.emails = [data.email];
        }

        for (let email in data.emails) {
            if (!data.emails[email]) {
                apiStatus(res, 'Email must be provided.', 422);
                return;
            }
        }

        request({
            url: configuration.account.endpoint + '/v2/list/' + configuration.listId + '/subscribe',
            method: 'DELETE',
            headers: {
                'api-key': configuration.account.private_key
            },
            json: true,
            body: {
                emails: data.emails
            }
        }, (error, response, body) => {
            if (error) {
                apiStatus(res, error, 500)
            } else {
                apiStatus(res, body, 200)
            }
        })
    });

    return app;
};
