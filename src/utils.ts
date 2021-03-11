/**
 * @param regexBody doesn't contain slashes & flags
 */
 function regexMatchFirst(stringValue: string, regexBody: string, position = 0, flags = '') {
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
