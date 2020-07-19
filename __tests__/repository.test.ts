import "reflect-metadata";
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });

import * as uuid from 'uuid';

import { Logger, Repository, RepositoryTest, DBDATATYPE } from '../src'
import { User } from '../src';


class UserWithBirthDay extends User {
    birthday?: Date;
    graduateDay?: Date;
}


class TestRepository extends Repository<UserWithBirthDay> {
    constructor(dbPool) {
        super(UserWithBirthDay);
    }

}


class RepositoryTestTest extends RepositoryTest<UserWithBirthDay, TestRepository>{

    doTest = () => {

        describe('test the repository base', () => {

            test("should get the user of the given id", async done => {
                let user = await this.repository.singleOrDefault<UserWithBirthDay>(this.testPool, { id: 'b0dfd4a6-32c8-4175-a7db-0eb2b3fa7933' });
                expect(user.name).toBe("bob");
                done();
            });

            test("should get exception given the wrongly formated uuid id", async done => {
                try {
                    let user = await this.repository.singleOrDefault<UserWithBirthDay>(this.testPool, { id: '0dfd4a6-32c8-4175-a7db-0eb2b3fa7933' });
                }
                catch (ex) {
                    expect(ex.name).toBe('error')
                }
                done();
            });

            test("should get null given the wrong id", async done => {
                let user = await this.repository.singleOrDefault<UserWithBirthDay>(this.testPool, { id: 'a0dfd4a6-32c8-4175-a7db-0eb2b3fa7933' });
                expect(user).toBe(null);
                done();
            });

            test('it should work for add, select, remove and patch', async (done) => {

                try {
                    //test methods
                    let whereStr = this.repository._formWhereAndStr(null);
                    expect(whereStr).toBe('');

                    whereStr = this.repository._formWhereAndStr({ mob: "18975331833", name: "bob" });
                    expect(whereStr).toBe('where "mob"=$1 and "name"=$2');

                    whereStr = this.repository._formWhereAndStr({ mob: "18975331833", name: "bob" }, 2);
                    expect(whereStr).toBe('where "mob"=$3 and "name"=$4');

                    let argsArry = this.repository._formArgsArray(null);
                    expect(argsArry).toBe(null);

                    argsArry = this.repository._formArgsArray({ mob: "18975331833", name: "bob" });
                    expect(argsArry[0]).toBe("18975331833");
                    expect(argsArry[1]).toBe("bob");

                    let valuesStr = this.repository._formValuesPlaceholderStr(null);
                    expect(valuesStr).toBe('');

                    valuesStr = this.repository._formValuesPlaceholderStr({ mob: "18975331833", name: "bob" });
                    expect(valuesStr).toBe('$1,$2');


                    // test database
                    let results = await this.repository.selectRaw<UserWithBirthDay>(this.testPool, 'select * from users.users');
                    expect(results.length).toBe(4);
                    expect(results[0].id.length).toBe(36);

                    results = await this.repository.select<UserWithBirthDay>(this.testPool, null, ["mob", "email"], null, 2, 3);
                    expect(results.length).toBe(2);

                    results = await this.repository.select<UserWithBirthDay>(this.testPool, { mob: "18975331833", name: "bob" }, ["mob", "email"], null, 2, 3);
                    expect(results.length).toBe(0);

                    results = await this.repository.select<UserWithBirthDay>(this.testPool, { mob: "18975331833", name: "alice" }, ["mob", "email"], null, 2, 3);
                    expect(results.length).toBe(0);

                    let user = await this.repository.singleOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833", name: "bob" }, ["mob", "email"], null);
                    expect(user).toBe(null);

                    user = await this.repository.singleOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice');

                    try {
                        user = await this.repository.singleOrDefault<UserWithBirthDay>(this.testPool, {}, ["name", "mob", "email"], null);
                    }
                    catch (exception) {
                        expect(exception.message).toBe("multiple record found");
                    }

                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833", name: "bob" }, ["mob", "email"], null);
                    expect(user).toBe(null);

                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, {}, ["name", "mob", "email"], null);
                    expect(user).not.toBeNull();

                    await this.repository.remove(this.testPool, { mob: "18975331833" });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833" }, ["name", "mob", "email"], null);
                    expect(user).toBe(null);

                    try {
                        await this.repository.remove(this.testPool, {});
                    }
                    catch (exception) {
                        expect(exception.message).toBe("conditions must be supplied in a delete command");
                    }

                    try {
                        await this.repository.remove(this.testPool, null);
                    }
                    catch (exception) {
                        expect(exception.message).toBe("conditions must be supplied in a delete command");
                    }


                    let batchResult = await this.repository.addBatch(this.testPool, [<UserWithBirthDay>{ id: uuid.v4(), mob: "18975331891", name: "alice-new1", roles: [] }, <UserWithBirthDay>{ id: uuid.v4(), mob: "18975331892", name: "alice-new2", roles: [] }]);
                    expect(batchResult.command).toBe("INSERT");
                    expect(batchResult.rowCount).toBe(2);
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331891" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new1');
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331892" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new2');

                    let users = await this.repository.selectBatch<UserWithBirthDay>(this.testPool, "mob", ["18975331891", "18975331892", "00001111"]);
                    expect(users.length).toBe(2);
                    expect(users.find(t => t.mob == "18975331892").name).toBe('alice-new2');

                    users = await this.repository.selectBatch<UserWithBirthDay>(this.testPool, "mob", []);
                    expect(users.length).toBeGreaterThan(2);

                    users = await this.repository.selectBatch<UserWithBirthDay>(this.testPool, "mob", null);
                    expect(users.length).toBeGreaterThan(2);

                    try {
                        await this.repository.addBatch(this.testPool, []);
                    }
                    catch (exception) {
                        expect(exception.errorCode).toBe("ENTITY_NOT_FOUND");
                    }


                    await this.repository.add(this.testPool, <UserWithBirthDay>{ id: uuid.v4(), mob: "18975331833", name: "alice-new", birthday: new Date('2010-01-01'), roles: [] });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833", birthday: new Date('2010-01-01') }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new');

                    await this.repository.add(this.testPool, { id: uuid.v4(), mob: "18975331830", name: "alice-new", birthday: new Date('2010-01-01'), graduateDay: new Date('2020-01-01') });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331830" }, ["name", "mob", "email", `"graduateDay"`], null);
                    expect(user.name).toBe('alice-new');
                    expect(JSON.stringify(user.graduateDay)).toBe(JSON.stringify(new Date('2020-01-01')));

                    await this.repository.add(this.testPool, { id: uuid.v4(), mob: "18975331822", name: "alice-new" });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331822" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new');

                    await this.repository.add(this.testPool, { id: uuid.v4(), mob: "18975331831", name: "alice-new" });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331831" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new');

                    await this.repository.patch(this.testPool, { mob: "18975331833" }, { name: "alice-new-patched", roles: [] });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new-patched');

                    await this.repository.patch(this.testPool, { mob: "18975331833" }, { name: "alice-new-patched" });
                    user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new-patched');

                    try {
                        await this.repository.patch(this.testPool, { mob: "18975331833" }, <UserWithBirthDay>{ name2: "alice-new-patched" });
                    }
                    catch (exception) {
                        expect(exception).not.toBeNull();
                    }

                    try {
                        await this.repository.patch(this.testPool, {}, <UserWithBirthDay>{ name2: "alice-new-patched" });
                    }
                    catch (exception) {
                        expect(exception.message).toBe("conditions must be supplied in a patch command");
                    }

                    try {
                        await this.repository.patch(this.testPool, null, <UserWithBirthDay>{ name2: "alice-new-patched" });
                    }
                    catch (exception) {
                        expect(exception.message).toBe("conditions must be supplied in a patch command");
                    }
                }
                catch (e) {
                    this.logger.error(e);
                    throw e;
                }
                finally {
                }

                done();
            });

            test('it should work for patch', async (done) => {

                try {

                    await this.repository.patch(this.testPool, { mob: "18975331833" }, { name: "alice-new-patched" });
                    let user = await this.repository.firstOrDefault<UserWithBirthDay>(this.testPool, { mob: "18975331833" }, ["name", "mob", "email"], null);
                    expect(user.name).toBe('alice-new-patched');

                    try {
                        await this.repository.patch(this.testPool, { mob: "18975331833" }, <UserWithBirthDay>{ name2: "alice-new-patched" });
                    }
                    catch (exception) {
                        expect(exception).not.toBeNull();
                    }

                    try {
                        await this.repository.patch(this.testPool, {}, <UserWithBirthDay>{ name2: "alice-new-patched" });
                    }
                    catch (exception) {
                        expect(exception.message).toBe("conditions must be supplied in a patch command");
                    }

                    try {
                        await this.repository.patch(this.testPool, null, <UserWithBirthDay>{ name2: "alice-new-patched" });
                    }
                    catch (exception) {
                        expect(exception.message).toBe("conditions must be supplied in a patch command");
                    }
                }
                catch (e) {
                    this.logger.error(e);
                    throw e;
                }
                finally {
                }

                done();
            });

        });

    };

}


new RepositoryTestTest(TestRepository, UserWithBirthDay).setup(path.resolve(__dirname, `testdb.dmp`)).doTest();