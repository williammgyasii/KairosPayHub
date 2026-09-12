export function isEdgeUserAgent(userAgent: string) {
  return /Edg\//.test(userAgent)
}

export function subscribeHangMessage(userAgent: string) {
  if (isEdgeUserAgent(userAgent)) {
    return 'Edge did not finish its push subscription. Click Enable push once more, or use Chrome, Firefox, or Safari on this computer.'
  }
  return 'Could not finish enabling push. Refresh and try again.'
}
