import axios from "axios";

const axiosWithProxy = async (req, store) => {
  const { data } = await axios.post(
    store.state.postwoman.settings.PROXY_URL ||
    "https://postwoman.apollotv.xyz/",
    req
  );
  return data;
}

const axiosWithoutProxy = async (req, _store) => {
  const res = await axios(req);
  return res;
};

const axiosStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return axiosWithProxy(req, store);
  }
  return axiosWithoutProxy(req, store);
}

export default axiosStrategy;
