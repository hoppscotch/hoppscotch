export const decodeB64StringToArrayBuffer = (input) => {
  const bytes = Math.floor((input / 4) * 3)
  const ab = new ArrayBuffer(bytes)
  const uarray = new Uint8Array(ab)

  const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

  let chr1, chr2, chr3
  let enc1, enc2, enc3, enc4
  let j = 0

  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "")

  for (let i = 0; i < bytes; i += 3) {
    //get the 3 octets in 4 ASCII chars
    enc1 = keyStr.indexOf(input.charAt(j++))
    enc2 = keyStr.indexOf(input.charAt(j++))
    enc3 = keyStr.indexOf(input.charAt(j++))
    enc4 = keyStr.indexOf(input.charAt(j++))

    chr1 = (enc1 << 2) | (enc2 >> 4)
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
    chr3 = ((enc3 & 3) << 6) | enc4

    uarray[i] = chr1
    if (enc3 != 64) uarray[i + 1] = chr2
    if (enc4 != 64) uarray[i + 2] = chr3
  }

  return ab
}
