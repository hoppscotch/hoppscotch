import axios from "axios"
import { decodeB64StringToArrayBuffer } from "../utils/b64"

let cancelSource = axios.CancelToken.source()

export const cancelRunningAxiosRequest = () => {
  cancelSource.cancel()

  // Create a new cancel token
  cancelSource = axios.CancelToken.source()
}

const axiosWithProxy = async (req, { state }) => {
  try {
    const { data } = await axios.post(
      state.postwoman.settings.PROXY_URL || "https://hoppscotch.apollosoftware.xyz/",
      {
        ...req,
        wantsBinary: true,
      },
      {
        cancelToken: cancelSource.token,
      }
    )

    if (!data.success) {
      throw new Error(data.data.message || "Proxy Error")
    }

    if (data.isBinary) {
      data.data = decodeB64StringToArrayBuffer(data.data)
    }

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
      cancelToken: (cancelSource && cancelSource.token) || "",
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

export const testables = {
  cancelSource,
}

export default axiosStrategy
