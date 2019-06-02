const axios = require('axios')
const JsSha = require('jssha')

const getAuthHeaders = function(appId, appKey) {
  const gmtDateString = new Date().toGMTString()
  const hasher = new JsSha('SHA-1', 'TEXT')
	hasher.setHMACKey(appKey, 'TEXT')
	hasher.update(`x-date: ${gmtDateString}`)
	const hmac = hasher.getHMAC('B64')

  const Authorization = `hmac username="${appId}", algorithm="hmac-sha1", headers="x-date", signature="${hmac}"`

	return { Authorization, 'X-Date': gmtDateString }
}

const getPtxData = async function (appId, appKey) {
  console.log('🌀 Calling PTX API')

  const response = await axios.get(
    'https://ptx.transportdata.tw/MOTC/v3/Rail/TRA/Station?$format=JSON',
    { headers: getAuthHeaders(appId, appKey) }
  )
  return response.data.Stations
}

module.exports = getPtxData
