# CTO DIRECTIVE: Hoppscotch GraphQL cURL Import Implementation
**To: VSCode ChatGPT Execution Unit**
**From: OpenClaw CTO Management Group**

You are tasked with implementing the "Import from cURL" feature for the GraphQL module in Hoppscotch. Follow the architecture and implementation steps below strictly.

---

## 1. ARCHITECTURAL REQUIREMENTS
- **Non-Invasive**: Do not modify existing REST cURL logic.
- **State Management**: Directly mutate `tabs.currentActiveTab.value.document.request` as confirmed in Step 1.
- **Reusability**: Wrap the existing `parseCurlToHoppRESTReq` instead of reinventing the parser.

---

## 2. REFINED IMPLEMENTATION PLAN

### Step 2: Logic Implementation (Action Required)
Modify `packages/hoppscotch-common/src/helpers/curl/index.ts` to export `parseCurlToGQL`.

**Implementation logic:**
```typescript
export const parseCurlToGQL = (curlCommand: string) => {
  const restReq = parseCurlToHoppRESTReq(curlCommand);
  if (restReq.status === "error") return restReq;

  let query = "";
  let variables = "{}";

  try {
    const bodyJson = JSON.parse(restReq.data.body.body || "{}");
    if (bodyJson.query) {
      query = bodyJson.query;
      variables = JSON.stringify(bodyJson.variables || {}, null, 2);
    } else {
      query = restReq.data.body.body || "";
    }
  } catch (e) {
    query = restReq.data.body.body || "";
  }

  return {
    status: "ok",
    data: {
      url: restReq.data.endpoint,
      query: query,
      variables: variables
    }
  };
};
```

### Step 3: UI Integration (Action Required)
Modify `packages/hoppscotch-common/src/components/graphql/RequestOptions.vue`.

1. **Import the helper**: `import { parseCurlToGQL } from "~/helpers/curl"` (adjust path if needed).
2. **Add a Button**: In the template, near the "Connect" button, add a "Import from cURL" HoppButton.
3. **Handle Click**: Open a modal (or a simple text area prompt for now) to accept the cURL string.
4. **Update State**:
   ```typescript
   const res = parseCurlToGQL(inputString);
   if (res.status === "ok") {
     const request = tabs.currentActiveTab.value.document.request;
     request.url = res.data.url;
     request.query = res.data.query;
     request.variables = res.data.variables;
   }
   ```

---

## 3. TECHNICAL TARGETS
- **Logic**: `packages/hoppscotch-common/src/helpers/curl/index.ts`
- **UI**: `packages/hoppscotch-common/src/components/graphql/RequestOptions.vue`

---

## 4. NEXT STEPS
Execute Step 2 first. Once code is written to `index.ts`, run `git add .` so the CTO can verify. Then proceed to Step 3.
