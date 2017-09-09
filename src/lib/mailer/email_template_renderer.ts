'use strict';
//node
import * as path from 'path';
//vender


//app
import { SystemInfo } from '../system';
import { deepClone, loadFiles } from '../utils';

import Logger from '../logger';
const logger = Logger.getLogger();

interface HTMLTemplateFiles {
    actionEmailContentBlockButton: string;
    actionEmailContentBlockSimple: string;
    actionEmailMain: string;
    actionEmailCSS: string;
}

const htmlFiles: HTMLTemplateFiles = {
    actionEmailContentBlockButton: './templates/action-email-content-block-button.html',
    actionEmailContentBlockSimple: './templates/action-email-content-block.html',
    actionEmailMain: './templates/action-email-main.html',
    actionEmailCSS: './templates/emails.css'
};

export interface ActionEmailData {
    simpleContent: string[] | string;
    buttonContent: {
        url: string;
        text: string;
    };
}

export class EmailTemplateError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

const templates = new Map<keyof HTMLTemplateFiles, string>();

export class EmailRenderer {

    private renderContentBlockSimple(text: string): string {
        const temp = templates.get('actionEmailContentBlockSimple');
        return typeof temp === 'string' ? temp.replace('${TEXT}', text) : '<p>error rendering content</p>';
    }

    private renderContentBlockButton(text: string, url: string): string {
        const temp = templates.get('actionEmailContentBlockButton');
        return typeof temp === 'string' ? temp.replace('${URL}', url).replace('${TEXT}', text) : '<p>error rendering button content</p>';
    }

    private renderEmailMain(css: string, contentBlocks: string[]): string {
        const temp = templates.get('actionEmailMain');
        return typeof temp === 'string' ? temp.replace('/*${EMBED_STYLESHEET}*/', css).replace('${CONTENT_BLOCK_ARRAY}', contentBlocks.join('')) : '<p>error rendering main-content</p>';
    }


    private processLoadingResults(data: HTMLTemplateFiles) {
        const _si = SystemInfo.createSystemInfo();
        let nrErr = 0;
        Object.keys(data).forEach((key: keyof HTMLTemplateFiles) => {
            templates.set(key, data[key]);
            if (typeof data[key] !== 'string') {
                _si.addError(data[key]);
                nrErr++;
                return;
            }
            logger.trace('loaded file [%s] -> [%s]', key, htmlFiles[key]);
        });
        return nrErr;
    }

    public constructor() {

    }

    public renderActionEmail(data: ActionEmailData): string {


        if (typeof data.simpleContent === 'string') {
            data.simpleContent = [data.simpleContent];
        }

        const content = data.simpleContent.map(text =>
            this.renderContentBlockSimple(text));

        content.push(
            this.renderContentBlockButton(data.buttonContent.text, data.buttonContent.url)
        );

        return this.renderEmailMain(templates.get('actionEmailCSS') || '', content);
    }

    public init(): Promise<boolean> {

        const filesFullPath = deepClone(htmlFiles);
        let _file: keyof HTMLTemplateFiles;
        for (_file in htmlFiles) {
            filesFullPath[_file] = path.join(__dirname, htmlFiles[_file]);
        }

        return loadFiles<HTMLTemplateFiles>(filesFullPath).then(templ => {
            //logger.info('result of loading html templates %j', templ);
            return this.processLoadingResults(templ) > 0 ? Promise.reject(false) : Promise.resolve(true);
        });
    }
}
