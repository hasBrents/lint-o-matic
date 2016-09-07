#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _keypress = require('keypress');

var _keypress2 = _interopRequireDefault(_keypress);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _eslint = require('eslint');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var jsdiff = require('diff');
require('colors');

var printDiff = function printDiff(orig, final) {
  var diff = jsdiff.diffChars(orig, final);
  diff.forEach(function (part) {
    var color = void 0;
    var text = part.value;
    if (part.added || part.removed) {
      color = part.added ? 'green' : 'red';
      text = text.replace(/\n/g, '╗').replace(/\s/g, '▓').replace(/╗/g, '╗\n');
    }
    process.stdout.write(color ? text[color] : text);
  });
};

var fixWithCLI = function fixWithCLI(src, filename) {
  var changeMade = true;
  var code = src;
  var cli = new _eslint.CLIEngine();
  var attemptFix = function attemptFix(message) {
    if (!message.fix) {
      return false;
    }
    var tmp = code;
    var charArray = code.split('');
    charArray.splice(message.fix.range[0], message.fix.range[1] - message.fix.range[0], message.fix.text);
    code = charArray.join('');
    return code !== tmp;
  };
  var nFound = void 0;
  var nFixed = -1;
  while (changeMade) {
    changeMade = false;
    var report = cli.executeOnText(code, filename);
    nFound = nFound || report.results[0].messages.length;
    changeMade = report.results[0].messages.some(attemptFix);
    nFixed += 1;
  }
  return {
    code: code,
    nFound: nFound,
    nFixed: nFixed
  };
};

var fix = function fix(src, filename) {
  var code = src;
  var nFound = 0;
  var nFixed = 0;
  var cliFixes = fixWithCLI(code, filename);
  code = cliFixes.code;
  nFound += cliFixes.nFound;
  nFixed += cliFixes.nFixed;
  return {
    code: code,
    nFound: nFound,
    nFixed: nFixed
  };
};

var main = function main(_ref) {
  var _ref2 = _slicedToArray(_ref, 1);

  var filename = _ref2[0];

  var fullPath = _path2.default.resolve('./', filename);
  var _process = process;
  var exit = _process.exit;
  var stdin = _process.stdin;
  var stdout = _process.stdout;
  var stderr = _process.stderr;

  if (!_fsExtra2.default.existsSync(fullPath) || _fsExtra2.default.statSync(fullPath).isDirectory()) {
    stderr.write('Could not find file ' + fullPath + '\n');
    exit(1);
  }
  (0, _keypress2.default)(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.on('keypress', function (ch, key) {
    if (key.name === 'c' && key.ctrl) {
      exit(1);
    }
  });
  var src = _fsExtra2.default.readFileSync(fullPath, 'utf8');

  var _fix = fix(src, fullPath);

  var code = _fix.code;
  var nFound = _fix.nFound;
  var nFixed = _fix.nFixed;

  printDiff(src, code);
  stdout.write(('' + nFixed).cyan + ' errors fixed, ' + ('' + (nFound - nFixed)).red + ' unresolved.');
  stdout.write('\n\n');
  stdout.write('Press [X] to save changes. Press any other key to cancel.\n');
  stdin.on('keypress', function (ch, key) {
    if (key.name === 'x') {
      stdout.write('[X]');
      stdout.write('\n\n');
      stdout.write('Somebody call Kenny Loggins, because you\'re in the.... ');
      _fsExtra2.default.writeFileSync(filename, code);
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
