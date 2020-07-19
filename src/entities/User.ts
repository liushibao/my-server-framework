import { dbNotCol, dbTableName } from '../decorators'

@dbTableName('users.users')
export class User {
    id?: string;
    nickname?: string = null;
    name?: string = null;
    password?: string = null;
    mob?: string = null;
    email?: string = null;
    @dbNotCol()
    roles?: string[] = [];
}


@dbTableName('users.user_roles')
export class UserRole {
    id: string;
    user_id: string;
    role: string;
}

export const ROLES = {
    STORE: "store",
    DELIVERY_MAN: "delivery_man",
    EMPLOYEE: "employee"
}