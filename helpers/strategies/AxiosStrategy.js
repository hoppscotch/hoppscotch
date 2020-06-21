import axios from "axios"
import { isJSONContentType } from "../utils/contenttypes"

let cancelSource = axios.CancelToken.source()

export const cancelRunningAxiosRequest = () => {
  cancelSource.cancel()

  // Create a new cancel token
  cancelSource = axios.CancelToken.source()
}

const axiosWithProxy = async (req, { state }) => {
  try {
    const { data } = await axios.post(
      state.postwoman.settings.PROXY_URL || "https://postwoman.apollosoftware.xyz/",
      req,
      {
        cancelToken: cancelSource.token,
      }
    )
    return data
  } catch (e) {
    // Check if the throw is due to a cancellation
    if (axios.isCancel(e)) {
      throw "cancellation"
    } else {
      throw e
    }
  }
}

const axiosWithoutProxy = async (req, _store) => {
  try {
    const res = await axios({
      ...req,
      cancelToken: cancelSource.token,
      responseType: "arraybuffer",
    })

    return res
  } catch (e) {
    if (axios.isCancel(e)) {
      throw "cancellation"
    } else {
      throw e
    }
  }
}

const axiosStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return axiosWithProxy(req, store)
  }
  return axiosWithoutProxy(req, store)
}

export default axiosStrategy
