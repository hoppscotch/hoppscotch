import axios from "axios"

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
      transformResponse: [
        (data, headers) => {
          // If the response has a JSON content type, try parsing it
          if (
            headers["content-type"] &&
            (headers["content-type"].startsWith("application/json") ||
              headers["content-type"].startsWith("application/vnd.api+json") ||
              headers["content-type"].startsWith("application/hal+json"))
          ) {
            try {
              const jsonData = JSON.parse(data)
              return jsonData
            } catch (e) {
              return data
            }
          }

          // Else return the string itself without any transformations
          return data
        },
      ],
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
