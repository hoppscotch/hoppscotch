import axios from "axios";

const proxyStrategy = async (req, store) => {
  const proxyRes = await axios.post(
    store.state.postwoman.settings.PROXY_URL ||
    "https://postwoman.apollotv.xyz/",
    req
  );

  return proxyRes.data;
}

export default proxyStrategy;
