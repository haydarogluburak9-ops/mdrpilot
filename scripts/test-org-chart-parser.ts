import { parseAsciiOrgChart } from "../src/lib/exports/generators/org-chart-docx";

const sample = `Genel Müdür
├── Kalite Müdürü
│   ├── İç Denetim Sorumlusu
├── Üretim Müdürü`;

const tree = parseAsciiOrgChart(sample);
console.log(JSON.stringify(tree, null, 2));
