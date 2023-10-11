import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
  headers: {
    'Content-type': 'application/json',
  },
  withCredentials: true,
});

export default instance;



