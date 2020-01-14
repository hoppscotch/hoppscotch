import axios from "axios";

const axiosStrategy = async (req, _store) => {
  const res = await axios(req);
  return res;
}

export default axiosStrategy;
