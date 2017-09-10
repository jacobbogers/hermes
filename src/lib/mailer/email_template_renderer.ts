'use strict';


import { Logger } from '~lib/logger';
import { SystemInfo } from '~system';
const logger = Logger.getLogger();

interface IHTMLTemplateFiles {
    actionEmailContentBlockButton: string;
    actionEmailContentBlockSimple: string;
    actionEmailMain: string;
    actionEmailCSS: string;
}

const htmlFiles: IHTMLTemplateFiles = {
    actionEmailContentBlockButton: require('./templates/action-email-content-block-button.html'),
    actionEmailContentBlockSimple: require('./templates/action-email-content-block.html'),
    actionEmailMain: require('./templates/action-email-main.html'),
    actionEmailCSS: require('./templates/emails.css')
};

interface IActionEmailData {
    simpleContent: string[] | string;
    buttonContent: {
        url: string;
        text: string;
    };
}


const templates = new Map<keyof IHTMLTemplateFiles, string>();

class EmailRenderer {


    // R public constructor() {}

    public renderActionEmail(data: IActionEmailData): string {


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


    private renderContentBlockSimple(text: string): string {
        const temp = templates.get('actionEmailContentBlockSimple');

        return typeof temp === 'string' ? temp.replace('%TEXT%', text) : '<p>error rendering content</p>';
    }

    private renderContentBlockButton(text: string, url: string): string {
        const temp = templates.get('actionEmailContentBlockButton');

        return typeof temp === 'string' ? temp.replace('%URL%', url).replace('%TEXT%', text) : '<p>error rendering button content</p>';
    }

    private renderEmailMain(css: string, contentBlocks: string[]): string {
        const temp = templates.get('actionEmailMain');

        return typeof temp === 'string' ? temp.replace('/*%EMBED_STYLESHEET}%*/', css)
        .replace('%CONTENT_BLOCK_ARRAY%', contentBlocks.join('')) : '<p>error rendering main-content</p>';
    }


    private processLoadingResults(data: IHTMLTemplateFiles) {
        const _si = SystemInfo.createSystemInfo();
        let nrErr = 0;
        Object.keys(data).forEach((key: keyof IHTMLTemplateFiles) => {
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
}
