/**
 * The makeReadableKey function formats a string to be more human-readable.
 * It replaces underscores with spaces, converts it to lowercase,
 * and capitalizes the first letter.
 * @param string The string to be formatted
 * @returns A human-readable version of the string
 */
export const makeReadableKey = (string: string, capitalizeAll?: boolean) => {
  if (!string) return '';
  const val = string.replace(/_/g, ' ').toLocaleLowerCase();

  if (capitalizeAll) {
    return val
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
};
