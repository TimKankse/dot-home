
const fs = require('fs');
const yaml = require('js-yaml');

try {
  const fileContents = fs.readFileSync('/Users/timcederroth/Code/dot-home/config.yml', 'utf8');
  const data = yaml.load(fileContents);
  const widgets = data.widgets;

  console.log(`Analyzing ${widgets.length} widgets for overlaps...`);

  const grid = {}; // Key: "pageId-x-y", Value: WidgetID

  widgets.forEach(w => {
    const { x, y, w: width, h: height } = w.grid;
    const pageId = w.pageId;

    console.log(`Checking Widget ${w.type} (${w.id.substring(0,4)}) on Page ${pageId.substring(0,4)}: [${x},${y},${width},${height}]`);

    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        const key = `${pageId}-${i}-${j}`;
        if (grid[key]) {
          console.error(`❌ OVERLAP DETECTED!`);
          console.error(`   Cell (${i}, ${j}) on Page ${pageId} is occupied by:`);
          console.error(`   1. Widget ${grid[key]}`);
          console.error(`   2. Widget ${w.id} (${w.type})`);
        } else {
          grid[key] = w.id + ` (${w.type})`;
        }
      }
    }
  });

  console.log("Analysis complete.");

} catch (e) {
  console.error(e);
}
