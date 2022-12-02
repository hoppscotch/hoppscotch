type FormDataEntry = {
  key: string
  value: string | Blob
}

export const toFormData = (values: FormDataEntry[]) => {
  const formData = new FormData()

  values.forEach(({ key, value }) => formData.append(key, value))

  return formData
}
