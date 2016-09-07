#!/usr/bin/env node

import fs from 'fs-extra';
import keypress from 'keypress';
import path from 'path';
import { CLIEngine } from 'eslint';

const jsdiff = require('diff');
require('colors');

const printDiff = (orig, final) => {
  const diff = jsdiff.diffChars(orig, final);
  diff.forEach(part => {
    let color;
    let text = part.value;
    if (part.added || part.removed) {
      color = part.added ? 'green' : 'red';
      text = text.replace(/\n/g, '╗').replace(/\s/g, '▓').replace(/╗/g, '╗\n');
    }
    process.stdout.write(color ? text[color] : text);
  });
};

const fixWithCLI = (src, filename) => {
  let changeMade = true;
  let code = src;
  const cli = new CLIEngine();
  const attemptFix = message => {
    if (!message.fix) {
      return false;
    }
    const tmp = code;
    const charArray = code.split('');
    charArray.splice(
      message.fix.range[0],
      message.fix.range[1] - message.fix.range[0],
      message.fix.text
    );
    code = charArray.join('');
    return code !== tmp;
  };
  let nFound;
  let nFixed = -1;
  while (changeMade) {
    changeMade = false;
    const report = cli.executeOnText(code, filename);
    nFound = nFound || report.results[0].messages.length;
    changeMade = report.results[0].messages.some(attemptFix);
    nFixed += 1;
  }
  return {
    code,
    nFound,
    nFixed,
  };
};

const fix = (src, filename) => {
  let code = src;
  let nFound = 0;
  let nFixed = 0;
  const cliFixes = fixWithCLI(code, filename);
  code = cliFixes.code;
  nFound += cliFixes.nFound;
  nFixed += cliFixes.nFixed;
  return {
    code,
    nFound,
    nFixed,
  };
};

const main = ([filename]) => {
  const fullPath = path.resolve('./', filename);
  const {
    exit,
    stdin,
    stdout,
    stderr,
  } = process;
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    stderr.write(`Could not find file ${fullPath}\n`);
    exit(1);
  }
  keypress(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.on('keypress', (ch, key) => {
    if (key.name === 'c' && key.ctrl) {
      exit(1);
    }
  });
  const src = fs.readFileSync(fullPath, 'utf8');
  const {
    code,
    nFound,
    nFixed,
  } = fix(src, fullPath);
  printDiff(src, code);
  stdout.write(`${`${nFixed}`.cyan} errors fixed, ${`${nFound - nFixed}`.red} unresolved.`);
  stdout.write('\n\n');
  stdout.write('Press [X] to save changes. Press any other key to cancel.\n');
  stdin.on('keypress', (ch, key) => {
    if (key.name === 'x') {
      stdout.write('[X]');
      stdout.write('\n\n');
      stdout.write('Somebody call Kenny Loggins, because you\'re in the.... ');
      fs.writeFileSync(filename, code);
      stdout.write('Daaaaanger Zooooooone!\n');
    } else {
      stdout.write('[not X]');
      stdout.write('\n\n');
      stdout.write('Ugh. Do you want ants? Because this is how you get ants.\n');
    }
    stdin.pause();
  });
};

main(process.argv.slice(2));
