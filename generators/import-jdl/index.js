/**
 * Copyright 2013-2017 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://jhipster.github.io/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const path = require('path');
const util = require('util');
const shelljs = require('shelljs');
const generator = require('yeoman-generator');
const chalk = require('chalk');
const jsonpatch = require('fast-json-patch');
const jhiCore = require('jhipster-core');
const BaseGenerator = require('../generator-base');

const JDLGenerator = generator.extend({});

util.inherits(JDLGenerator, BaseGenerator);

module.exports = JDLGenerator.extend({
    constructor: function (...args) { // eslint-disable-line object-shorthand
        generator.apply(this, args);
        this.argument('jdlFiles', { type: Array, required: true });
        this.jdlFiles = this.options.jdlFiles;
    },

    initializing: {
        validate() {
            if (this.jdlFiles) {
                this.jdlFiles.forEach((key) => {
                    if (!shelljs.test('-f', key)) {
                        this.env.error(chalk.red(`\nCould not find ${key}, make sure the path is correct!\n`));
                    }
                });
            }
        },

        getConfig() {
            this.applicationType = this.config.get('applicationType');
            this.baseName = this.config.get('baseName');
            this.prodDatabaseType = this.config.get('prodDatabaseType');
            this.skipClient = this.config.get('skipClient');
            this.clientFramework = this.config.get('clientFramework');
            if (!this.clientFramework) {
                this.clientFramework = 'angular1';
            }
            this.clientPackageManager = this.config.get('clientPackageManager');
            if (!this.clientPackageManager) {
                if (this.useYarn) {
                    this.clientPackageManager = 'yarn';
                } else {
                    this.clientPackageManager = 'npm';
                }
            }
        },

        snapshotEntities() {
            this.entitiesBefore = this._getEntitiesObj();
            this.fs.writeJSON('entitiesBefore.json', this.entitiesBefore);
            console.log(`${chalk.yellow('entitiesBefore')}: ${JSON.stringify(this.entitiesBefore, null, 2)}`);
        }
    },

    default: {
        insight() {
            const insight = this.insight();
            insight.trackWithEvent('generator', 'import-jdl');
        },

        parseJDL() {
            this.log('The jdl is being parsed.');
            try {
                const jdlObject = jhiCore.convertToJDL(jhiCore.parseFromFiles(this.jdlFiles), this.prodDatabaseType, this.applicationType);
                const entities = jhiCore.convertToJHipsterJSON({
                    jdlObject,
                    databaseType: this.prodDatabaseType,
                    applicationType: this.applicationType
                });
                this.log('Writing entity JSON files.');
                jhiCore.exportToJSON(entities, this.options.force);
            } catch (e) {
                this.log(e);
                this.error('\nError while parsing entities from JDL\n');
            }
        },

        generateEntities() {
            this.log('Generating entities.');
            try {
                this.getExistingEntities().forEach((entity) => {
                    this.composeWith(require.resolve('../entity'), {
                        regenerate: true,
                        'skip-install': true,
                        'skip-client': entity.definition.skipClient,
                        'skip-server': entity.definition.skipServer,
                        'no-fluent-methods': entity.definition.noFluentMethod,
                        'skip-user-management': entity.definition.skipUserManagement,
                        arguments: [entity.name],
                    });
                });
            } catch (e) {
                this.error(`Error while generating entities from parsed JDL\n${e}`);
            }
        },

        generateLiquibaseChangelog() {
            const entitiesAfter = this._getEntitiesObj();
            const entitiesDiff = jsonpatch.compare(
                this.entitiesBefore, entitiesAfter);
            this.fs.writeJSON('entitiesAfter.json', entitiesAfter);
            this.fs.writeJSON('entitiesDiff.json', entitiesDiff);
            console.log(`${chalk.yellow('entitiesAfter')}: ${JSON.stringify(entitiesAfter, null, 2)}`);
            console.log(`${chalk.yellow('entitiesDiff')}: ${JSON.stringify(entitiesDiff, null, 2)}`);
        }
    },

    install() {
        const injectJsFilesToIndex = () => {
            this.log(`\n${chalk.bold.green('Running gulp Inject to add javascript to index\n')}`);
            this.spawnCommand('gulp', ['inject:app']);
        };
        // rebuild client for Angular
        const rebuildClient = () => {
            this.log(`\n${chalk.bold.green('Running `webpack:build:dev` to update client app')}\n`);
            this.spawnCommand(this.clientPackageManager, ['run', 'webpack:build:dev']);
        };

        if (!this.options['skip-install'] && !this.skipClient) {
            if (this.clientFramework === 'angular1') {
                injectJsFilesToIndex();
            } else {
                rebuildClient();
            }
        }
    },

    /**
     * Get entities as object (name: definition)
     *
     * Based on `getExistingEntities`, but not using it as that one uses mem-fs
     * so it may not be up-to-date (as entities as modified directly on-disk
     * above in `generateEntities`).
     */
    _getEntitiesObj() {
        if (!shelljs.test('-d', '.jhipster')) return {};
        return shelljs.ls('.jhipster/*.json').reduce((acc, file) => {
            const entity = path.basename(file, '.json');
            try {
                acc[entity] = jhiCore.readEntityJSON(file);
            } catch (error) {
                // not an entity file / malformed?
            }
            return acc;
        }, {});
        // return this.getExistingEntities().reduce((acc, it) => {
        //     acc[it.name] = it.definition;
        //     return acc;
        // }, {});
    }
});
