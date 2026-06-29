export = Soan;
declare function Soan(config: any, vg: any): {
    getTextImageFromText: (text: string, opt?: {
        /**
         * 利用する古活字データセット情報の配列
         */
        datasets?: {
            /**
             * 古活字データセットのURL
             */
            url: string;
            /**
             * 古活字データセットの優先度。default: 1
             */
            priority?: number;
        }[];
        /**
         * true: 古活字画像が登録されていない文字も許容する。default: false
         */
        allowUnavailableChar?: boolean;
        /**
         * 連綿活字の優先度（0: 非連綿優先～1: 連綿優先）。default: 1
         */
        renmenPriority?: number;
    } & {
        /**
         * 古活字組版画像出力先となる&lt;canvas&gt;のID（Node.js環境での実行時は、canvasIdの代わりにcanvasの指定でも可）
         */
        canvasId: string;
        /**
         * 古活字組版画像出力先となるCanvasオブジェクト（Node.js環境での実行時のみ有効）
         */
        canvas?: object;
        /**
         * 字詰数（0は自動的に行を折り返さない）。default: 20
         */
        charsPerLine?: number;
        /**
         * 行間。default: 0.5
         */
        lineGap?: number;
        /**
         * 周囲の余白（px）（天地左右の余白の個別指定と同時に設定された場合、個別指定のない箇所に適用される）。default: 100
         */
        margin?: number;
        /**
         * 天の余白（px）。default: 100
         */
        marginTop?: number;
        /**
         * 地の余白（px）。default: 100
         */
        marginBottom?: number;
        /**
         * 左の余白（px）。default: 100
         */
        marginLeft?: number;
        /**
         * 右の余白（px）。default: 100
         */
        marginRight?: number;
        /**
         * 'auto'：字詰数に応じた縦幅とする、'fit'：行の折り返しが発生しなかったときは、成り行きの行長を縦幅とする。default: 'auto'
         */
        height?: string;
        /**
         * 古活字画像が登録されていない文字も許容する場合に利用されるフォントファミリー名（Node.js環境での実行時は無効）。default: 'serif'
         */
        fontFamily?: string;
        /**
         * 古活字画像が登録されていない文字も許容する場合に利用されるフォント色。default: '#000000'
         */
        fontColor?: string;
        /**
         * 画像作成サイズ倍率。default: 1
         */
        scale?: number;
        /**
         * 用紙テクスチャファイル名。default: ''
         */
        paperTexture?: string;
        /**
         * 古活字データセット画像の白にマッピングする描画色。default: '#ffffff'
         */
        white?: string;
        /**
         * 古活字データセット画像の黒にマッピングする描画色。default: '#000000'
         */
        black?: string;
    } & {
        /**
         * 正常完了時のコールバック関数
         */
        doneCallback?: (text: string, opt: object, result: any[]) => any;
        /**
         * 異常終了時のコールバック関数
         */
        failCallback?: Function;
        /**
         * 正常完了時・異常終了時のコールバック関数
         */
        alwaysCallback?: Function;
    }) => void;
    getTextImageFromTextPromise: (text: string, opt?: {
        /**
         * 利用する古活字データセット情報の配列
         */
        datasets?: {
            /**
             * 古活字データセットのURL
             */
            url: string;
            /**
             * 古活字データセットの優先度。default: 1
             */
            priority?: number;
        }[];
        /**
         * true: 古活字画像が登録されていない文字も許容する。default: false
         */
        allowUnavailableChar?: boolean;
        /**
         * 連綿活字の優先度（0: 非連綿優先～1: 連綿優先）。default: 1
         */
        renmenPriority?: number;
    } & {
        /**
         * 古活字組版画像出力先となる&lt;canvas&gt;のID（Node.js環境での実行時は、canvasIdの代わりにcanvasの指定でも可）
         */
        canvasId: string;
        /**
         * 古活字組版画像出力先となるCanvasオブジェクト（Node.js環境での実行時のみ有効）
         */
        canvas?: object;
        /**
         * 字詰数（0は自動的に行を折り返さない）。default: 20
         */
        charsPerLine?: number;
        /**
         * 行間。default: 0.5
         */
        lineGap?: number;
        /**
         * 周囲の余白（px）（天地左右の余白の個別指定と同時に設定された場合、個別指定のない箇所に適用される）。default: 100
         */
        margin?: number;
        /**
         * 天の余白（px）。default: 100
         */
        marginTop?: number;
        /**
         * 地の余白（px）。default: 100
         */
        marginBottom?: number;
        /**
         * 左の余白（px）。default: 100
         */
        marginLeft?: number;
        /**
         * 右の余白（px）。default: 100
         */
        marginRight?: number;
        /**
         * 'auto'：字詰数に応じた縦幅とする、'fit'：行の折り返しが発生しなかったときは、成り行きの行長を縦幅とする。default: 'auto'
         */
        height?: string;
        /**
         * 古活字画像が登録されていない文字も許容する場合に利用されるフォントファミリー名（Node.js環境での実行時は無効）。default: 'serif'
         */
        fontFamily?: string;
        /**
         * 古活字画像が登録されていない文字も許容する場合に利用されるフォント色。default: '#000000'
         */
        fontColor?: string;
        /**
         * 画像作成サイズ倍率。default: 1
         */
        scale?: number;
        /**
         * 用紙テクスチャファイル名。default: ''
         */
        paperTexture?: string;
        /**
         * 古活字データセット画像の白にマッピングする描画色。default: '#ffffff'
         */
        white?: string;
        /**
         * 古活字データセット画像の黒にマッピングする描画色。default: '#000000'
         */
        black?: string;
    }) => Promise<{
        /**
         * 入力テキスト
         */
        text: string;
        /**
         * {@link getTextImageFromTextPromise }呼び出し時に指定されたオプション
         */
        opt: object;
        /**
         * 古活字画像等情報列
         */
        result: any[];
    }>;
    getBlobWithXMPFromCanvasPromise: (canvas: object) => Promise<Blob>;
};
