import { z } from "zod"

export const HoppReusableFunction = z.object({
  v: z.literal(1),
  id: z.string(),
  name: z.string().min(1, "Function name is required"),
  description: z.string().optional(),
  code: z.string().min(1, "Function code is required"),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type HoppReusableFunction = z.infer<typeof HoppReusableFunction>

export const HoppReusableFunctionLibrary = z.object({
  v: z.literal(1),
  functions: z.array(HoppReusableFunction),
})

export type HoppReusableFunctionLibrary = z.infer<typeof HoppReusableFunctionLibrary>

export const makeHoppReusableFunction = (overrides: Partial<HoppReusableFunction> = {}): HoppReusableFunction => {
  const now = new Date().toISOString()
  return {
    v: 1,
    id: crypto.randomUUID(),
    name: "New Function",
    description: "",
    code: "function myFunction() {\n  return 'Hello, World!';\n}",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const makeDefaultHoppReusableFunctionLibrary = (): HoppReusableFunctionLibrary => ({
  v: 1,
  functions: [],
})