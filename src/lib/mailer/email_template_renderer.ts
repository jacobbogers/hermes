import { isString } from '~lib/utils';


interface IHTMLTemplateFiles {
    actionEmailContentBlockButton: string;
    actionEmailContentBlockSimple: string;
    actionEmailMain: string;
    actionEmailCSS: string;
}

const htmlFiles: IHTMLTemplateFiles = {

    actionEmailContentBlockButton: require('./templates/action-email-content-block-button.html'),
    actionEmailContentBlockSimple: require('./templates/action-email-content-block.html'),
    actionEmailCSS: require('./templates/emails.css'),
    actionEmailMain: require('./templates/action-email-main.html')

};

htmlFiles;

export interface IActionEmailData {
    simpleContent: string[] | string;
    buttonContent: {
        url: string;
        text: string;
    };
}


const templates = new Map<keyof IHTMLTemplateFiles, string>();

export class EmailRenderer {


    // R public constructor() {}

    public renderActionEmail(data: IActionEmailData): string {


        if (isString(data.simpleContent)) {
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


}
