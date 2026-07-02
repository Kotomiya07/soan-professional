/*
 * Soan: Library for rendering modern Japanese using old movable type
 * http://codh.rois.ac.jp/software/soan/
 *
 * Copyright 2023 Center for Open Data in the Humanities, Research Organization of Information and Systems
 * Released under the MIT license
 *
 * Core contributor: Jun HOMMA (@2SC1815J)
 */
'use strict';
const path = require('path');
const { createRequire } = require('module');

const cliRequire = createRequire(path.resolve(__dirname, '../../cli/package.json'));
const requireDependency = function(name) {
    try {
        return cliRequire(name);
    } catch(e) {
        if (e && e.code === 'MODULE_NOT_FOUND') {
            return require(name);
        }
        throw e;
    }
};

const { JSDOM } = requireDependency('jsdom');
const window = new JSDOM('<!DOCTYPE html>', { url: 'http://codh.rois.ac.jp/' }).window;
requireDependency('jquery')(window);
const Canvas = requireDependency('@napi-rs/canvas');
const Image = Canvas.Image;
const kuromoji = requireDependency('kuromoji');
const fs = require('fs');
const { Buffer, Blob } = require('buffer');

const kuromojiDicPath = path.resolve(cliRequire.resolve('kuromoji'), '../../dict/');

const soan_ = require('./soan.min.js');
const Soan = function(config) {
    return soan_(config || {}, {window, Image, kuromoji, kuromojiDicPath, path, fs, Canvas, Blob, Buffer});
};
module.exports = Soan;
