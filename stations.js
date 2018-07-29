const Promise = require('bluebird')
const Nightmare = require('nightmare')

Nightmare.Promise = Promise

const enTraSearchWebsiteUrl = 'http://twtraffic.tra.gov.tw/twrail/EN_QuickSearch.aspx'
const zhTraSearchWebsiteUrl = 'http://twtraffic.tra.gov.tw/twrail/TW_Quicksearch.aspx'

const getStationsFromTraWebsite = function (url) {
  const nightmare = Nightmare({ show: false })
  return nightmare
    .goto(url)
    .wait('#FromCity')
    .evaluate(() => {
      var regions = Array.from(document.querySelectorAll('#FromCity > option')).map((e) => { return { id: e.value, name: e.innerHTML } });
      return regions.map((regionData) => {
        $('#FromCity').val(regionData.id);
        $('#FromCity').trigger('change');
        regionData.defaultStationId = $('FromCity').val()
        const stationsInRegion = Array.from(document.querySelectorAll('#FromStation > option')).map((e) => { return { id: e.value, name: e.innerHTML } });
        return { region: regionData, stations: stationsInRegion };
      });
    })
    .end()
}

const getPtxStationData = function () {
  let url = 'http://ptx.transportdata.tw/MOTC/Swagger/#!/TRAApi/TRAApi_Station'
  const nightmare = Nightmare({ show: false })
  return nightmare
    .goto(url)
    .wait('#TRAApi_TRAApi_Station')
    .evaluate(() => {
      $(document.querySelectorAll('#TRAApi_TRAApi_Station tr input[type=text]')).val('');
    })
    .click('#TRAApi_TRAApi_Station input[type=submit]')
    .wait('#TRAApi_TRAApi_Station .response_body pre')
    .evaluate(() => {
      return JSON.parse(document.querySelector('#TRAApi_TRAApi_Station .response_body pre').innerText);
    })
    .end()
    .then((data) => {
      return data.reduce((acc, ele) => {
        acc[ele.StationID] = ele
        return acc
      }, {})
    })
}

const replaceStationData = function(originalData, detailedStationDataById) {
  return originalData.reduce((acc, { region, stations }) => {
    acc[region.name] = stations.map(({ id }) => { return detailedStationDataById[id] })
    return acc
  }, {})
}

const promises = [
  getPtxStationData(),
  getStationsFromTraWebsite(zhTraSearchWebsiteUrl),
  getStationsFromTraWebsite(enTraSearchWebsiteUrl)
]
Promise.all(promises)
  .then(([detailedData, zhData, enData]) => {
    return [
      replaceStationData(zhData, detailedData),
      replaceStationData(enData, detailedData)
    ]
  })
  .then(d => JSON.stringify(d, null, 2))
  .then(console.log)
