import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Something went wrong';
    const code = err?.response?.data?.error?.code;
    const status = err?.response?.status;
    return Promise.reject(Object.assign(new Error(message), { code, status, original: err }));
  }
);

export default api;
