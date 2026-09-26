// Prints an HTML file to a PDF with Chromium, for the manual:
//
//	node tools/screenshots/pdf.mjs dist/website/manual-print.html dist/website/manual.pdf [title] [A4|A5]
//
// A4 (or A5), backgrounds printed, the page number at the foot of every page. The
// page's own stylesheet sets the margins (@page). Development
// only, like the screenshots: the game never needs it.

import { chromium } from 'playwright';
import path from 'node:path';
import { EDITION } from '../where.mjs';

const [input, output, title = EDITION.name, size = 'A4'] = process.argv.slice(2);
if (!input || !output) {
	console.log('Usage: node pdf.mjs <page.html> <out.pdf> [title for the footer] [A4 or A5]');
	process.exit(1);
}
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.resolve(input), { waitUntil: 'load' });
await page.waitForTimeout(800);   // fonts and highlighting
const foot = `<div style="width:100%; font: 8.5px Georgia, serif; color:#7a5a30; padding:0 16mm; display:flex; justify-content:space-between;">
	<span>${title}</span><span class="pageNumber"></span></div>`;
await page.pdf({
	path: output, format: size, printBackground: true, preferCSSPageSize: true,
	displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot,
});
await browser.close();
console.log('Wrote ' + output);
