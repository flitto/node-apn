module.exports = function extend(target, source) {
  if (source != null && Object.keys(source).length > 0) {
    Object.entries(source).forEach(([key, value]) => {
      if (value !== undefined) {
        target[key] = value
      }
    })
  }
  return target
}
