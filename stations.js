console.log('⚡️ Start crawling station data')

const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const Nightmare = require('nightmare')

Nightmare.Promise = Promise

const enTraSearchWebsiteUrl = 'http://twtraffic.tra.gov.tw/twrail/EN_QuickSearch.aspx'
const zhTraSearchWebsiteUrl = 'http://twtraffic.tra.gov.tw/twrail/TW_Quicksearch.aspx'

const getStationsFromTraWebsite = function (url) {
  console.log(`🌀 Crawling TRA website: '${url}'`)
  const nightmare = Nightmare({ show: false })
  return nightmare
    .goto(url)
    .wait('#FromCity')
    .evaluate(() => {
      var regions = Array.from(document.querySelectorAll('#FromCity > option')).map((e) => { return { id: e.value, name: e.innerHTML.trim() } });
      return regions.map((regionData) => {
        $('#FromCity').val(regionData.id);
        $('#FromCity').trigger('change');
        const defaultStationId = parseInt($('#FromStation').val());
        var appearedStation = {};
        const stationsInRegion = Array.from(document.querySelectorAll('#FromStation > option'))
                                      .map((e) => {
                                        if (e.value in appearedStation) {
                                          return null;
                                        } else {
                                          appearedStation[e.value] = true
                                          return {
                                            id: e.value,
                                            name: e.innerHTML,
                                            isDefaultStation: defaultStationId === parseInt(e.value)
                                          };
                                        }
                                      })
                                      .filter(e => e !== null);
        return { region: regionData, stations: stationsInRegion };
      });
    })
    .end()
}

const getPtxStationData = function () {
  let url = 'http://ptx.transportdata.tw/MOTC/Swagger/#!/TRAApi/TRAApi_Station'
  return require('./ptx')(url, '#TRAApi_TRAApi_Station')
    .then((data) => {
      let ptxData = data.reduce((acc, ele) => {
        acc[ele.StationID] = ele
        return acc
      }, {})

      let prefilledData = require('./static/prefilled_stations.json')
      return prefilledData.reduce((acc, ele) => {
          if (!(ele.StationID in acc)) {
            acc[ele.StationID] = ele
          }
          return acc
      }, ptxData)
    })
}

const generateAppReadyData = function(originalData, detailedStationDataById) {
  return {
      regions: originalData.map(({ region }) => { return region.name }),
      stations: originalData.reduce((acc, { region, stations }) => {
        acc[region.name] = stations.map(({ id, isDefaultStation }) => {
          let data = detailedStationDataById[id]
          if (data !== null) {
            return {...detailedStationDataById[id], ...{ IsMainStationInArea: isDefaultStation }}
          } else {
            return null
          }
        }).filter(arg => arg !== null)
        return acc
      }, {})
    }
}

const promises = [
  getPtxStationData(),
  getStationsFromTraWebsite(zhTraSearchWebsiteUrl),
  getStationsFromTraWebsite(enTraSearchWebsiteUrl)
]
Promise.all(promises)
  .then(([detailedData, zhData, enData]) => {
    console.log('🌀 Done crawling')
    console.log('🌀 Processing data')
    return {
      zh: generateAppReadyData(zhData, detailedData),
      en: generateAppReadyData(enData, detailedData)
    }
  })
  .then(({ zh, en }) => {
    console.log('🌀 Writing data to files')
    const outputDir = path.join(__dirname, 'output')

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir)
    }

    const writeActions = [
      fs.writeFileAsync(path.join(outputDir, 'areas_zh.json'), JSON.stringify(zh.regions)),
      fs.writeFileAsync(path.join(outputDir, 'areas_en.json'), JSON.stringify(en.regions)),
      fs.writeFileAsync(path.join(outputDir, 'stations_zh.json'), JSON.stringify(zh.stations)),
      fs.writeFileAsync(path.join(outputDir, 'stations_en.json'), JSON.stringify(en.stations)),
      fs.writeFileAsync(path.join(outputDir, 'areas_zh_pretty.json'), JSON.stringify(zh.regions, null, 4)),
      fs.writeFileAsync(path.join(outputDir, 'areas_en_pretty.json'), JSON.stringify(en.regions, null, 4)),
      fs.writeFileAsync(path.join(outputDir, 'stations_zh_pretty.json'), JSON.stringify(zh.stations, null, 4)),
      fs.writeFileAsync(path.join(outputDir, 'stations_en_pretty.json'), JSON.stringify(en.stations, null, 4))
    ]

    return Promise.all(writeActions)
  })
  .then(() => console.log('✨ Done'))
