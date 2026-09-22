const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const postcss = require('../frontend/node_modules/postcss');

const root = path.resolve(__dirname, '..');
const appRoot = path.join(root, 'frontend', 'src', 'app');
const cssPath = path.join(root, 'frontend', 'src', 'ionic-design.css');
const outPath = path.join(root, 'frontend', 'src', 'template-migrated.scss');

const utilityPattern = /^(?:-?m[trblxy]?|-?p[trblxy]?|space-[xy]|gap(?:-[xy])?|text|font|leading|tracking|bg|border(?:-[trblxy])?|rounded|shadow|ring|w|min-w|max-w|h|min-h|max-h|flex|inline-flex|grid|inline-grid|block|inline|hidden|items|justify|content|self|place-|col-|row-|overflow|truncate|whitespace|break-|object|relative|absolute|fixed|sticky|inset|top|right|bottom|left|z-|opacity|cursor|pointer-events|select-|transition|duration|ease|transform|translate|scale|rotate|origin|divide|list-|uppercase|lowercase|capitalize|normal-case|italic|not-italic|sr-only|aspect|backdrop|from-|via-|to-|fill-|stroke-|grow|shrink|basis|order|table|align|appearance|outline|resize|accent|caret|scroll|snap|touch|will-change|dark:|sm:|md:|lg:|xl:|2xl:|hover:|focus:|active:|disabled:|group-|peer-|print:)/;

const escapeClass = (token) => token.replace(/([^a-zA-Z0-9_-])/g, '\\$1');

// 1. Collect all aliases and their utilities by walking the templates
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(fullPath);
  return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
});

const aliasesByUtility = new Map();

for (const htmlPath of walk(appRoot)) {
  const relative = path.relative(appRoot, htmlPath).replace(/\\/g, '/');
  const gitRelPath = 'frontend/src/app/' + relative;
  let source = '';
  try {
    source = cp.execSync(`git show :${gitRelPath}`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
  } catch (e) {
    source = fs.readFileSync(htmlPath, 'utf8');
  }

  const componentName = path.basename(relative, '.component.html')
    .replace(/\.html$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '-');
  const aliasesBySet = new Map();
  let sequence = 0;

  source.replace(/class="([^"]*)"/g, (match, classValue) => {
    const tokens = classValue.trim().split(/\s+/).filter(Boolean);
    const utilities = tokens.filter((token) => utilityPattern.test(token));
    if (!utilities.length) return match;

    const key = utilities.join(' ');
    let alias = aliasesBySet.get(key);
    if (!alias) {
      sequence += 1;
      const digest = crypto.createHash('sha1').update(`${relative}:${key}`).digest('hex').slice(0, 6);
      alias = `${componentName}-style-${String(sequence).padStart(3, '0')}-${digest}`;
      aliasesBySet.set(key, alias);
      for (const utility of utilities) {
        if (!aliasesByUtility.has(utility)) aliasesByUtility.set(utility, new Set());
        aliasesByUtility.get(utility).add(alias);
      }
    }
    return match;
  });
}

console.log('Unique utilities found in templates:', aliasesByUtility.size);

// 2. Parse ionic-design.css and extract matching rules
const css = fs.readFileSync(cssPath, 'utf8');
const parsed = postcss.parse(css);
const outRoot = postcss.root();

// Map media queries
const mediaBlocks = new Map();

function getMediaBlock(params) {
  if (!mediaBlocks.has(params)) {
    const atrule = postcss.atRule({ name: 'media', params });
    outRoot.append(atrule);
    mediaBlocks.set(params, atrule);
  }
  return mediaBlocks.get(params);
}

for (const [utility, aliases] of aliasesByUtility) {
  const escaped = escapeClass(utility);
  const regex = new RegExp(`(^|[,\\s])\\.${escaped}(?=[^a-zA-Z0-9_\\-]|$)(:where\\([^\\)]+\\)|:[a-zA-Z0-9_\\-]+)*`, 'g');

  parsed.walkRules((rule) => {
    // Only look at rules matching this escaped utility
    if (!rule.selector.includes(`.${escaped}`)) return;

    // Find the exact matching selector part
    // e.g. from `.mt-3` or `.dark\:text-white:where(.dark, .dark *)`
    const selectorParts = rule.selector.split(/,(?![^\(]*\))/).map(s => s.trim());
    for (const part of selectorParts) {
      const match = part.match(new RegExp(`^\\.${escaped}(.*)$`));
      if (match) {
        const suffix = match[1] || ''; // e.g. ':where(.dark, .dark *)' or ':hover'
        const isInsideMedia = rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'media';
        const targetContainer = isInsideMedia ? getMediaBlock(rule.parent.params) : outRoot;

        for (const alias of aliases) {
          const newRule = postcss.rule({
            selector: `.${alias}${suffix}`
          });
          rule.each(decl => {
            newRule.append(decl.clone());
          });
          targetContainer.append(newRule);
        }
      }
    }
  });
}

fs.writeFileSync(outPath, outRoot.toString());
console.log('Successfully wrote', outPath, 'with length:', fs.statSync(outPath).size);
