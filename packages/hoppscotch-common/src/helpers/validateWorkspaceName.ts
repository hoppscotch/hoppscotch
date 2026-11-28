export function validateWorkspaceName(name: string): { ok: boolean; message?: string } {
  const trimmed = name.trim()

  if (trimmed.length === 0)
    return { ok: false, message: "Workspace name cannot be empty." }

  if (trimmed.length < 6)
    return { ok: false, message: "Workspace name must be at least 6 characters long." }

  return { ok: true }
}

export function sanitizeWorkspaceName(name: string): string {
  return name.trim()
}
