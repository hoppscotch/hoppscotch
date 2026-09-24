import { describe, expect, it } from "vitest"
import { parseAppActionCommand, splitCommands } from "../app-actions"

describe("set_interceptor", () => {
  it.each([
    // Names
    ["use proxy", "proxy"],
    ["select interceptor proxy", "proxy"],
    ["set the interceptor to the browser", "browser"],
    ["select the proxy interceptor", "proxy"],
    ["use a proxy", "proxy"],
    ["use native", "native"],
    ["use the browser", "browser"],
    ["switch to the extension", "extension"],
    ["use the extension agent", "extension"],
    ["use the browser extension interceptor", "browser extension"],
    ["Use Browser Extension Interceptor", "Browser Extension"],
    ["USE THE AGENT!", "AGENT"],
    ["use my agent", "agent"],
    ["switch to the default proxy", "proxy"],
    ["switch the interceptor", ""],
    // What the verb acts on
    ["select interceptor browser", "browser"],
    ["switch interceptor native", "native"],
    ["set the interceptor to Native", "Native"],
    ["switch interceptors to proxy", "proxy"],
    ["switch back to the browser interceptor", "browser"],
    ["switch it over to agent", "agent"],
    ["change it to proxy", "proxy"],
    ["change the default interceptor to proxy", "proxy"],
    ["switch the active interceptor to browser", "browser"],
    ["change the request interceptor to native", "native"],
    ["set this tab’s interceptor to agent", "agent"],
    ["set the interceptor for this tab to proxy", "proxy"],
    [
      "Please switch the interceptor over to the browser extension",
      "browser extension",
    ],
    ["switch this tab to proxy", "proxy"],
    ["set it to use proxy", "proxy"],
    ["set it to use the proxy", "proxy"],
    ["set the request to use the agent", "agent"],
    ["switch to using the proxy", "proxy"],
    // From one to another
    ["switch from browser to proxy", "proxy"],
    ["switch the interceptor from browser to proxy", "proxy"],
    ["switch from the browser interceptor to the proxy", "proxy"],
    ["switch from browser to the extension agent", "extension"],
    ["switch from the default to agent", "agent"],
    ["switch back from the proxy to browser", "browser"],
    ["switch from proxy back to browser", "browser"],
    ["switch from agent over to browser", "browser"],
    ["change from the proxy one to browser", "browser"],
    ["switch to proxy from browser", "proxy"],
    // Lead-ins
    ["can you please switch to the proxy interceptor?", "proxy"],
    ["Could you kindly switch to proxy", "proxy"],
    ["I'd like to use the proxy", "proxy"],
    ["I’d like to switch to the agent interceptor", "agent"],
    ["I'd prefer to use the proxy", "proxy"],
    ["i think we should use the proxy", "proxy"],
    ["I think we should use the proxy", "proxy"],
    ["we should switch to the agent", "agent"],
    ["We should switch to the agent", "agent"],
    ["maybe use the proxy", "proxy"],
    ["maybe use the agent", "agent"],
    ["kindly switch to the agent", "agent"],
    ["alright switch to agent", "agent"],
    ["let me switch to the proxy", "proxy"],
    ["time to switch to the proxy", "proxy"],
    ["Hey Claude switch to proxy", "proxy"],
    ["yeah use the proxy", "proxy"],
    ["yes switch to the agent", "agent"],
    ["Actually switch to the agent", "agent"],
    ["no, use the proxy interceptor", "proxy"],
    ["go ahead and use proxy", "proxy"],
    ["Now, please, switch over to the proxy interceptor", "proxy"],
    ["make it use the agent", "agent"],
    ["configure it to use the proxy", "proxy"],
    ["I want requests to use the agent", "agent"],
    ["for this request use the proxy", "proxy"],
    ["For the interceptor use native", "native"],
    ["for the interceptor, use native", "native"],
    ["interceptor: select native", "native"],
    // Endings
    ["switch to agent,", "agent"],
    ["use the proxy interceptor;", "proxy"],
    ["use the proxy  .", "proxy"],
    ["switch to the agent interceptor, please", "agent"],
    ["use the agent interceptor instead of the browser", "agent"],
    ["use the proxy for this request", "proxy"],
    ["set the interceptor to proxy, not agent", "proxy"],
  ])("reads the interceptor from %s", (text, interceptor) => {
    expect(parseAppActionCommand(text)).toEqual({
      name: "set_interceptor",
      input: { interceptor },
    })
  })

  it.each([
    // Request edits naming proxy / agent / interceptor
    ["set header proxy: on", null],
    ["set header agent on", null],
    ["set header User-Agent: foo", null],
    ["set header Proxy-Authorization: Basic abc", null],
    ["set header X-Interceptor: 1", null],
    ["set header interceptor: 1", null],
    ["set x-interceptor to proxy", null],
    ["set the user agent to proxy", null],
    ["set param agent=chrome", null],
    ["set proxy url to http://x", null],
    ["set url to https://proxy.example.com", null],
    ['set body to {"proxy": true}', null],
    ["set variable interceptor to proxy", null],
    ["set interceptor variable to proxy", null],
    ["set interceptor header to proxy", null],
    ["set the interceptor header to 1", null],
    ["then set the interceptor header to 1", null],
    ["set the Interceptor header to native", null],
    ["set the interceptor param to agent", null],
    ["set the proxy interceptor url to http://localhost:9159", null],
    ["set the interceptor timeout to 30s", null],
    ["set the interceptor url to proxy", null],
    ["set endpoint interceptor.example.com", null],
    ["use endpoint interceptor.dev/api", null],
    ["set address interceptor.local", null],
    ["set bearer interceptor.a.b", null],
    ["use proxy auth", null],
    ["set it to use proxy mode", null],
    ["set from address to proxy", null],
    // Values that end in a switch
    ["set header X-Note: please use proxy", null],
    ["set header Via: use proxy", null],
    ["set param q=use proxy", null],
    ["add param search=switch to agent", null],
    ["set the url to use proxy", null],
    ["set bearer token to use proxy", null],
    ["set pre-request script to // use proxy", null],
    ["rename this request to Switch to agent", null],
    // Other targets
    ["set env variable proxy=http://x", "add_or_update_environment_variables"],
    ["switch to the proxy environment", "select_environment"],
    ["switch to the interceptor env", "select_environment"],
    ["select interceptor environment", "select_environment"],
    ["select the interceptor environment", "select_environment"],
    ["switch to the interceptor tests environment", "select_environment"],
    ["select the interceptors tab", null],
    ["switch to team Interceptor QA", null],
    ["use the interceptor docs link in the description", null],
    ["switch from the dev collection to the interceptor collection", null],
    ["switch from staging to proxy", null],
    ["switch from GET to proxy", null],
    ["change from json to the agent", null],
    ["switch from proxy", null],
    // Questions, statements, negations
    ["can I use the agent interceptor?", null],
    ["could I use the proxy?", null],
    ["can I use proxy?", null],
    ["can we use the proxy?", null],
    ["can we use the agent?", null],
    ["will I need to use the proxy?", null],
    ["would I need to switch to the agent?", null],
    ["should I use the proxy interceptor?", null],
    ["which interceptor should I use?", null],
    ["I need to know if I should use the proxy", null],
    ["i can use the agent", null],
    ["I use proxy", null],
    ["you use proxy", null],
    ["we use the agent.", null],
    ["you can use the proxy interceptor for CORS", null],
    ["I set the interceptor to proxy but it fails", null],
    ["we set the interceptor to agent last week", null],
    ["you set the interceptor to proxy earlier", null],
    ["I'd use the proxy interceptor but it's down", null],
    ["don't use the proxy", null],
    ["no need to switch to proxy", null],
    ["let's not use the proxy", null],
    ["I'd rather not use the agent interceptor", null],
  ])("doesn't read %s as a switch", (text, name) => {
    expect(parseAppActionCommand(text)?.name ?? null).toBe(name)
  })
})

describe("create_collection", () => {
  it.each([
    "create a collection for the auth flows",
    "create a collection with my requests",
    "make a new collection",
  ])("needs a name for %s", (text) => {
    expect(parseAppActionCommand(text)?.name).not.toBe("create_collection")
  })

  it.each([
    ["create a collection called Auth flows", "Auth flows"],
    ["create collection Users", "Users"],
    ["create a collection for login named Login", "Login"],
    ['create a collection "for the win"', "for the win"],
  ])("names the collection from %s", (text, name) => {
    expect(parseAppActionCommand(text)).toEqual({
      name: "create_collection",
      input: { name },
    })
  })
})

describe("splitCommands", () => {
  it("splits a tab action from the run", () => {
    expect(splitCommands("open a new tab and run the request")).toEqual([
      "open a new tab",
      "run the request",
    ])
  })
})
