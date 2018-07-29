const getPtxDemoData = function (url, elementSelector) {
  console.log(`🌀 Crawling PTX website: '${url}'`)

  const Promise = require('bluebird')
  const Nightmare = require('nightmare')

  Nightmare.Promise = Promise

  const nightmare = Nightmare({ show: false })

  return nightmare
    .goto(url)
    .wait(elementSelector)
    .evaluate((elementSelector) => {
      $(document.querySelectorAll(`${elementSelector} tr input[type=text]`)).val('');
    }, elementSelector)
    .click(`${elementSelector} input[type=submit]`)
    .wait(`${elementSelector} .response_body pre`)
    .evaluate((elementSelector) => {
      return JSON.parse(document.querySelector(`${elementSelector} .response_body pre`).innerText);
    }, elementSelector)
    .end()
}

module.exports = getPtxDemoData
