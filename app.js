const puppeteer = require('puppeteer');
const fs = require("fs");


function wait(val) {
  return new Promise(resolve => setTimeout(resolve, val));
}

let csvRecords = [];

async function readData() {
  const readStream = fs.readFileSync('data/input/urls.csv', {
    encoding: 'utf8',
  });
  
  csvRecords.push(
    readStream.split(/\r?\n/).map((line) => {
        return line.split(',');
    })
  );  
}
  
let result = [];
result.push(
  ", URL, Name, isSecure, Sport"
);

async function processUrl(url, page) {
  console.log(`processing ${url}`);
  await page.waitForSelector('title');  
  const title = await page.title();

  let retVal = []
  let orgName = await page.title();
  
  let isSecure = await page.evaluate(() => {
    console.log(' hwere we are');
    return document.location.protocol.indexOf('https') !== -1 ? 'true' : 'false';
    });
  
  

    let sport = await page.evaluate(() => {

      let obj = [];

      const callback = (element) => {
        if (element.nodeType === 3) {
          let sport = checkElement(element);
          if (sport) {
            obj = sport;
          }
        }
      }
  
      function checkElement(element) {
        const sports = [
          'Soccer',
          'Field Hockey',
          'Hockey',
          'Basketball',
          'Baseball',
          'Softball',
          'Lacrosse',
          'Football'
        ]
        let selectedSport = null;
        sports.map((sport) => {
          if (element.textContent.indexOf(sport) !== -1 ) {
            selectedSport = sport;
          }
        })
        return selectedSport;
      }

      function domTraversal(parentElement, callback) {
        parentElement.childNodes.forEach((element) => {
            callback(element);
            if (element.hasChildNodes()) {
                domTraversal(element, callback);
            }
            return;
        });
      }

    domTraversal(document.getElementById('NewsTable'), callback);
    return obj;
    })

  
  retVal.push([url, orgName, isSecure, sport]);
  return retVal;
  
  console.info(retVal);
}

(async () => {

  await readData();

  let iteration = 0;
  console.log('warming up');
  const browser = await puppeteer.launch({ headless: true });
  console.log('spawned browser');

  //for (i in csvRecords[0]) {
    for (i = 0; i < csvRecords[0].length; i++) {
    
    const page = await browser.newPage();
    console.log('spawned new page');
  

    console.log('run: %o', i);
    console.log(csvRecords[0][i][0]);

    try {
      await page.goto(`http://${csvRecords[0][i][0]}`, {waitUntil: 'load', timeout: 5000});
      let res = await processUrl(csvRecords[0][i][0], page);
      result.push("\n");
      result.push(res[0]);
      console.log('processed!');
      iteration = 0;
    } catch(e) {
      if (iteration < 4) {
        i--;
        iteration++;
        console.warn('not found - incrementing iteration: %o', iteration);
      } else {
        console.warn('not found - giving up',);
        console.log(e);
        result.push("\n");
        result.push(csvRecords[0][i][0]);
        result.push("error opening web page");
        iteration = 0;
      }
    }
    await page.close();
    
  }

  await browser.close();
  let csv = result.join();
  fs.appendFileSync("data/output/backlink-report.csv", csv);
  console.log(result);
  
})();