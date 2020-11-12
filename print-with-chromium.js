const puppeteer = require('puppeteer-core');
const { ArgumentParser } = require('argparse');

const defaultUrl = "https://bericht.neopostmodern.com/portfolio";
const defaultOutputFileName = 'portfolio.pdf'; // todo: insert date

const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp:true,
  description: 'Automated portfolio printing'
});

parser.addArgument(
  ['-f', '--watch'],
  {
    action: 'storeTrue',
    help: 'Re-print portfolio continuously',
    dest: 'watch'
  }
)
parser.addArgument(
  ['-o', '--output_file'],
  {
    type: String,
    dest: 'outputFile',
    defaultValue: defaultOutputFileName,
    help: `Name of output file (default: ${defaultOutputFileName})`,
  }
)
parser.addArgument(
  'url',
  {
    type: String,
    defaultValue: defaultUrl,
    nargs: '?',
    help: `URL to print (default: ${defaultUrl})`,
  }
)

const args = parser.parseArgs();

const timeout = ms => new Promise(res => setTimeout(res, ms));

const date = new Date().toISOString().split('T')[0];
const time = new Date().toTimeString().split(' ')[0];
const headerFooterStyle = "width:100%; margin: 0 5mm; box-sizing: border-box; font-family: 'Times New Roman', serif; font-size: 9px; display: flex; justify-content: space-between;"
const headerTemplate = `
<div class="page-footer" style="${headerFooterStyle}">
  <div>${date} ${time}</div>
  <!--<div><span class="date"></span></div>-->
  <div><span class="title"></span></div>
</div>
`;

const footerTemplate = `
<div class="page-footer" style="${headerFooterStyle}">
  <div><span class="url"></span></div>
  <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
</div>
`;

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        '--disable-web-security',
      ],
      executablePath: '/usr/bin/google-chrome' // todo: switch back to chromium
    });
    const page = await browser.newPage();
    await page.goto(args.url);

    const printPage = async () => {
      // unlink images
      await page.evaluate(() => {
        document
          .querySelectorAll('a.bericht-image-trigger')
          .forEach(imageLink => imageLink.removeAttribute('href'))
      })

      await page.pdf({
        path: args.outputFile,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        printBackground: true,
        // pageRanges: '1',
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        height: 297 + 'mm',
        width: 210 + 'mm',
      });

      if (args.watch) {
        page.reload();
        await timeout(5000);
        await printPage();
      }
    }

//  await timeout(5000);

    await printPage();

    await browser.close();
  } catch (err) {
    if (browser) {
      await browser.close();
    }
    throw err;
  }
})();
