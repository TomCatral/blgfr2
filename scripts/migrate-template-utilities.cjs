const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const postcss = require('../frontend/node_modules/postcss');

const root = path.resolve(__dirname, '..');
const appRoot = path.join(root, 'frontend', 'src', 'app');
const stylePath = path.join(root, 'frontend', 'src', 'ionic-design.scss');
const utilityPattern = /^(?:-?m[trblxy]?|-?p[trblxy]?|space-[xy]|gap(?:-[xy])?|text|font|leading|tracking|bg|border(?:-[trblxy])?|rounded|shadow|ring|w|min-w|max-w|h|min-h|max-h|flex|inline-flex|grid|inline-grid|block|inline|hidden|items|justify|content|self|place-|col-|row-|overflow|truncate|whitespace|break-|object|relative|absolute|fixed|sticky|inset|top|right|bottom|left|z-|opacity|cursor|pointer-events|select-|transition|duration|ease|transform|translate|scale|rotate|origin|divide|list-|uppercase|lowercase|capitalize|normal-case|italic|not-italic|sr-only|aspect|backdrop|from-|via-|to-|fill-|stroke-|grow|shrink|basis|order|table|align|appearance|outline|resize|accent|caret|scroll|snap|touch|will-change|dark:|sm:|md:|lg:|xl:|2xl:|hover:|focus:|active:|disabled:|group-|peer-|print:)/;

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(fullPath);
  return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
});

const escapeClass = (token) => token.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const aliasesByUtility = new Map();
let migratedAttributes = 0;
let migratedTokens = 0;

for (const htmlPath of walk(appRoot)) {
  const relative = path.relative(appRoot, htmlPath).replace(/\\/g, '/');
  const componentName = path.basename(relative, '.component.html')
    .replace(/\.html$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '-');
  const aliasesBySet = new Map();
  let sequence = 0;
  const source = fs.readFileSync(htmlPath, 'utf8');
  const migrated = source.replace(/class="([^"]*)"/g, (match, classValue) => {
    const tokens = classValue.trim().split(/\s+/).filter(Boolean);
    const utilities = tokens.filter((token) => utilityPattern.test(token));
    if (!utilities.length) return match;

    const semantic = tokens.filter((token) => !utilityPattern.test(token));
    const key = utilities.join(' ');
    let alias = aliasesBySet.get(key);
    if (!alias) {
      sequence += 1;
      const digest = crypto.createHash('sha1').update(`${relative}:${key}`).digest('hex').slice(0, 6);
      alias = `${componentName}-style-${String(sequence).padStart(3, '0')}-${digest}`;
      aliasesBySet.set(key, alias);
      for (const utility of utilities) {
        const aliases = aliasesByUtility.get(utility) || new Set();
        aliases.add(alias);
        aliasesByUtility.set(utility, aliases);
      }
    }

    migratedAttributes += 1;
    migratedTokens += utilities.length;
    return `class="${[...semantic, alias].join(' ')}"`;
  });
  if (migrated !== source) fs.writeFileSync(htmlPath, migrated);
}

const css = fs.readFileSync(stylePath, 'utf8');
const stylesheet = postcss.parse(css, { from: stylePath });
stylesheet.walkRules((rule) => {
  const additions = [];
  for (const [utility, aliases] of aliasesByUtility) {
    const escaped = escapeClass(utility);
    const matcher = new RegExp(`\\.${escaped}(?![a-zA-Z0-9_-])`, 'g');
    if (!matcher.test(rule.selector)) continue;
    matcher.lastIndex = 0;
    for (const alias of aliases) additions.push(rule.selector.replace(matcher, `.${alias}`));
  }
  if (additions.length) {
    const selectors = new Set(rule.selector.split(',').map((selector) => selector.trim()));
    for (const addition of additions) {
      for (const selector of addition.split(',')) selectors.add(selector.trim());
    }
    rule.selector = [...selectors].join(',');
  }
});
fs.writeFileSync(stylePath, stylesheet.toString());
console.log(`Migrated ${migratedTokens} utility tokens across ${migratedAttributes} static class attributes.`);
console.log(`Generated ${[...aliasesByUtility.values()].reduce((count, aliases) => count + aliases.size, 0)} SCSS selector aliases.`);
