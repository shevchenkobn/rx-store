/**
 * Function that uses RegExp for token extraction by regex for a position in that string. Similar to RegExp.test and String.indexOf.
 * @param regexBody doesn't contain slashes & flags
 * @returns matched token or an empty string
 * @example regexMatchFirst('121asdf', '\\d+') === '121'
 * @example regexMatchFirst('121asdf', '\\d+', 0) === '121'
 * @example regexMatchFirst('121asdf', '\\d+', 1) === '21'
 * @example regexMatchFirst('s121asdf', '\\d+', 0) === ''
 * @example regexMatchFirst('ss121asdf', '\\d+', 2) === '121'
 */
export function regexMatchFirst(stringValue: string, regexBody: string, position = 0, flags = '') {
  let regexStr = `${regexBody}`;
  if (position > 0) {
    regexStr = `(?<=^.{${Math.round(position)}})${regexStr}`;
  } else {
    regexStr = '^' + regexStr;
  }
  const regex = new RegExp(regexStr, flags);
  const matched = stringValue.match(regex);
  return !matched || matched.index !== position ? '' : matched[0];
}
