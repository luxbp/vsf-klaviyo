# Vue Storefront Klaviyo Extension

The Klaviyo integration module for [vue-storefront](https://github.com/DivanteLtd/vue-storefront).

## Installation

By hand (preferer):

```shell
git clone git@github.com:AbsoluteWebServices/vsf-klaviyo.git ./vue-storefront/src/modules/
```

Registration the Klaviyo module. Go to `./vue-storefront/src/modules/index.ts`

```js
...
import { Klaviyo } from './vsf-klaviyo';

export const registerModules: VueStorefrontModule[] = [
  ...
  Klaviyo
]
```

Add following settings to your config file. If you want to use different lists for multistore you need to add all list ids to **multistoreListIds**.

`subscribeAdvanced` - allow custom profile properties and custom list ID

```
// Example request data
{
  '$source': 'Source',
  first_name: 'Name',
  last_name: 'Last Name',
  email: 'Email',
  'Custom Property': 'Custom property 1',
  'Custom Property 2': 'Custom property 2',
  listId: '__XXXX__'
}
```

```json
{
    "klaviyo": {
        "endpoints": {
          "api": "https://a.klaviyo.com/api",
          "subscribe": "http://localhost:8080/api/ext/klaviyo/subscribe",
          "subscribeAdvanced": "http://localhost:8080/api/ext/klaviyo/subscribe-advanced",
          "backInStock": "https://a.klaviyo.com/onsite/components/back-in-stock/subscribe"
        },
        "accounts": {
          "__EN_STORE_CODE": {
              "public_key": "__YOUR_EN_PUBLIC_KEY__",
              "lists": {
                 "default": "__DEFAULT_EN_LIST_ID__",
                 "back_in_stock": "__CUSTOM_EN_LIST_ID__",
                 "_CUSTOM_LIST_KEY": "__CUSTOM_EN_LIST_ID__"
              }
          },
          "__ES_STORE_CODE": {
              "public_key": "__YOUR_ES_PUBLIC_KEY__",
              "lists": {
                 "default": "__DEFAULT_ES_LIST_ID__",
                 "back_in_stock": "__CUSTOM_ES_LIST_ID__",
                 "_CUSTOM_LIST_KEY": "__CUSTOM_ES_LIST_ID__"
              }
           }
        },
        "back_in_stock": {
            "__EN_STORE_CODE": "__CUSTOM_EN_LIST_ID__",
            "__ES_STORE_CODE": "__CUSTOM_EN_LIST_ID__"
        },
        "platform": "magento_two"
    }
}
```

Add Subscribe/Unsubscripe components as mixins

```
...
import { Subscribe } from 'src/modules/vsf-klaviyo/components/Subscribe'

export default {
  ...
  mixins: [Subscribe],
  ...
}
```

### Simple subscribe
```html
<form @submit.prevent="klaviyoSubscribe(onSuccess, onFailure)">
<!-- Your subscribe form -->
</form>
```
### Advanced 
```html
<form @submit.prevent="klaviyoSubscribeAdvanced(requestData, onSuccess, onFailure)">
<!-- Your subscribe form -->
</form>
```

## Klaviyo API extension

Install additional extension for `vue-storefront-api`:

```shell
cp -f ./vue-storefront/src/modules/vsf-klaviyo/API/klaviyo ./vue-storefront-api/src/api/extensions/
```

Add the config to your api config. If you want to use different lists for multistore you need to add all list ids to **multistoreListIds**.

```json
  "extensions": {
    "klaviyo": {
        "endpoints": {
          "api": "https://a.klaviyo.com/api",
        },
        "accounts": {
          "__EN_STORE_CODE": {
              "private_key": "__YOUR_EN_PRIVATE_KEY__",
              "lists": {
                 "default": "__DEFAULT_EN_LIST_ID__",
                 "_CUSTOM_LIST_KEY": "__CUSTOM_EN_LIST_ID__"
              }
          },
          "__ES_STORE_CODE": {
              "private_key": "__YOUR_ES_PRIVATE_KEY__",
              "lists": {
                 "default": "__DEFAULT_ES_LIST_ID__",
                 "_CUSTOM_LIST_KEY": "__CUSTOM_ES_LIST_ID__"
              }
           }
        },
    },
    ...
  },
  "registeredExtensions": [
    "klaviyo",
    ...
  ],
```
