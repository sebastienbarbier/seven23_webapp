import axios from 'axios';
import md5 from 'blueimp-md5';
import encryption from '../encryption';

import CategoryActions from './CategoryActions';
import TransactionActions from './TransactionActions';
import ChangeActions from './ChangeActions';
import GoalActions from './GoalActions';

import {
  USER_LOGIN,
  USER_LOGOUT,
  USER_UPDATE_REQUEST,
  USER_FETCH_TOKEN,
  USER_FETCH_PROFILE,
  USER_CHANGE_THEME,
  USER_START_LOGIN,
  USER_STOP_LOGIN,
  UPDATE_ENCRYPTION,
} from '../constants';

var UserActions = {

  setTheme: (theme = 'light') => {
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error('wrong args to UserActions.setTheme', theme);
    }
    return {
      type: USER_CHANGE_THEME,
      theme: theme,
    };
  },

  fetchToken: (username, password, recovering = false) => {
    return (dispatch, getState) => {
      return axios({
        url: '/api/api-token-auth/',
        method: 'POST',
        data: {
          username: username,
          password: password,
        },
      })
        .then(json => {
          const { token } = json.data;
          const cipher = md5(password);

          if (!recovering) {
            encryption.key(cipher);
            dispatch({
              type: USER_FETCH_TOKEN,
              token,
              cipher,
            });
          }
          return Promise.resolve(token);
        })
        .catch(exception => {
          return Promise.reject(exception);
        });
    };
  },

  fetchProfile: (token) => {
    return (dispatch, getState) => {
      token = token || getState().user.token;

      encryption.key(getState().user.cipher);

      return axios({
        url: '/api/v1/rest-auth/user/',
        method: 'get',
        headers: {
          Authorization: 'Token ' + token,
        },
      })
        .then(response => {
          dispatch({
            type: USER_FETCH_PROFILE,
            profile: response.data
          });
          return Promise.resolve(response.data);
        })
        .catch(exception => {
          return Promise.reject(exception);
        });
    };
  },

  logout: () => {
    return (dispatch, getState) => {
      return new Promise((resolve) => {
        encryption.reset();

        CategoryActions.flush();
        TransactionActions.flush();
        ChangeActions.flush();
        GoalActions.flush();

        dispatch({ type: USER_LOGOUT });
        resolve();
      });
    };
  },

  create: (username, first_name, email, password1, password2, origin) => {
    return (dispatch, getState) => {
      return axios({
        url: '/api/v1/rest-auth/registration/',
        method: 'POST',
        data: {
          username: username,
          email: email,
          password1: password1,
          password2: password2,
          origin: origin,
        },
      })
        .then(response => {
          return axios({
            url: '/api/v1/rest-auth/user/',
            method: 'PATCH',
            headers: {
              Authorization: 'Token ' + response.data.key,
            },
            data: {
              first_name: first_name,
            },
          });
        })
        .catch(function(exception) {
          return Promise.reject(exception);
        });
    };
  },

  update: user => {
    return (dispatch, getState) => {
      return new Promise((resolve, reject) => {

        axios({
          url: '/api/v1/rest-auth/user/',
          method: 'PATCH',
          headers: {
            Authorization: 'Token ' + getState().user.token,
          },
          data: user,
        })
          .then(json => {
            dispatch({
              type: USER_UPDATE_REQUEST,
              profile: json.data,
            });
            resolve();
          })
          .catch(exception => {
            console.error(exception);
            reject(exception.response.data);
          });
      });
    };
  },


  delete: user => {
    return (dispatch, getState) => {
      return axios({
        url: '/api/v1/users/' + user.id,
        method: 'DELETE',
        headers: {
          Authorization: 'Token ' + getState().user.token,
        },
        data: user,
      })
        .then(json => {
          dispatch(UserActions.logout());
        })
        .catch(exception => {
          console.error(exception);

        });
    };
  },

  changeEmail: data => {
    return (dispatch, getState) => {
      return axios({
        url: '/api/v1/users/email',
        method: 'POST',
        headers: {
          Authorization: 'Token ' + getState().user.token,
        },
        data: {
          email: data.email,
        },
      })
        .then(json => {
          dispatch({
            type: USER_UPDATE_REQUEST,
            profile: json.data,
          });
        })
        .catch((error) => {
          if (error.response.status !== 400) {
            console.error(error);
          }
          return Promise.reject(error.response.data);
        });
    };
  },

  changePassword: data => {
    return (dispatch, getState) => {
      return new Promise((resolve, reject) => {

        axios({
          url: '/api/v1/rest-auth/password/change/',
          method: 'POST',
          headers: {
            Authorization: 'Token ' + getState().user.token,
          },
          data: data,
        })
          .then(response => {

            // Update user cipher
            const cipher = md5(data.new_password1);

            const { token } = getState().user;
            const { url } = getState().server;
            encryption.key(cipher);
            dispatch({
              type: UPDATE_ENCRYPTION,
              cipher,
            });

            // Encrypt all data with new cipher
            // TODO
            Promise.all([
              CategoryActions.encrypt(cipher, url, token),
              TransactionActions.encrypt(cipher, url, token),
              ChangeActions.encrypt(cipher, url, token),
              GoalActions.encrypt(cipher, url, token),
            ]).then(_ => {
              resolve();
            }).catch(_ => {
              reject();
            });
          })
          .catch((error) => {
            if (error.response.status !== 400) {
              console.error(error);
            }
            reject(error.response.data);
          });
      });
    };
  },

  revokeToken: () => {

    return (dispatch, getState) => {
      return axios({
        url: '/api/v1/users/token',
        method: 'DELETE',
        headers: {
          Authorization: 'Token ' + getState().user.token,
        },
      })
        .then(response => {
          dispatch(UserActions.logout());
        })
        .catch(exception => {
          console.error(exception);
        });
    };
  },

  updateServerEncryption: (token, newCipher, oldCipher) => {
    return (dispatch, getState) => {
      const url = getState().server.url;
      return Promise.all([
        CategoryActions.updateServerEncryption(url, token, newCipher, oldCipher),
        TransactionActions.updateServerEncryption(url, token, newCipher, oldCipher),
        ChangeActions.updateServerEncryption(url, token, newCipher, oldCipher),
        GoalActions.updateServerEncryption(url, token, newCipher, oldCipher),
      ]);
    };
  },

  login: () => {
    return {
      type: USER_LOGIN
    };
  },

  loginStart: () => {
    return {
      type: USER_START_LOGIN
    };
  },

  loginStop: () => {
    return {
      type: USER_STOP_LOGIN
    };
  },

  pay: (token, product_id, coupon_code = undefined) => {
    return (dispatch, getState) => {
      console.log('Pay useractions', product_id);
      return axios({
        url: '/api/v1/payment',
        method: 'POST',
        data: {
          token: token,
          product_id,
          coupon_code,
        },
        headers: {
          Authorization: 'Token ' + getState().user.token,
        },
      });
    };
  }

};

export default UserActions;