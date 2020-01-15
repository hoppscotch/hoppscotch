import axios from "axios";

const axiosStrategy = async (req, _store) => {
  const res = await axios(req);
  window.$nuxt.$loading.finish();
  return res;
};

export default axiosStrategy;
