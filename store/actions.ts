import KlaviyoState from '../types/KlaviyoState'
import { ActionTree } from 'vuex'
import * as types from './mutation-types'
import config from 'config'
import fetch from 'isomorphic-fetch'
import rootStore from '@vue-storefront/core/store'
import * as mappers from '../helpers/mappers'
import { cacheStorage } from '../'
import { processURLAddress, onlineHelper } from '@vue-storefront/core/helpers'
import { Base64 } from '../helpers/webtoolkit.base64.js'
import { currentStoreView } from '@vue-storefront/core/lib/multistore'

const encode = (json) => {
  return Base64.encode(JSON.stringify(json)) // ERROR: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range.
}

// it's a good practice for all actions to return Promises with effect of their execution
export const actions: ActionTree<KlaviyoState, any> = {
  maybeIdentify ({ state, dispatch }, { user = null, personalDetails = null, useCache = true }): Promise<Response | object> {
    if (state.customer === null) {
      return dispatch('identify', { user, personalDetails, useCache })
    } else {
      return new Promise((resolve) => resolve(state.customer))
    }
  },

  identify ({ commit, dispatch }, { user = null, personalDetails = null, useCache = true, additionalData = {} }): Promise<Response> {
    let customer

    if (user) {
      customer = mappers.mapCustomer(user)
    } else if (personalDetails) {
      customer = mappers.mapPersonalDetails(personalDetails)
    } else {
      throw new Error('User details are required')
    }

    let request = {
      token: config.klaviyo.public_key,
      properties: Object.assign(customer, additionalData)
    }
    let url = processURLAddress(config.klaviyo.endpoints.api) + '/identify?data=' + encode(request)

    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'GET',
        mode: 'cors'
      }).then(res => {
        commit(types.SET_CUSTOMER, customer)
        if (useCache) cacheStorage.setItem('customer', customer)
        resolve(res)

        cacheStorage.getItem('trackQueue').then(items => {
          if (items) {
            cacheStorage.removeItem('trackQueue')
            items.forEach(event => dispatch('track', event).catch(err => {}))
          }
        })
      }).catch(err => {
        reject(err)
      })
    })
  },

  loadCustomerFromCache ({ commit }): Promise<Object> {
    return new Promise((resolve, reject) => {
      cacheStorage.getItem('customer').then(customer => {
        if (customer) {
          commit(types.SET_CUSTOMER, customer)
          resolve(customer)
        } else {
          resolve(null)
        }
      }).catch(() => reject())
    })
  },

  resetCustomer ({ commit }, useCache = true) {
    commit(types.SET_CUSTOMER, null)
    commit(types.SET_NEWSLETTER_SUBSCRIBED, null)
    commit(types.SET_WATCHING, [])
    if (useCache) {
      cacheStorage.removeItem('customer')
      cacheStorage.removeItem('backInStockWatching')
    }
  },

  track ({ state }, { event, data, time = Math.floor(Date.now() / 1000) }): Promise<Response> {
    if (state.customer === null || !onlineHelper.isOnline) {
      return new Promise((resolve, reject) => {
        if (state.customer === null) {
          console.warn('No customer identified')
          reject({ message: 'No customer identified'})
        } else {
          reject({ message: 'No connection'})
        }

        cacheStorage.getItem('trackQueue').then(items => {
          let newItems = items || []

          newItems.push({ event, data, time })
          cacheStorage.setItem('trackQueue', newItems)
        })
      })
    }

    let request = {
      token: config.klaviyo.public_key,
      event: event,
      customer_properties: state.customer,
      properties: data,
      time
    }
    let url = processURLAddress(config.klaviyo.endpoints.api) + '/track?data=' + encode(request)

    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'GET',
        mode: 'cors'
      }).then(res => {
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  },

  status ({ commit, state }, email): Promise<Boolean> {
    return new Promise((resolve, reject) => {
      fetch(processURLAddress(config.klaviyo.endpoints.subscribe) + '?email=' + encodeURIComponent(email) + '&storeCode=' + config.defaultStoreCode, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      }).then(res => res.json())
        .then(res => {
          if (Array.isArray(res.result) && res.result.length > 0) {
            commit(types.NEWSLETTER_SUBSCRIBE)
            resolve(true)
          } else {
            commit(types.NEWSLETTER_UNSUBSCRIBE)
            resolve(false)
          }
        }).catch(err => {
          reject(err)
        })
    })
  },

  subscribe ({ commit, dispatch, state }, email): Promise<Response> {
    if (!state.isSubscribed) {
      return new Promise((resolve, reject) => {
        fetch(processURLAddress(config.klaviyo.endpoints.subscribe), {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({
            email: email,
            storeCode: config.defaultStoreCode
          })
        }).then(res => {
          commit(types.NEWSLETTER_SUBSCRIBE)
          if (!state.customer) {
            dispatch('identify', { user: { email } }).then((identify) => resolve(identify))
          } else {
            resolve(res)
          }
        }).catch(err => {
          reject(err)
        })
      })
    }
  },

  subscribeAdvanced ({ commit, dispatch, state }, requestData) : Promise<Response> {
    return new Promise((resolve, reject) => {
      fetch(processURLAddress(config.klaviyo.endpoints.subscribeAdvanced), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          ...requestData,
          storeCode: config.defaultStoreCode
        })
      }).then(res => {
        if (!state.customer && requestData && requestData.hasOwnProperty('email')) {
          dispatch('identify', { user: requestData }).then((identify) => resolve(identify))
        } else {
          resolve(res)
        }
      }).catch(err => {
        reject(err)
      })
    })
  },

  unsubscribe ({ commit, state }, email): Promise<Response> {
    if (state.isSubscribed) {
      return new Promise((resolve, reject) => {
        fetch(processURLAddress(config.klaviyo.endpoints.subscribe), {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({ email })
        }).then(res => {
          commit(types.NEWSLETTER_UNSUBSCRIBE)

          if (!rootStore.state.user.current || !rootStore.state.user.current.email) {
            commit(types.SET_CUSTOMER, null)
          }

          resolve(res)
        }).catch(err => {
          reject(err)
        })
      })
    }
  },

  backInStockSubscribe ({ state, commit, getters }, { product, email, subscribeForNewsletter, useCache = true }): Promise<Response> {
    if (!getters.isWatching(product.sku)) {
      let formData = new FormData()
      const { storeId } = currentStoreView()

      formData.append('a', config.klaviyo.public_key)
      formData.append('email', email)
      formData.append('g', config.klaviyo.backInStockListId)
      formData.append('variant', product.id)
      formData.append('product', product.id)
      formData.append('platform', config.klaviyo.platform)
      formData.append('subscribe_for_newsletter', (!!config.klaviyo.backInStockListId).toString())
      formData.append('store', storeId || config.defaultStoreId)

      return new Promise((resolve, reject) => {
        fetch(processURLAddress(config.klaviyo.endpoints.backInStock), {
          method: 'POST',
          mode: 'cors',
          body: formData
        }).then(res => {
          res.json().then(json => {
            if (json.success) {
              commit(types.BACK_IN_STOCK_SUBSCRIBE, product.parentSku ? product.parentSku + '-' + product.sku : product.sku)
              if (useCache) cacheStorage.setItem('backInStockWatching', state.backInStockWatching)
              resolve(json)
            } else {
              reject(json)
            }
          })
        }).catch(err => {
          reject(err)
        })
      })
    }
  },

  backInStockUnsubscribe ({ state, commit, getters }, { product, email, subscribeForNewsletter, useCache = true }): Promise<Response> {
    if (getters.isWatching(product.sku)) {
      let formData = new FormData()

      formData.append('a', config.klaviyo.public_key)
      formData.append('email', email)
      formData.append('g', config.klaviyo.back_in_stock_list)
      formData.append('variant', product.sku)
      formData.append('product', product.parentSku ? product.parentSku : product.sku)
      formData.append('platform', config.klaviyo.platform)
      formData.append('subscribe_for_newsletter', subscribeForNewsletter)

      return new Promise((resolve, reject) => {
        fetch(processURLAddress(config.klaviyo.endpoints.subscribe), {
          method: 'DELETE',
          mode: 'cors',
          body: formData
        }).then(res => {
          res.json().then(json => {
            if (json.success) {
              commit(types.BACK_IN_STOCK_UNSUBSCRIBE, product.parentSku ? product.parentSku + '-' + product.sku : product.sku)
              if (useCache) cacheStorage.setItem('backInStockWatching', state.backInStockWatching)
              resolve(json)
            } else {
              reject(json)
            }
          })
        }).catch(err => {
          reject(err)
        })
      })
    }
  },

  loadWatchingList ({ commit, dispatch }, useCache = true): Promise<Response> {
    return new Promise((resolve, reject) => {
      const loadFromServer = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          reject({ message: 'Not Implemented'})
        })
      }

      if (useCache) {
        cacheStorage.getItem('backInStockWatching').then(backInStockWatching => {
          if (backInStockWatching) {
            commit(types.SET_WATCHING, backInStockWatching)
            resolve(backInStockWatching)
          } else {
            loadFromServer().then(res => {
              resolve(res)
            }).catch(err => {
              reject(err)
            })
          }
        }).catch(() => reject())
      } else {
        loadFromServer().then(res => {
          resolve(res)
        }).catch(err => {
          reject(err)
        })
      }
    })
  },

  productViewed ({ dispatch }, product): Promise<Response> {
    return dispatch('track', { event: 'Viewed Product', data: mappers.mapProduct(product) }).catch(err => {})
  },

  productAddedToCart ({ dispatch }, product): Promise<Response> {
    return dispatch('track', { event: 'Added to Cart Product', data: mappers.mapLineItem(product) }).catch(err => {})
  },

  productRemovedFromCart ({ dispatch }, product): Promise<Response> {
    return dispatch('track', { event: 'Removed from Cart Product', data: mappers.mapLineItem(product) }).catch(err => {})
  },

  checkoutStarted ({ dispatch }, cart): Promise<Response> {
    return dispatch('track', { event: 'Started Checkout', data: mappers.mapCart(cart) }).catch(err => {})
  },

  orderPlaced ({ dispatch }, order): Promise<Response> {
    return new Promise((resolve, reject) => {
      dispatch('track', { event: 'Placed Order', data: mappers.mapOrder(order) }).then(res => {
        order.products.forEach(product => {
          dispatch('productOrdered', { order, product })
        })
        resolve(res)
      }).catch(err => {})
    })
  },

  productOrdered ({ dispatch }, { order, product }): Promise<Response> {
    return dispatch('track', { event: 'Ordered Product', data: mappers.mapOrderedProduct(order, product) }).catch(err => {})
  }
}
