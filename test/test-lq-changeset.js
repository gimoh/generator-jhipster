/* global describe, it*/

const assert = require('assert');
const LqChangeset = require('../generators/import-jdl/lq-changeset');

describe.only('LqChangeset', () => {
    describe('::new', () => {
        describe('when instantiating without arguments', () => {
            it('works', () => {
                const changeSet = new LqChangeset();
                assert.deepEqual(changeSet.changes, []);
            });
        });
    });

    describe('#withAddColumnChangeFor', () => {
        const changeSet = new LqChangeset();

        describe('when called without arguments', () => {
            it('fails', () => {
                assert.throws(() => changeSet.withAddColumnChangeFor());
            });
        });

        describe('when called with proper table name', () => {
            it('works', () => {
                assert(changeSet.withAddColumnChangeFor('table_name'));
            });
        });
    });
});
