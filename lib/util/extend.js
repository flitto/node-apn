module.exports = function extend(target, source) {
  Object.entries(source).forEach(([key, value]) => {
    if (value !== undefined) {
      target[key] = value
    }
  })
  return target
}
