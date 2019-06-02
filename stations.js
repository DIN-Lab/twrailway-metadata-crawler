console.log('⚡️ Start crawling station data')

const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const Nightmare = require('nightmare')
const _ = require('lodash')

Nightmare.Promise = Promise

const enTraSearchWebsiteUrl = 'https://tip.railway.gov.tw/tra-tip-web/tip?lang=EN_US'
const zhTraSearchWebsiteUrl = 'https://tip.railway.gov.tw/tra-tip-web/tip?lang=ZH_TW'

const getStationsFromTraWebsite = function (url) {
  console.log(`🌀 Crawling TRA website: '${url}'`)
  const nightmare = Nightmare({ show: false })
  return nightmare
    .goto(url)
    .wait(() => availableTags != undefined)
    .evaluate(() => {
      const regions = Array.from(document.querySelectorAll('.tipCity'))
                           .filter(e => e.dataset.type.match(/^city\d+$/))
                           .map((e) => { return { id: e.dataset.type, name: e.innerHTML.trim() } });
      return regions.map((regionData) => {
        const container = document.querySelector(`#${regionData.id}`)
        const stations = Array.from(container.querySelectorAll('.tipStation'))
        const defaultStation = container.querySelector('.tipStation.btn-warning') || container.querySelector('.tipStation.btn-info') || stations[0];
        const defaultStationId = defaultStation.title.split('-')[0];
        var appearedStation = {};
        const stationsInRegion = stations.map((e) => {
                                        const comps = e.title.split('-');
                                        const title = comps.slice(1).join('-');
                                        const id = comps[0];

                                        if (id in appearedStation) {
                                          return null;
                                        } else {
                                          appearedStation[id] = true
                                          return {
                                            id: id,
                                            name: title,
                                            isDefaultStation: defaultStationId === id
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
  const appId = process.env.PTX_APP_ID
  const appKey = process.env.PTX_APP_KEY
  return require('./ptx')(appId, appKey)
    .then((data) => {
      let ptxData = data.reduce((acc, ele) => {
        acc[ele.StationID] = ele
        return acc
      }, {})
      let prefilledData = require('./static/prefilled_stations.json')
      const nonEmptyMerger = (objVal, srcVal) => {
        return _.isEmpty(objVal) ? srcVal : objVal
      }
      ptxData = prefilledData.reduce((acc, ele) => {
          if (!(ele.StationID in acc)) {
            acc[ele.StationID] = ele
          } else {
            acc[ele.StationID] = _.mergeWith(ele, acc[ele.StationID], nonEmptyMerger)
          }
          return acc
      }, ptxData)

      let isDataValid = function(d) {
          return _.isObject(d) &&
                 _.every(_(d).values().map(e => !_.isEmpty(e) || _.isFinite(e)).value(), Boolean)
      }
      let keys = _.keys(ptxData)
      keys.forEach((e) => {
        if (!isDataValid(ptxData[e])) {
          console.log(ptxData[e])
          console.log(`❌ Deleted incomplete station data: ${ptxData[e]['StationName']['Zh_tw']}`)
          delete ptxData[e]
        }
      })

      return ptxData
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
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .then(() => console.log('✨ Done'))
