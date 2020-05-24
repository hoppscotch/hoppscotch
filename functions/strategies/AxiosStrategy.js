import axios from "axios"

const axiosWithProxy = async (req, { state }) => {
  const { data } = await axios.post(
    state.postwoman.settings.PROXY_URL || "https://postwoman.apollosoftware.xyz/",
    req
  )
  return data
}

const axiosWithoutProxy = async (req, _store) => {
  const res = await axios({
    ...req,
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
}

const axiosStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return axiosWithProxy(req, store)
  }
  return axiosWithoutProxy(req, store)
}

export default axiosStrategy
