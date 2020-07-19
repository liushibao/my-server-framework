import { User } from "./User";


export interface IToken {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    user?: User;
}
