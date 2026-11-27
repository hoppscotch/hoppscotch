type FormDataEntry = {
  key: string
  contentType?: string
  value: string | Blob
  isFile?: boolean
}

export const toFormData = (values: FormDataEntry[]) => {
  const formData = new FormData()

  values.forEach(({ key, value, contentType, isFile }) => {
    if (isFile || value instanceof File) {
      if (value instanceof File && contentType && contentType !== value.type) {
        formData.append(
          key,
          new File([value], value.name, { type: contentType })
        )
        return
      }

      formData.append(key, value)
      return
    }

    if (contentType && typeof value === "string") {
      // No filename is passed here: a text field stays a text part that
      // only carries the manually set content type.
      formData.append(key, new Blob([value], { type: contentType }))
      return
    }

    formData.append(key, value)
  })

  return formData
}
