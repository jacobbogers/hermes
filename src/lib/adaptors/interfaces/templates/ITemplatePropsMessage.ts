export interface ITemplatePropsMessage {
    id: number;
    cookieName: string;
    path: string | null;
    maxAge: number | null;
    httpOnly: boolean | null;
    secure: boolean | null;
    domain: string | null;
    sameSite: boolean | null;
    rolling: boolean | null;
    templateName: string;
}
