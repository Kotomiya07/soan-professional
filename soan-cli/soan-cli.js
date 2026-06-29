#!/usr/bin/env node
/*
 * Soan-cli: A command line interface of Soan (Library for rendering modern Japanese using old movable type)
 * http://codh.rois.ac.jp/software/soan/
 *
 * Copyright 2023 Center for Open Data in the Humanities, Research Organization of Information and Systems
 * Released under the MIT license
 *
 * Core contributor: Jun HOMMA (@2SC1815J)
 */
import { parseArgs } from 'util';
import { parseArgsWithHelp, usage } from 'minus-h';
import { writeSync, writeFileSync } from 'fs';
import { createCanvas } from 'canvas';
import Soan from 'soan';

const argsConfig = {
    description: 'A command line interface of Soan (Library for rendering modern Japanese using old movable type)',
    options: {
        text: {
            type: 'string',
            short: 't',
            description: '（必須）古活字組版画像化する文字列'
        },
        output: {
            type: 'string',
            short: 'o',
            description: '出力先ファイル名（未指定時はstdout）'
        },
        force: {
            type: 'boolean',
            default: false,
            description: '出力先に同名ファイルがあるときも上書きする'
        },
        datasets: {
            type: 'string',
            multiple: true,
            default: ['{"url": "http://codh.rois.ac.jp/soan/dataset/001.json"}'],
            description: '利用する古活字データセット情報の配列'
        },
        allowUnavailableChar: {
            type: 'boolean',
            default: false,
            description: '古活字画像が登録されていない文字も許容する'
        },
        renmenPriority: {
            type: 'string',
            default: '1',
            description: '連綿活字の優先度（0:非連綿優先～1:連綿優先）'
        },
        charsPerLine: {
            type: 'string',
            default: '20',
            description: '字詰数（0:自動的に行を折り返さない）'
        },
        lineGap: {
            type: 'string',
            default: '0.5',
            description: '行間'
        },
        marginTop: {
            type: 'string',
            default: '100',
            description: '天の余白（px）'
        },
        marginBottom: {
            type: 'string',
            default: '100',
            description: '地の余白（px）'
        },
        marginLeft: {
            type: 'string',
            default: '100',
            description: '左の余白（px）'
        },
        marginRight: {
            type: 'string',
            default: '100',
            description: '右の余白（px）'
        },
        height: {
            type: 'string',
            default: 'auto',
            description: '出力画像の縦幅',
            choices: ['auto', 'fit']
        },
        fontColor: {
            type: 'string',
            default: '#000000',
            description: '古活字画像が登録されていない文字も許容する場合に利用されるフォント色'
        },
        scale: {
            type: 'string',
            default: '1',
            description: '画像作成サイズ倍率'
        },
        paperTexture: {
            type: 'string',
            default: '',
            description: '用紙テクスチャファイル名'
        },
        white: {
            type: 'string',
            default: '#ffffff',
            description: '古活字データセット画像の白にマッピングする描画色'
        },
        black: {
            type: 'string',
            default: '#000000',
            description: '古活字データセット画像の黒にマッピングする描画色'
        },
    }
};

const values = (() => {
    try {
        const { values } = parseArgs(argsConfig);
        return values;
    } catch(e) {
        parseArgsWithHelp(argsConfig);
        return undefined;
    }
})();
if (values === undefined) {
    process.exit(1);
}
if (values.text === undefined || values.text === '') {
    console.error('Specify --text <text>');
    usage(argsConfig);
    process.exit(1);
}
const datasets = values.datasets.map(strdata => {
    try {
        const data = JSON.parse(strdata);
        return (Object.prototype.toString.call(data) === '[object Object]') ? data : null;
    } catch(e) {
        return null;
    }
}).filter(v => v);

const soan = Soan({
    //オプション（古活字画像への置き換え系）
    datasets,
    allowUnavailableChar: values.allowUnavailableChar,
    renmenPriority: parseFloat(values.renmenPriority),
    //オプション（組版系）
    charsPerLine: parseInt(values.charsPerLine, 10),
    lineGap: parseFloat(values.lineGap),
    marginTop: parseInt(values.marginTop, 10),
    marginBottom: parseInt(values.marginBottom, 10),
    marginLeft: parseInt(values.marginLeft, 10),
    marginRight: parseInt(values.marginRight, 10),
    height: values.height,
    fontColor: values.fontColor,
    scale: parseFloat(values.scale),
    paperTexture: values.paperTexture,
    white: values.white,
    black: values.black
});
if (soan === undefined) {
    process.exit(1);
}

soan.getTextImageFromTextPromise(values.text, {
    canvas: createCanvas(1, 1),
    outputPath: values.output,
    force: values.force,
}).then((results) => { //results: {text, opt, result}
    const canvas = results.opt.canvas;
    const outputPath = results.opt.outputPath;
    return soan.getBufferWithXMPFromCanvasPromise(canvas)
        .then((buffer) => {
            if (outputPath) {
                const flags = results.opt.force ? 'w' : 'wx';
                writeFileSync(outputPath, buffer, { flag: flags });
            } else {
                const dataUrl = 'data:image/jpeg;base64,' + buffer.toString('base64');
                writeSync(1, dataUrl);
            }
        });
}).catch((e) => {
    console.error(e.toString());
    process.exit(1);
});